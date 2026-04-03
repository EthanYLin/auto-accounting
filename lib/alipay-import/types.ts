/**
 * 支付宝账单 Excel 导入数据结构
 */

import type { Json, NewTransactionData } from "@/types";

/** 去除 BOM、单元格中的制表符、不间断空格等，并 Trim */
export function normalizeRawField(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .replace(/\u00a0/g, " ")
    .replace(/\t/g, "")
    .trim();
}

/**
 * 支付宝账单 Excel 列名枚举
 * 枚举值为支付宝导出文件中的原始中文列名，用于与 headers 匹配
 */
export enum ColumnKey {
  TransactionTime = "交易时间",
  TransactionCategory = "交易分类",
  Counterparty = "交易对方",
  CounterpartyAccount = "对方账号",
  Product = "商品说明",
  Direction = "收/支",
  Amount = "金额",
  PaymentMethod = "收/付款方式",
  Status = "交易状态",
  TransactionId = "交易订单号",
  MerchantId = "商家订单号",
  Remark = "备注",
}

/** 单行数据，通过 ColumnKey 按字段名访问值 */
export class ExcelRow {
  private data: any[];
  private headers: string[];

  constructor(data: any[], headers: string[]) {
    this.data = data;
    this.headers = headers;
  }

  get(key: ColumnKey): string | null {
    const index = this.headers.indexOf(key);

    if (index === -1) return null;
    const value = this.data[index];

    if (value === undefined || value === null) return null;
    const normalized = normalizeRawField(String(value));
    if (normalized === "") return null;

    return normalized;
  }

  json(): Json | null {
    const result: { [key: string]: Json } = {};

    this.headers.forEach((header, i) => {
      const value = this.data[i];
      if (value === undefined || value === null) return;
      const str = normalizeRawField(String(value));
      if (str === "") return;
      result[header] = str;
    });

    if (Object.keys(result).length === 0) return null;
    return result;
  }
}

/** Excel 解析后的完整数据集，通过索引访问各行 */
export class ExcelTable {
  readonly headers: string[];
  private rows: any[][];

  constructor(headers: string[], rows: any[][]) {
    this.headers = headers;
    this.rows = rows;
  }

  get(index: number): ExcelRow {
    return new ExcelRow(this.rows[index], this.headers);
  }

  get length(): number {
    return this.rows.length;
  }
}

/** 导入结果 */
export interface ImportResult {
  /** 成功导入的交易数量 */
  importedCount: number;
  /** 成功导入的交易记录 */
  transactions: NewTransactionData[];
}
