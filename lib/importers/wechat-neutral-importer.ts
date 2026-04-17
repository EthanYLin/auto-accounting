import type {
  AppDataValue,
  MainCategory,
  NewTransactionData,
  SubCategory,
  TransactionType,
} from "@/types";
import type { Importer } from "./types";

import { ColumnKey } from "../wechat-import/types";

import { appendRemark, getWxRawField, resolveCategories } from "./shared";

// ─── 收/支为 "/" 的处理 ────────────────────────────────────────────────

export class WechatNeutralTxImporter implements Importer {
  description(): string {
    return "自动处理中性交易";
  }

  async handle(
    transactions: NewTransactionData[],
    appData: AppDataValue,
    onProgress?: (message: string) => void,
  ): Promise<NewTransactionData[]> {
    onProgress?.("正在处理中性交易…");
    return transactions.map((tx) => {
      if (getWxRawField(tx, ColumnKey.Direction) !== "/") return tx;

      const txType = getWxRawField(tx, ColumnKey.TransactionType);
      const product = getWxRawField(tx, ColumnKey.Product);

      // A1：零钱通互转
      if (txType === "转入零钱通-来自零钱" || txType === "零钱通转出-到零钱") {
        const { main_category, sub_category } = resolveCategories(appData, "支出", "其他", "其他");
        return {
          ...tx,
          amount: 0,
          original_amount: 0,
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
        ({ main_category, sub_category } = resolveCategories(appData, "转出", "转账", "转账"));
      } else if (product?.includes("转入")) {
        resolvedType = "转入";
        ({ main_category, sub_category } = resolveCategories(appData, "转入", "转账", "转账"));
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
