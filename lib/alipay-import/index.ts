import type { Account, AppDataValue, NewTransactionData, TransactionType } from "@/types";
import type { ImportResult } from "./types";

import { Importer } from "../importers/types";
import { AlipayNeutralTxImporter } from "../importers/alipay-neutral-importer";
import { AlipayRefundImporter } from "../importers/alipay-refund-importer";
import { MatchingRuleImporter } from "../importers/matching-rule-importer";
import { AiFillImporter } from "../importers/ai-fill-importer";
import { YuebaoEarningsImporter } from "../importers/yuebao-earnings-importer";

import { ColumnKey, ExcelRow, ExcelTable, normalizeRawField } from "./types";

export const alipayImporters: Importer[] = [
  new YuebaoEarningsImporter(),
  new AlipayNeutralTxImporter(),
  new AlipayRefundImporter(),
  new MatchingRuleImporter(),
  new AiFillImporter(),
];

export const alipayImporterDescriptions: string[] = alipayImporters.map((i) => i.description());

function resolveImporters(importerIndices?: number[]): Importer[] {
  if (!importerIndices) return alipayImporters;
  const sorted = Array.from(new Set(importerIndices))
    .filter((idx) => idx >= 0 && idx < alipayImporters.length)
    .sort((a, b) => a - b);
  return sorted.map((idx) => alipayImporters[idx]);
}

/**
 * 解析支付宝账单 CSV（GBK/GB2312），跳过前文说明，自动定位列名行。
 */
export async function parseAlipayCsvFile(
  file: File,
  onProgress?: (message: string) => void,
): Promise<ExcelTable> {
  if (!file.name.toLowerCase().endsWith(".csv")) {
    throw new Error("请选择 CSV 文件（.csv 格式）");
  }

  onProgress?.("正在读取 CSV 文件…");
  const buffer = await file.arrayBuffer();
  const text = decodeAlipayCsvBuffer(buffer);

  onProgress?.("正在解析内容…");
  const lines = splitLines(text);
  const headerIdx = findAlipayHeaderLineIndex(lines);
  if (headerIdx === -1) {
    throw new Error("未找到支付宝账单表头（应以「交易时间」列开头）");
  }

  const headerCells = parseCsvLine(lines[headerIdx]).map((c) => normalizeRawField(c));

  const rows: string[][] = [];
  for (let r = headerIdx + 1; r < lines.length; r++) {
    const line = lines[r];
    if (!line.trim()) continue;
    const cells = parseCsvLine(line).map((c) => normalizeRawField(c));
    while (cells.length < headerCells.length) cells.push("");
    if (cells.length > headerCells.length) cells.length = headerCells.length;
    if (cells.every((c) => c === "")) continue;
    rows.push(cells);
  }

  if (headerCells.length === 0) throw new Error("CSV 缺少列名行");
  return new ExcelTable(headerCells, rows);
}

/**
 * 从支付宝 CSV 解析结果批量生成交易记录
 *
 * @param excelData parseAlipayCsvFile 返回的 ExcelTable
 * @param appData AppDataValue，包含当前用户的账户列表、类别列表等
 * @param onProgress 进度回调函数
 * @param importerIndices 要执行的步骤在 `alipayImporters` 中的下标；执行顺序按数字升序。省略时执行全部。
 * @returns ImportResult
 */
export async function importFromAlipayCsv(
  excelData: ExcelTable,
  appData: AppDataValue,
  onProgress?: (message: string) => void,
  importerIndices?: number[],
): Promise<ImportResult> {
  if (!excelData || !excelData.headers) throw new Error("无效的 CSV 数据格式");
  if (excelData.headers.length === 0) throw new Error("CSV 文件缺少标题行");
  if (excelData.length === 0) throw new Error("CSV 文件没有数据行");

  onProgress?.("正在解析账单数据…");
  const transactions: NewTransactionData[] = [];

  for (let i = 0; i < excelData.length; i++) {
    const row = excelData.get(i);
    const tx = parseRowToTransaction(row, appData.accounts);
    if (tx !== null) transactions.push(tx);
  }

  let processed = transactions;
  for (const importer of resolveImporters(importerIndices)) {
    processed = await importer.handle(processed, appData, onProgress);
  }

  return { importedCount: processed.length, transactions: processed };
}

// ─── 辅助函数 ────────────────────────────────────────────────────────────────

// ─── CSV 解码与解析 ───────────────────────────────────────────────────────────

/** 支付宝导出多为 GB2312/GBK；浏览器用 gbk 解码 */
function decodeAlipayCsvBuffer(buffer: ArrayBuffer): string {
  const tryDecode = (label: string) => {
    try {
      return new TextDecoder(label).decode(buffer);
    } catch {
      return null;
    }
  };

  for (const encoding of ["gbk", "gb18030", "utf-8"]) {
    const text = tryDecode(encoding);
    if (!text) continue;
    if (findAlipayHeaderLineIndex(splitLines(text)) >= 0) return text;
  }

  return new TextDecoder("gbk").decode(buffer);
}

