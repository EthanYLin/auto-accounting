import type { AppDataValue, NewTransactionData } from "@/types";
import type { Importer } from "./types";

import { ColumnKey } from "../alipay-import/types";
import { compareTxTime } from "../transaction/transaction-datetime";
import { calculateAmount } from "../transaction/transaction-display";

import { appendRemark, getAlipayRawField, resolveCategories } from "./shared";

/**
 * 获取支付宝交易主订单号：取从左起的连续数字前缀。
 */
function getPrimaryOrderId(orderId: string | null): string {
  if (!orderId) return "";
  const m = orderId.trim().match(/^(\d+)/);
  return m ? m[1] : "";
}

/**
 * 对 candidateIndices 里的候选行用并查集分组：
 * isSameGroup 为 true 时合并。
 * 返回每组对应的原始 sorted 数组下标列表。
 */
function group(candidateIndices: number[], sorted: NewTransactionData[]): number[][] {
  const n = candidateIndices.length;
  const uf = Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number => (uf[x] === x ? x : (uf[x] = find(uf[x])));
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) uf[ra] = rb;
  };

  for (let a = 0; a < n; a++) {
    for (let b = a + 1; b < n; b++) {
      if (isSameGroup(sorted[candidateIndices[a]], sorted[candidateIndices[b]])) union(a, b);
    }
  }

  const rootToGroup = new Map<number, number[]>();
  for (let k = 0; k < n; k++) {
    const root = find(k);
    if (!rootToGroup.has(root)) rootToGroup.set(root, []);
    rootToGroup.get(root)!.push(candidateIndices[k]);
  }
  return Array.from(rootToGroup.values());
}

/** 主订单号相同或商家订单号相同 → 属于同一退款订单组 */
function isSameGroup(a: NewTransactionData, b: NewTransactionData): boolean {
  const samePrimaryTxId =
    getPrimaryOrderId(getAlipayRawField(a, ColumnKey.TransactionId)) ===
    getPrimaryOrderId(getAlipayRawField(b, ColumnKey.TransactionId));
  const sameMerchantId =
    getAlipayRawField(a, ColumnKey.MerchantId)!.trim() ===
    getAlipayRawField(b, ColumnKey.MerchantId)!.trim();
  return samePrimaryTxId || sameMerchantId;
}

// ─── 支付宝退款：按订单号分组、支出与退款合并 ──────────────────────────────

export class AlipayRefundImporter implements Importer {
  description(): string {
    return "自动处理支付宝退款";
  }

  async handle(
    transactions: NewTransactionData[],
    appData: AppDataValue,
    onProgress?: (message: string) => void,
  ): Promise<NewTransactionData[]> {
    onProgress?.("正在处理支付宝退款…");

    // ── 1. 筛选：哪些交易参与退款分组 ────────────────────────────────────
    //    条件：(不计收支 & 退款成功) 或 (支出)
    //          且 交易订单号、商家订单号均非空
    const sorted = [...transactions].sort((a, b) => compareTxTime(a.datetime, b.datetime));
    const candidateIndices: number[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const tx = sorted[i];
      const dir = getAlipayRawField(tx, ColumnKey.Direction);
      const status = getAlipayRawField(tx, ColumnKey.Status);
      const hasOrderIds =
        !!getAlipayRawField(tx, ColumnKey.TransactionId)?.trim() &&
        !!getAlipayRawField(tx, ColumnKey.MerchantId)?.trim();
      const satisfiedStatus = dir === "支出" || (dir === "不计收支" && status === "退款成功");

      if (hasOrderIds && satisfiedStatus) {
        candidateIndices.push(i);
      }
    }

    if (candidateIndices.length === 0) return sorted;

    // ── 2. 分组：主订单号相同 或 商家订单号相同 → 同一组 ─────────────────
    const groups = group(candidateIndices, sorted);

    // ── 3. 逐组处理 ─────────────────────────────────────────────────────
    const result = sorted.map((tx) => ({ ...tx }));
    const toDelete = new Set<number>();

    for (const indices of groups) {
      const group = indices.map((i: number) => sorted[i]);

      if (group.length === 1) {
        result[indices[0]] = this.handleSingleTx(result[indices[0]], appData);
      } else {
        const merged = this.handleGroup(group, appData);
        result[indices[0]] = merged;
        for (let i = 1; i < indices.length; i++) toDelete.add(indices[i]);
      }
    }

    return result.filter((_, i) => !toDelete.has(i));
  }

  // ── 单笔（未配对） ─────────────────────────────────────────────────────

  private handleSingleTx(tx: NewTransactionData, appData: AppDataValue): NewTransactionData {
    const dir = getAlipayRawField(tx, ColumnKey.Direction);
    const status = getAlipayRawField(tx, ColumnKey.Status);

    // 支出 + 交易关闭 → 未找到退款记录
    if (dir === "支出" && status === "交易关闭") {
      return {
        ...tx,
        amount: 0,
        original_amount: 0,
        status: "待处理",
        remark: appendRemark(tx.remark, "⚠️ 该交易关闭但没有找到退款记录"),
      };
    }

    // 不计收支 + 退款成功 → 未找到对应支出
    if (dir === "不计收支" && status === "退款成功") {
      const { main_category, sub_category } = resolveCategories(appData, "收入", "收入", "退款");
      return {
        ...tx,
        transaction_type: "收入",
        main_category,
        sub_category,
        status: "待处理",
        remark: appendRemark(tx.remark, "⚠️ 该退款没有找到对应的支出记录"),
      };
    }

    return tx;
  }

  // ── 多笔（同一订单） ────────────────────────────────────────────────────

  private handleGroup(group: NewTransactionData[], appData: AppDataValue): NewTransactionData {
    const items = group.map((tx) => ({ ...tx }));

    // 退款成功的标记为 收入-收入-退款
    const { main_category: refundMainCategory, sub_category: refundSubCategory } =
      resolveCategories(appData, "收入", "收入", "退款");
    for (const tx of items) {
      if (getAlipayRawField(tx, ColumnKey.Status) === "退款成功") {
        tx.transaction_type = "收入";
        tx.main_category = refundMainCategory;
        tx.sub_category = refundSubCategory;
      }
    }

    // 选出主交易：金额最大的支出；若无支出则按时间取第一条
    const expenses = items.filter((tx) => tx.transaction_type === "支出");
    const main =
      expenses.length > 0
        ? expenses.reduce((a, b) => (a.amount >= b.amount ? a : b))
        : [...items].sort((a, b) => compareTxTime(a.datetime, b.datetime))[0];

    // 计算带符号金额总和（分，支出为负、退款为正）
    const sumCents = items.reduce(
      (s, tx) =>
        s +
        Math.round(
          calculateAmount({ amount: tx.amount, transaction_type: tx.transaction_type }) * 100,
        ),
      0,
    );
    const isBalanced = sumCents === 0;

    // 组装 children
    const children: NewTransactionData[] = items
      .filter((tx) => tx !== main)
      .map((child) => {
        return {
          ...child,
          status: "附加到其他交易",
        };
      });

    return {
      ...main,
      status: isBalanced ? "经自动处理取消" : "经自动处理填写",
      children,
    };
  }
}
