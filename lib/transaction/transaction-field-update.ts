/**
 * 处理 UI -> TransactionContentDraft 的转化，
 * 负责将编辑器中的字段级原始输入应用到交易对象上。
 */
import type { AppDataValue, TransactionContentDraft, TransactionStatus } from "@/types";

import { formatTxTime } from "@/lib/transaction/transaction-datetime";

// ==================== 类型定义 ====================

/** 可通过 updateFields 修改的字段（使用原始类型值，内部会转换为关联对象） */
export interface EditableFields {
  amount: string; // "123.45" → parseFloat → tx.amount
  name: string; // → tx.name
  merchant: string; // → tx.merchant
  datetime: string | null; // ISO string / null → tx.datetime
  remark: string | null; // → tx.remark
  source: string | null; // → tx.source
  status: TransactionStatus; // → tx.status
  account: string; // account id string → 查找 Account 对象
  transaction_type: string; // → tx.transaction_type
  main_category: string | undefined; // main_category id string → 查找对象
  sub_category: string | undefined; // sub_category id string → 查找对象
  budget_type: string | undefined; // budget_type id string → 查找对象
}

// ==================== 字段映射 ====================

/**
 * 将 EditableFields 的原始值映射到 TransactionContentDraft 上
 * 纯函数，无 React 依赖
 */
export function applyEditableFields(
  tx: TransactionContentDraft,
  fields: Partial<EditableFields>,
  refData: AppDataValue,
): TransactionContentDraft {
  const updated = { ...tx };

  if ("amount" in fields && fields.amount !== undefined) {
    updated.amount = parseFloat(fields.amount) || 0;
  }
  if ("name" in fields) {
    updated.name = fields.name || null;
  }
  if ("merchant" in fields) {
    updated.merchant = fields.merchant || null;
  }
  if ("datetime" in fields && fields.datetime !== undefined) {
    updated.datetime = formatTxTime(fields.datetime);
  }
  if ("remark" in fields) {
    updated.remark = fields.remark ?? null;
  }
  if ("source" in fields) {
    updated.source = fields.source ?? null;
  }
  if ("status" in fields && fields.status !== undefined) {
    updated.status = fields.status;
  }
  if ("account" in fields && fields.account !== undefined) {
    const account = refData.accounts.find((a) => String(a.id) === fields.account);
    if (account) updated.account = account;
  }
  if ("transaction_type" in fields) {
    updated.transaction_type = (fields.transaction_type as any) || null;
  }
  if ("main_category" in fields) {
    updated.main_category = fields.main_category
      ? refData.mainCategories.find((mc) => String(mc.id) === fields.main_category)
      : undefined;
  }
  if ("sub_category" in fields) {
    updated.sub_category = fields.sub_category
      ? refData.subCategories.find((sc) => String(sc.id) === fields.sub_category)
      : undefined;
  }
  if ("budget_type" in fields) {
    updated.budget_type = fields.budget_type
      ? refData.budgetTypes.find((bt) => String(bt.id) === fields.budget_type)
      : undefined;
  }

  return updated;
}
