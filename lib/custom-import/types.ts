import type { Account, Json, NewTransactionData } from "@/types";

import { z } from "zod";

import { amountToCents } from "@/lib/transaction/transaction-display";

export interface CustomImportTx {
  /** 交易日期时间 格式为 "2024-01-01T12:00:00" */
  datetime: string;
  /** 金额，正数表示收入，负数表示支出，单位为元 */
  amount: number;
  /** 交易名称 */
  name?: string | null;
  /** 商户 */
  merchant?: string | null;
  /** 导入描述 */
  title?: string | null;
  /** 原始信息 */
  raw_info?: Json | null;
}

const customImportTxSchema = z.object({
  datetime: z.iso.datetime({ local: true }),
  amount: z.number(),
  name: z.string().nullable().optional(),
  merchant: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  raw_info: z.json().nullable().optional(),
});

export function parseFromString(input: string): {
  count: number;
  success: number;
  message?: string;
  result: CustomImportTx[];
} {
  input = replaceFullWidthJsonSymbols(input);
  let parsed: unknown;

  try {
    parsed = JSON.parse(input);
  } catch (error) {
    return {
      count: 0,
      success: 0,
      message: error instanceof Error ? error.message : "JSON 解析失败",
      result: [],
    };
  }

  if (!Array.isArray(parsed)) {
    return {
      count: 0,
      success: 0,
      message: "输入的 JSON 必须是一个数组",
      result: [],
    };
  }

  const result: CustomImportTx[] = [];
  const issues: string[] = [];

  parsed.forEach((item, index) => {
    const one = customImportTxSchema.safeParse(item);
    if (one.success) {
      result.push(one.data);
      return;
    }

    const issueText = one.error.issues
      .map((i) => `${i.path.join(".") || "root"}: ${i.message}`)
      .join("; ");
    issues.push(`[${index}] ${issueText}`);
  });

  return {
    count: parsed.length,
    success: result.length,
    message:
      issues.length > 0
        ? [
            ...issues.slice(0, 10),
            ...(issues.length > 10 ? [`... 还有 ${issues.length - 10} 条错误未展示`] : []),
          ].join("\n")
        : undefined,
    result,
  };
}

export function toNewTransactionData(
  tx: CustomImportTx,
  account: Account,
  customSource?: string,
): NewTransactionData {
  const source = customSource?.trim() ? `${customSource.trim()}(自定义导入)` : "自定义导入";
  const cents = amountToCents(tx.amount);
  const amount = Number.isFinite(cents) ? cents / 100 : 0;
  const transactionType = amount === 0 ? null : amount < 0 ? "支出" : "收入";
  return {
    account: account,
    amount: Math.abs(amount),
    datetime: tx.datetime,
    name: tx.name ?? null,
    merchant: tx.merchant ?? null,
    transaction_type: transactionType,
    source: source,
    remark: null,
    title: tx.title ?? null,
    status: "待处理",
    original_amount: Math.abs(amount),
    raw_info: tx.raw_info ?? null,
    main_category: undefined,
    sub_category: undefined,
    budget_type: undefined,
  };
}

export function replaceFullWidthJsonSymbols(input: string): string {
  const fullWidthJsonSymbolMap: Record<string, string> = {
    "，": ",",
    "：": ":",
    "；": ";",
    "。": ".",
    "！": "!",
    "？": "?",
    "（": "(",
    "）": ")",
    "【": "[",
    "】": "]",
    "｛": "{",
    "｝": "}",
    "“": '"',
    "”": '"',
    "‘": "'",
    "’": "'",
    "＂": '"',
    "＇": "'",
  };
  return input
    .replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/　/g, " ")
    .replace(/[，：；。！？（）【】｛｝“”‘’＂＇]/g, (ch) => fullWidthJsonSymbolMap[ch] ?? ch);
}
