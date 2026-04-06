import type { AppDataValue, NewTransactionData } from "@/types";
import type { Importer } from "./types";

import { ColumnKey } from "../wechat-import/types";
import { compareTxTime } from "../transaction/transaction-datetime";

import {
  amountEquals,
  appendRemark,
  getWxRawField,
  parseRefundAmount,
  resolveCategories,
} from "./shared";

// ─── 退款处理 ────────────────────────────────────────────────────

export class WechatRefundImporter implements Importer {
  description(): string {
    return "自动处理退款交易";
  }

  async handle(
    transactions: NewTransactionData[],
    appData: AppDataValue,
    onProgress?: (message: string) => void,
  ): Promise<NewTransactionData[]> {
    onProgress?.("正在处理退款…");
    // 按 datetime 升序排序（正时序）
    const sorted = [...transactions].sort((a, b) => compareTxTime(a.datetime, b.datetime));

    for (let i = 0; i < sorted.length; i++) {
      const tx = sorted[i];
      if (tx.transaction_type !== "支出") continue;
      const wechatStatus = getWxRawField(tx, ColumnKey.Status);
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

      const wechatStatus = getWxRawField(tx, ColumnKey.Status);
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
      if (getWxRawField(candidate, ColumnKey.Status) !== "已全额退款") continue;
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
    expense.remark = appendRemark(
      expense.remark,
      "⚠️该支出已被全额退款，但没有找到对应的退款记录。",
    );
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
      const candidateStatus = getWxRawField(candidate, ColumnKey.Status);
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

      result.push(candidates[index]);
      if (backtrack(index + 1, remaining - Math.round(candidates[index].amount * 100))) return true;
      result.pop();

      if (backtrack(index + 1, remaining)) return true;

      return false;
    };

    return backtrack(0, targetCents) ? result : null;
  }
}