function splitLines(text: string): string[] {
  return text.split(/\r?\n/);
}

/** RFC4180 风格：支持双引号字段 */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function findAlipayHeaderLineIndex(lines: string[]): number {
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim()) continue;
    const cells = parseCsvLine(raw).map((c) => normalizeRawField(c));
    if (cells[0] === ColumnKey.TransactionTime) return i;
  }
  return -1;
}

// ─── 交易记录解析 ───────────────────────────────────────────────────────────────

/**
 * 将单行 ExcelRow 转为 NewTransactionData。
 * 金额为 0 时丢弃
 */
export function parseRowToTransaction(
  row: ExcelRow,
  accounts: Account[],
): NewTransactionData | null {
  const amountNum = parseAmountNumeric(row.get(ColumnKey.Amount));
  if (amountNum === null || amountNum === 0) return null;

  const { primary: paymentPrimary, extraNote: paymentExtraNote } = resolvePrimaryPaymentMethod(
    row.get(ColumnKey.PaymentMethod),
  );

  const { account, accountNote } = resolveAccount(paymentPrimary, accounts);

  const remark = [accountNote, paymentExtraNote].filter(Boolean).join("；");

  const transactionType = resolveTransactionType(row.get(ColumnKey.Direction));

  const titleParts = [
    row.get(ColumnKey.Product),
    row.get(ColumnKey.Counterparty),
    row.get(ColumnKey.TransactionCategory),
    row.get(ColumnKey.Status),
    row.get(ColumnKey.Remark),
  ].filter(Boolean);
  const title = titleParts.length > 0 ? titleParts.join("-") : null;

  return {
    account,
    amount: amountNum,
    datetime: row.get(ColumnKey.TransactionTime),
    name: null,
    merchant: null,
    transaction_type: transactionType,
    source: "支付宝导入",
    remark,
    title,
    status: "待处理",
    original_amount: amountNum,
    raw_info: row.json(),
    main_category: undefined,
    sub_category: undefined,
    budget_type: undefined,
  };
}

/**
 * 解析金额字符串（去除货币符号等），返回非负数值。
 * 无法解析时返回 null。
 */
function parseAmountNumeric(amountStr: string | null): number | null {
  if (!amountStr) return null;
  const num = parseFloat(amountStr.replace(/[^\d.-]/g, ""));
  if (isNaN(num)) return null;
  return Math.abs(num);
}

/**
 * 根据「收/支」推断交易类型；「不计收支」等为 null。
 */
function resolveTransactionType(direction: string | null): TransactionType | null {
  return direction === "支出" || direction === "收入" ? (direction as TransactionType) : null;
}

/**
 * 多支付工具时只取第一个「&」前；其余写入备注。
 */
function resolvePrimaryPaymentMethod(raw: string | null): {
  primary: string | null;
  extraNote: string | null;
} {
  if (!raw) return { primary: null, extraNote: null };
  const parts = raw
    .split("&")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length <= 1) return { primary: parts[0] ?? null, extraNote: null };
  return {
    primary: parts[0],
    extraNote: `⚠️ 收/付款方式还包括：${parts.slice(1).join("&")}`,
  };
}

/**
 * 根据收/付款方式匹配账户（默认「支付宝」）。
 */
function resolveAccount(
  paymentMethodPrimary: string | null,
  accounts: Account[],
): { account: Account; accountNote?: string } {
  const alipayAccount = accounts.find((a) => a.name === "支付宝");
  if (!alipayAccount) throw new Error("在账户列表中未找到「支付宝」账户，请先创建该账户");
  // 若收/付款方式为「余额」、「余额宝」、「/」或空，则使用「支付宝」账户
  if (
    !paymentMethodPrimary ||
    paymentMethodPrimary === "/" ||
    paymentMethodPrimary.includes("余额") ||
    paymentMethodPrimary.includes("余额宝")
  ) {
    return { account: alipayAccount };
  }
  // 精确匹配
  const directMatch = accounts.find((a) => a.name === paymentMethodPrimary);
  if (directMatch) return { account: directMatch };
  // 匹配「(数字)」的卡号片段，在账户名称中查找包含该卡号的账户
  const digitsSegment = paymentMethodPrimary.match(/\(\d+\)/)?.[0];
  if (digitsSegment) {
    const bankAccount = accounts.find((a) => a.name.includes(digitsSegment));
    if (bankAccount) return { account: bankAccount };
  }
  // 回退「支付宝」账户，记录原始收/付款方式
  return {
    account: alipayAccount,
    accountNote: `⚠️ 未找到收/付款方式为「${paymentMethodPrimary}」的账户，默认使用「支付宝」账户`,
  };
}
