import type { AppDataValue, MainCategory, NewTransactionData, SubCategory, TransactionType } from "@/types";

import { ColumnKey } from "./types";

// ─── 接口 ──────────────────────────────────────────────────────────────────────

export interface Importer {
  handle(transactions: NewTransactionData[], appData: AppDataValue): NewTransactionData[];
}

// ─── 辅助函数 ──────────────────────────────────────────────────────────────────

/** 从 raw_info 中读取微信账单原始字段值 */
function getRawField(tx: NewTransactionData, field: ColumnKey): string | null {
  const raw = tx.raw_info;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const val = (raw as Record<string, unknown>)[field];
  if (val === undefined || val === null) return null;
  const str = String(val).trim();
  return str === "" ? null : str;
}

/** 追加备注，自动处理空值和空格 */
function appendRemark(existing: string | null, addition: string): string {
  if (!existing || existing.trim() === "") return addition;
  return `${existing.trim()} ${addition}`;
}

/**
 * 按 transaction_type 和 label 查找主/子分类，找不到则保持 undefined。
 */
function resolveCategories(
  appData: AppDataValue,
  txType: TransactionType | null,
  mainLabel: string,
  subLabel: string,
): { main_category?: MainCategory; sub_category?: SubCategory } {
  const mainCat = appData.mainCategories.find(
    (mc) => mc.label === mainLabel && (!txType || mc.transaction_type === txType),
  );
  const subCat = mainCat
    ? appData.subCategories.find(
        (sc) => sc.label === subLabel && sc.main_category_id === mainCat.id,
      )
    : undefined;

  return { main_category: mainCat, sub_category: subCat };
}

/**
 * 从微信状态字符串中提取退款金额数字。
 * 支持 "已退款（¥77.00）" / "已退款(￥77.00)" / "已退款¥77.00" 等格式，忽略 ¥/￥ 符号差异。
 * 返回 null 表示无法解析。
 */
function parseRefundAmount(status: string): number | null {
  // 移除所有括号、¥、￥ 后提取数字
  const match = status.match(/已退款[（(]?[¥￥]?([\d.]+)[）)]?/);
  if (!match) return null;
  const num = parseFloat(match[1]);
  return isNaN(num) ? null : num;
}

/** 判断两个金额是否相等（浮点容差 0.001） */
function amountEquals(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.001;
}

// ─── 收/支为 "/" 的处理 ────────────────────────────────────────────────

export class DirectionNullImporter implements Importer {
  handle(transactions: NewTransactionData[], appData: AppDataValue): NewTransactionData[] {
    return transactions.map((tx) => {
      if (getRawField(tx, ColumnKey.Direction) !== "/") return tx;

      const txType = getRawField(tx, ColumnKey.TransactionType);
      const product = getRawField(tx, ColumnKey.Product);

      // A1：零钱通互转
      if (
        txType === "转入零钱通-来自零钱" ||
        txType === "零钱通转出-到零钱"
      ) {
        const { main_category, sub_category } = resolveCategories(appData, "支出", "其他", "其他");
        return {
          ...tx,
          amount: 0,
          status: "经自动处理取消",
          remark: appendRemark(tx.remark, "零钱/零钱通互转不计收支"),
          name: txType,
          transaction_type: "支出",
          main_category,
          sub_category,
        };
      }

      // A2：其他 "/" 交易
      let resolvedType: TransactionType | undefined;
      let main_category: MainCategory | undefined;
      let sub_category: SubCategory | undefined;

      if (product?.includes("转出")) {
        resolvedType = "转出";
        ({ main_category, sub_category } = resolveCategories(appData, "转出", "转出", "转出"));
      } else if (product?.includes("转入")) {
        resolvedType = "转入";
        ({ main_category, sub_category } = resolveCategories(appData, "转入", "转入", "转入"));
      }

      return {
        ...tx,
        name: txType,
        status: "待处理",
        remark: appendRemark(tx.remark, "⚠️请确认该交易是否有实际支出。"),
        ...(resolvedType !== undefined && { transaction_type: resolvedType }),
        ...(main_category !== undefined && { main_category }),
        ...(sub_category !== undefined && { sub_category }),
      };
    });
  }
}

// ─── 退款处理 ────────────────────────────────────────────────────

