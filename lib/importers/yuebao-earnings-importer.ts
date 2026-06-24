import type { AppDataValue, NewTransactionData } from "@/types";
import type { Importer } from "./types";

import { DateTime } from "luxon";

import {
  compareTxTime,
  parseTxTime,
  TRANSACTION_DATETIME_FORMAT,
  TRANSACTION_TIME_ZONE,
} from "../transaction/transaction-datetime";
import { ColumnKey } from "../alipay-import/types";

import { getAlipayRawField, resolveCategories } from "./shared";

/**
 * 余额宝每日收益：商品说明同时包含「余额宝」「收益发放」。
 * 按月合并为一条父交易，明细作为附加子交易。
 * 月份优先从商品说明中的 `YYYY.MM.DD` 解析；若无则按交易时间归属月份。
 */
export class YuebaoEarningsImporter implements Importer {
  description(): string {
    return "按月合并余额宝收益";
  }

  async handle(
    transactions: NewTransactionData[],
    appData: AppDataValue,
    onProgress?: (message: string) => void,
  ): Promise<NewTransactionData[]> {
    onProgress?.("正在合并余额宝收益…");

    const rest: NewTransactionData[] = [];
    const candidates: NewTransactionData[] = [];

    for (const tx of transactions) {
      if (this.isYuebaoEarning(tx)) candidates.push(tx);
      else rest.push(tx);
    }

    if (candidates.length === 0) return transactions;

    const { main_category, sub_category } = resolveCategories(appData, "收入", "收入", "投资");
    const byMonth = new Map<string, NewTransactionData[]>();

    for (const tx of candidates) {
      const key = this.monthKeyForTx(tx);
      if (!key) {
        rest.push(tx);
        continue;
      }
      const list = byMonth.get(key) ?? [];
      list.push(tx);
      byMonth.set(key, list);
    }

    const monthKeys = Array.from(byMonth.keys()).sort();

    const parents: NewTransactionData[] = [];
    for (const key of monthKeys) {
      const group = byMonth.get(key)!;
      group.sort((a, b) => compareTxTime(a.datetime, b.datetime));

      const parentName = `余额宝收益 (${key})`;

      const parentDatetime = this.lastDayOfMonthAt22(key);

      const children: NewTransactionData[] = group.map((child) => ({
        ...child,
        status: "附加到其他交易",
        transaction_type: "收入",
        main_category,
        sub_category,
      }));

      const first = group[0];
      const parent: NewTransactionData = {
        account: first.account,
        amount: 0,
        original_amount: 0,
        datetime: parentDatetime,
        name: parentName,
        title: "余额宝收益-自动填写",
        merchant: "余额宝",
        transaction_type: "收入",
        source: "支付宝导入(余额宝收益合并)",
        remark: null,
        status: "经自动处理填写",
        raw_info: null,
        main_category,
        sub_category,
        budget_type: undefined,
        children,
      };

      parents.push(parent);
    }

    return [...rest, ...parents];
  }

  private isYuebaoEarning(tx: NewTransactionData): boolean {
    const product = getAlipayRawField(tx, ColumnKey.Product);
    if (!product) return false;
    return product.includes("余额宝") && product.includes("收益发放");
  }

  /** `key` 为 `YYYY.MM`，返回该月最后一天 `YYYY-MM-DDTHH:mm:ss` */
  private lastDayOfMonthAt22(key: string): string {
    const dt = DateTime.fromFormat(key, "yyyy.MM", { zone: TRANSACTION_TIME_ZONE });
    if (!dt.isValid) {
      return DateTime.now().setZone(TRANSACTION_TIME_ZONE).toFormat(TRANSACTION_DATETIME_FORMAT);
    }
    return dt
      .endOf("month")
      .set({ hour: 22, minute: 0, second: 0, millisecond: 0 })
      .toFormat(TRANSACTION_DATETIME_FORMAT);
  }

  /** 优先商品说明中的日期，否则用交易时间；返回 `YYYY.MM` */
  private monthKeyForTx(tx: NewTransactionData): string | null {
    const fromProduct = this.monthKeyFromProduct(getAlipayRawField(tx, ColumnKey.Product));
    if (fromProduct) return fromProduct;
    return this.monthKeyFromTxDatetime(tx.datetime);
  }

  /**
   * 仅识别日期 `YYYY.MM.DD`（点分隔），如 `2025.12.30`。
   * 返回 `YYYY.MM`
   */
  private monthKeyFromProduct(product: string | null): string | null {
    if (!product) return null;
    const m = product.trim().match(/(\d{4})\.(\d{2})\.(\d{2})/);
    if (!m) return null;
    return `${m[1]}.${m[2]}`;
  }

  private monthKeyFromTxDatetime(datetime: string | null): string | null {
    const dt = parseTxTime(datetime);
    if (!dt) return null;
    return dt.toFormat("yyyy.MM");
  }
}
