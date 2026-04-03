import type { AppDataValue, NewTransactionData, TransactionType } from "@/types";
import type { Importer } from "./types";

import { ColumnKey } from "../alipay-import/types";

import { appendRemark, getAlipayRawField } from "./shared";

const YUEBAO_BALANCE_PRODUCTS = new Set([
  "转账收款到余额宝",
  "余额宝-转出到余额",
  "余额宝-自动转入",
]);

// ─── 收/支为「不计收支」且交易成功（排除余额宝日收益类）───

export class AlipayNeutralTxImporter implements Importer {
  description(): string {
    return "自动处理中性交易";
  }

  async handle(
    transactions: NewTransactionData[],
    appData: AppDataValue,
    onProgress?: (message: string) => void,
  ): Promise<NewTransactionData[]> {
    onProgress?.("正在处理支付宝中性交易…");
    return transactions.map((tx) => {
      if (!this.matchesScope(tx)) return tx;

      const product = getAlipayRawField(tx, ColumnKey.Product) ?? "";
      const payment = getAlipayRawField(tx, ColumnKey.PaymentMethod) ?? "";

      // （1）余额宝与余额互转
      if (YUEBAO_BALANCE_PRODUCTS.has(product)) {
        return {
          ...tx,
          amount: 0,
          original_amount: 0,
          status: "经自动处理取消",
          remark: appendRemark(tx.remark, "余额宝与余额互转不计收支。"),
        };
      }

      // （2）亲情卡 / 他人代付
      if (payment.includes("亲情卡") || payment.includes("他人代付")) {
        return {
          ...tx,
          amount: 0,
          original_amount: 0,
          status: "经自动处理取消",
          remark: appendRemark(tx.remark, "代付交易不计收支。"),
        };
      }

      // （3）转出→支出，转入→收入；否则不填收支类型
      let transaction_type: TransactionType | null = null;
      if (product.includes("转出")) {
        transaction_type = "支出";
      } else if (product.includes("转入")) {
        transaction_type = "收入";
      }

      return {
        ...tx,
        transaction_type,
        status: "待处理",
        remark: appendRemark(tx.remark, "⚠️请确认该交易是否有实际支出。"),
      };
    });
  }

  /**
   * 仅处理：收/支为「不计收支」、交易状态「交易成功」、商品非“余额宝收益发放”的交易
   */
  private matchesScope(tx: NewTransactionData): boolean {
    if (getAlipayRawField(tx, ColumnKey.Direction) !== "不计收支") return false;
    if (getAlipayRawField(tx, ColumnKey.Status) !== "交易成功") return false;
    const product = getAlipayRawField(tx, ColumnKey.Product) ?? "";
    if (product.includes("余额宝") && product.includes("收益发放")) return false;
    return true;
  }
}
