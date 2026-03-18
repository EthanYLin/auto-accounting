/**
 * 微信账单Excel导入数据结构
 */

/** Excel解析后的原始数据 */
export interface ExcelData {
  /** 标题行（第17行） */
  headers: string[];
  /** 数据行（从第18行开始） */
  rows: any[][];
}

/** 导入结果 */
export interface ImportResult {
  /** 成功导入的交易数量 */
  importedCount: number;
  /** 错误信息（如果有） */
  error?: string;
}