export class RefundImporter implements Importer {
  handle(transactions: NewTransactionData[], appData: AppDataValue): NewTransactionData[] {
    // 按 datetime 升序排序（正时序）
    const sorted = [...transactions].sort((a, b) => {
      if (!a.datetime && !b.datetime) return 0;
      if (!a.datetime) return -1;
      if (!b.datetime) return 1;
      return a.datetime < b.datetime ? -1 : a.datetime > b.datetime ? 1 : 0;
    });

    for (let i = 0; i < sorted.length; i++) {
      const tx = sorted[i];
      if (tx.transaction_type !== "支出") continue;
      const wechatStatus = getRawField(tx, ColumnKey.Status);
      if (!wechatStatus) continue;

      // 处理全额退款及部分退款
      if (wechatStatus === "已全额退款") {
        this.handleFullRefund(sorted, i, tx, appData);
      } else if (/已退款[（(]/.test(wechatStatus)) {
        this.handlePartialRefund(sorted, i, tx, wechatStatus, appData);
      }
    }

    // 处理孤立退款收入(只有退款收入, 但没有对应支出)
    for (const tx of sorted) {
      if (tx.transaction_type !== "收入") continue;
      if (tx.status !== "待处理") continue;

      const wechatStatus = getRawField(tx, ColumnKey.Status);
      if (!wechatStatus) continue;
      if (!wechatStatus.includes("已退款") && !wechatStatus.includes("已全额退款")) continue;

      const { main_category, sub_category } = resolveCategories(appData, "收入", "收入", "退款");
      tx.remark = appendRemark(tx.remark, "⚠️该退款没有找到对应的支出记录。");
      tx.main_category = main_category;
      tx.sub_category = sub_category;
    }

    // 从顶层数组中移除已附加的子交易
    const attachedRemoved = sorted.filter((tx) => tx.status !== "附加到其他交易");
    return attachedRemoved;
  }

  /** 全额退款 */
  private handleFullRefund(
    sorted: NewTransactionData[],
    i: number,
    expense: NewTransactionData,
    appData: AppDataValue,
  ): void {
    // 向后（时间更晚）查找第一个匹配的退款收入
    for (let j = i + 1; j < sorted.length; j++) {
      const candidate = sorted[j];
      if (candidate.status !== "待处理") continue;
      if (candidate.transaction_type !== "收入") continue;
      if (getRawField(candidate, ColumnKey.Status) !== "已全额退款") continue;
      if (!amountEquals(candidate.amount, expense.amount)) continue;

      // 找到：将退款附加到支出
      const { main_category, sub_category } = resolveCategories(appData, "收入", "退款", "退款");
      candidate.status = "附加到其他交易";
      candidate.main_category = main_category;
      candidate.sub_category = sub_category;

      expense.status = "经自动处理取消";
      expense.children = [...(expense.children ?? []), candidate];
      return;
    }

    // 未找到
    expense.remark = appendRemark(expense.remark, "⚠️该支出已被全额退款，但没有找到对应的退款记录。");
    expense.status = "待处理";
    expense.amount = 0;
  }

  /** 部分退款/一对多退款 */
  private handlePartialRefund(
    sorted: NewTransactionData[],
    i: number,
    expense: NewTransactionData,
    wechatStatus: string,
    appData: AppDataValue,
  ): void {
    const targetAmount = parseRefundAmount(wechatStatus);
    if (targetAmount === null) return;

    // 向后(时间更晚)收集候选退款收入：微信状态中退款金额与目标一致
    const candidates: NewTransactionData[] = [];
    for (let j = i + 1; j < sorted.length; j++) {
      const candidate = sorted[j];
      if (candidate.status !== "待处理") continue;
      if (candidate.transaction_type !== "收入") continue;
      const candidateStatus = getRawField(candidate, ColumnKey.Status);
      if (!candidateStatus) continue;
      const candidateRefundAmount = parseRefundAmount(candidateStatus);
      if (candidateRefundAmount === null) continue;
      if (!amountEquals(candidateRefundAmount, targetAmount)) continue;
      candidates.push(candidate);
    }

    // 回溯精确子集求和：选出金额之和恰好等于 targetAmount 的子集
    const selected = this.findSubsetByAmount(candidates, targetAmount);

    if (selected !== null) {
      // 找到匹配子集
      const { main_category, sub_category } = resolveCategories(appData, "收入", "退款", "退款");
      for (const refund of selected) {
        refund.status = "附加到其他交易";
        refund.main_category = main_category;
        refund.sub_category = sub_category;
      }
      expense.status = "经自动处理填写";
      expense.children = [...(expense.children ?? []), ...selected];
    } else {
      // 未找到恰好匹配的子集
      const expenseAmountString = `¥ ${expense.amount.toFixed(2)}`;
      const refundAmountString = `¥ ${targetAmount.toFixed(2)}`;
      const remainingAmountString = `¥ ${Math.max(0, expense.amount - targetAmount).toFixed(2)}`;
      const remark = `⚠️该支出没有找到对应的退款记录。${expenseAmountString}(原支出) - ${refundAmountString}(退款) = ${remainingAmountString}(剩余支出)`;
      expense.remark = appendRemark(expense.remark, remark);
      expense.status = "待处理";
      expense.amount = Math.max(0, expense.amount - targetAmount);
    }
  }

  /**
   * 回溯精确子集求和：从 candidates 中选出金额之和恰好等于 target 的子集。
   * 金额转换为整数分（×100）后做精确比较，避免浮点误差。
   * 返回 null 表示无法精确匹配。
   */
  private findSubsetByAmount(
    candidates: NewTransactionData[],
    target: number,
  ): NewTransactionData[] | null {
    const targetCents = Math.round(target * 100);

    const result: NewTransactionData[] = [];

    const backtrack = (index: number, remaining: number): boolean => {
      if (remaining === 0) return true;
      if (index >= candidates.length || remaining < 0) return false;

      // 选当前候选项
      result.push(candidates[index]);
      if (backtrack(index + 1, remaining - Math.round(candidates[index].amount * 100))) return true;
      result.pop();

      // 不选当前候选项
      if (backtrack(index + 1, remaining)) return true;

      return false;
    };

    return backtrack(0, targetCents) ? result : null;
  }
}




// ─── 导出 ──────────────────────────────────────────────────────────────────

export const importers: Importer[] = [
  new DirectionNullImporter(),
  new RefundImporter(),
];