import type { Account, AppDataValue, NewTransactionData, TransactionType } from "@/types";
import type { ImportResult } from "./types";

import * as XLSX from "xlsx";

import { importers } from "./importer";
import { ColumnKey, ExcelRow, ExcelTable } from "./types";

/**
 * 解析微信账单 Excel 文件，返回结构化的 ExcelTable
 *
 * @param file 用户选择的 Excel 文件（.xlsx / .xls）
 * @returns 解析后的 ExcelTable，跳过前 16 行说明，第 17 行为列名
 * @throws Error 文件类型不符、工作表缺失、行数不足时抛出
 */
export async function parseWeChatFile(file: File): Promise<ExcelTable> {
  if (!file.name.toLowerCase().endsWith(".xlsx") && !file.name.toLowerCase().endsWith(".xls")) {
    throw new Error("请选择Excel文件（.xlsx或.xls格式）");
  }

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });

  const worksheet = workbook.Sheets[workbook.SheetNames[0]];

  if (!worksheet) throw new Error("未找到工作表");

  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: "",
  }) as any[][];

  if (jsonData.length < 18) throw new Error("Excel文件行数不足，需要至少18行数据");

  // 微信账单前 16 行为账户信息，第 17 行（index 16）为列名，第 18 行起为数据
  const headers = (jsonData[16] ?? []).map((h: any) => String(h));
  const rows = jsonData.slice(17);

  return new ExcelTable(headers, rows);
}

/**
 * 从微信账单 ExcelTable 批量解析交易记录
 *
 * @param excelData  parseWeChatFile 返回的 ExcelTable
 * @param appData    AppDataValue，包含当前用户的账户列表、类别列表等
 */
export async function importFromWeChatExcel(
  excelData: ExcelTable,
  appData: AppDataValue,
): Promise<ImportResult> {
  if (!excelData || !excelData.headers) throw new Error("无效的Excel数据格式");
  if (excelData.headers.length === 0) throw new Error("Excel文件缺少标题行");
  if (excelData.length === 0) throw new Error("Excel文件没有数据行");

  const transactions: NewTransactionData[] = [];

  for (let i = 0; i < excelData.length; i++) {
    const row = excelData.get(i);
    const tx = parseRowToTransaction(row, appData.accounts);
    if (tx !== null) transactions.push(tx);
  }

  let processed = transactions;
  for (const importer of importers) {
    processed = importer.handle(processed, appData);
  }

  return { importedCount: processed.length, transactions: processed };
}

// ─── 辅助函数 ────────────────────────────────────────────────────────────────

/**
 * 解析金额字符串（去除 ¥ 符号），返回绝对值。
 * 金额为 0 或无法解析时返回 null。
 */
function parseAmount(amountStr: string | null): number | null {
  if (!amountStr) return null;
  const num = parseFloat(amountStr.replace(/[^\d.]/g, ""));
  if (isNaN(num) || num === 0) return null;
  return num;
}

/**
 * 根据"收/支"字段推断交易类型。
 * "/" 或其他非标准值返回 null（不计收支）。
 */
function resolveTransactionType(direction: string | null): TransactionType | null {
  return direction === "支出" || direction === "收入" ? (direction as TransactionType) : null;
}

/**
 * 根据支付方式字段匹配账户。
 *
 * 匹配优先级：
 * 1. 零钱 / 零钱通 / "/" → 微信支付
 * 2. 账户名称与支付方式完全匹配 → 直接匹配
 * 3. 提取形如 (数字) 的卡号片段，在账户名称中查找包含该卡号的账户
 * 4. 匹配失败 → 回退到微信支付，返回额外备注
 */
function resolveAccount(
  paymentMethod: string | null,
  accounts: Account[],
): { account: Account; accountNote?: string } {
  const wxAccount = accounts.find((a) => a.name === "微信支付");
  if (!wxAccount) throw new Error('在账户列表中未找到"微信支付"账户，请先创建该账户');

  // 微信钱包类支付方式
  if (
    !paymentMethod ||
    paymentMethod === "/" ||
    paymentMethod.includes("零钱") ||
    paymentMethod.includes("零钱通")
  ) {
    return { account: wxAccount };
  }

  // 精确匹配
  const directMatch = accounts.find((a) => a.name === paymentMethod);
  if (directMatch) return { account: directMatch };

  // 匹配 (数字) 整段（含括号），与账户名中包含该片段的账户对应
  const digitsSegment = paymentMethod.match(/\(\d+\)/)?.[0];
  if (digitsSegment) {
    const bankAccount = accounts.find((a) => a.name.includes(digitsSegment));
    if (bankAccount) return { account: bankAccount };
  }

  // 回退微信支付，记录原始支付方式
  return {
    account: wxAccount,
    accountNote: `⚠️ 未找到支付方式为: ${paymentMethod} 的账户，默认使用"微信支付"账户`,
  };
}

/**
 * 将单行 ExcelRow 转换为 NewTransactionData。
 * 金额为 0 时返回 null（过滤掉该行）。
 */
export function parseRowToTransaction(
  row: ExcelRow,
  accounts: Account[],
): NewTransactionData | null {
  // ── 金额，当金额为 0 时返回 null ────────────────────────────────────────────
  const amount = parseAmount(row.get(ColumnKey.Amount));
  if (amount === null) return null;

  // ── 账户匹配 ───────────────────────────────────────────────────
  const { account, accountNote } = resolveAccount(row.get(ColumnKey.PaymentMethod), accounts);

  // ── 交易类型 ───────────────────────────────────────────────────
  const transactionType = resolveTransactionType(row.get(ColumnKey.Direction));

  // ── 识别标题：交易对方-商品-交易类型 ─────────────────────────
  const titleParts = [
    row.get(ColumnKey.Counterparty),
    row.get(ColumnKey.Product),
    transactionType,
  ].filter(Boolean);
  const title = titleParts.length > 0 ? titleParts.join("-") : null;

  return {
    account,
    amount,
    datetime: row.get(ColumnKey.TransactionTime),
    name: null,
    merchant: null,
    transaction_type: transactionType,
    source: "微信支付导入",
    remark: accountNote ?? null,
    title,
    status: "待处理",
    original_amount: amount,
    raw_info: row.json(),
    main_category: undefined,
    sub_category: undefined,
    budget_type: undefined,
  };
}
