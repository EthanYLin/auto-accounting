import type { AppDataValue, NewTransactionData } from "@/types";
import type { Importer } from "./types";

import { compareTxTime } from "../transaction/transaction-datetime";
import { amountEquals } from "../transaction/transaction-display";

import { resolveCategories } from "./shared";

/**
 * 自定义导入：对单笔支出，在时间顺序上向后寻找第一笔尚未使用的等额收入，
 * 视为退款并将该收入挂到支出下。
 * 已附加到其他交易的收入标记为「附加到其他交易」，不会再次被匹配。
 */
export class CustomCancelOutImporter implements Importer {
  description(): string {
    return "自动匹配冲销交易";
  }

  async handle(
    transactions: NewTransactionData[],
    appData: AppDataValue,
    onProgress?: (message: string) => void,
  ): Promise<NewTransactionData[]> {
    onProgress?.("正在匹配冲销交易…");
    const sorted = [...transactions].sort((a, b) => compareTxTime(a.datetime, b.datetime));

    for (let i = 0; i < sorted.length; i++) {
      const expense = sorted[i];
      if (expense.transaction_type !== "支出") continue;
      if (expense.status !== "待处理") continue;

      for (let j = i + 1; j < sorted.length; j++) {
        const candidate = sorted[j];
        if (candidate.status !== "待处理") continue;
        if (candidate.transaction_type !== "收入") continue;
        if (candidate.account.id !== expense.account.id) continue;
        if (!amountEquals(candidate.amount, expense.amount)) continue;

        const { main_category, sub_category } = resolveCategories(appData, "收入", "退款", "退款");
        candidate.status = "附加到其他交易";
        candidate.main_category = main_category;
        candidate.sub_category = sub_category;

        expense.status = "经自动处理取消";
        expense.children = [...(expense.children ?? []), candidate];
        break;
      }
    }

    return sorted.filter((tx) => tx.status !== "附加到其他交易");
  }
}
