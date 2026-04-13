/**
 * 微信账单 Excel 导入数据结构
 */

import type { Json, NewTransactionData } from "@/types";

/**
 * 微信账单 Excel 列名枚举
 * 枚举值为微信导出文件中的原始中文列名，用于与 headers 匹配
 */
export enum ColumnKey {
  TransactionTime = "交易时间",
  TransactionType = "交易类型",
  Counterparty = "交易对方",
  Product = "商品",
  Direction = "收/支",
  Amount = "金额(元)",
  PaymentMethod = "支付方式",
  Status = "当前状态",
  TransactionId = "交易单号",
  MerchantId = "商户单号",
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

    if (value === undefined || value === null || String(value).trim() === "") return null;

    if (value instanceof Date) return value.toISOString();

    return String(value).trim();
  }

  json(): Json | null {
    const result: { [key: string]: Json } = {};

    this.headers.forEach((header, i) => {
      const value = this.data[i];
      if (value === undefined || value === null) return;
      const str = String(value).trim();
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
