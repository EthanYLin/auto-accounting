/**
 * 负责交易与拆账在展示层所需的格式化和显示辅助。
 * 包括金额符号与颜色、带符号金额计算、列表主行标题，以及类别文本/图标展示数据的生成。
 */
import type { TransactionWithRelations, TransactionType, MainCategory, SubCategory } from "@/types";
import type { FourChainState } from "@/components/homepage/common/four-chain-selector";

import { TRANSACTION_TYPES } from "@/constants/transaction-type";

// ==================== 金额相关 ====================

/**
 * 获取金额颜色类名
 * @param transactionType 交易类型
 */
export function getAmountColorClass(transactionType?: TransactionType | null): string {
  if (!transactionType) return "text-default-600";
  const txType = TRANSACTION_TYPES.find((t) => t.type === transactionType);
  return txType?.amount_color || "text-default-600";
}

/**
 * 获取金额符号文字（+ 或 -）
 * @param transactionType 交易类型
 */
export function getAmountSymbol(transactionType?: TransactionType | null): string {
  if (!transactionType) return "";
  const txType = TRANSACTION_TYPES.find((t) => t.type === transactionType);
  return txType?.sign === 1 ? "+" : "-";
}

/**
 * 计算金额（考虑交易类型的 sign，正负向）
 * @param input 任意包含 amount 与 transaction_type 的对象
 */
export function calculateAmount(input: {
  amount: number;
  transaction_type?: TransactionType | null;
}): number {
  const txType = TRANSACTION_TYPES.find((t) => t.type === input.transaction_type);
  return input.amount * (txType?.sign || 1);
}

/** 元 → 整数分（四舍五入），用于比较与按分累加，避免浮点误差 */
export function amountToCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * 拆分符号与绝对值数字串
 * @param amount 金额
 * @param transactionType 交易类型
 * @returns 符号与数字串
 */
export function formatAmountParts(
  amount: number,
  transactionType?: TransactionType | null,
): { sign: string; digits: string } {
  const txType = TRANSACTION_TYPES.find((t) => t.type === transactionType);
  const digits = Math.abs(amount).toFixed(2);
  const sign = !txType ? " " : txType.sign === 1 ? "+" : "-";
  return { sign, digits };
}

// ==================== 格式化 ====================

/**
 * 格式化类别为纯文本（含交易类型前缀）
 * 适用于详情页等需要完整路径的场景
 * @param tx 交易记录
 */
export function formatCategoryText(tx: TransactionWithRelations): string {
  const parts: string[] = [];
  if (tx.transaction_type) parts.push(tx.transaction_type);
  if (tx.main_category?.label) parts.push(tx.main_category.label);
  if (tx.sub_category?.label) parts.push(tx.sub_category.label);
  return parts.join("-") || "-";
}

/**
 * 交易主文案
 * 优先级：名称 → 标题 →「主类别-子类别」→ 主类别 → 交易类型 → "-"
 */
export function formatDisplayTitle(tx: TransactionWithRelations): string {
  if (tx.name) return tx.name;
  if (tx.title) return tx.title;
  const mainLabel = tx.main_category?.label || "";
  const subLabel = tx.sub_category?.label || "";
  if (mainLabel && subLabel) return `${mainLabel}-${subLabel}`;
  if (mainLabel) return mainLabel;
  if (tx.transaction_type) return tx.transaction_type;
  return "-";
}

/** 交易类型：Emoji + 文案 */
export function formatTransactionTypeWithEmoji(
  type: TransactionType | string | null | undefined,
): string {
  if (type == null || type === "") return "-";
  const opt = TRANSACTION_TYPES.find((t) => t.type === type);
  return opt ? `${opt.icon} ${type}` : String(type);
}

// ==================== 类别图标展示 ====================

export interface CategoryDisplayData {
  icon: string;
  backColor: string;
  foreColor: string;
  label: string;
}

/**
 * 从 TransactionWithRelations（已含关联对象）构建类别展示数据
 * 适用于已从数据库加载完关联数据的交易记录
 * @param tx 交易记录
 */
export function formatCategoryDisplay(tx: TransactionWithRelations): CategoryDisplayData {
  const txType = tx.transaction_type
    ? TRANSACTION_TYPES.find((t) => t.type === tx.transaction_type)
    : null;

  const icon = tx.sub_category?.icon ?? tx.main_category?.icon ?? txType?.icon ?? "📋";
  const backColor =
    tx.sub_category?.back_color ?? tx.main_category?.back_color ?? txType?.back_color ?? "";
  const foreColor =
    tx.sub_category?.fore_color ?? tx.main_category?.fore_color ?? txType?.fore_color ?? "";

  let label = "-";
  if (tx.sub_category?.label) label = tx.sub_category.label;
  else if (tx.main_category?.label) label = tx.main_category.label;
  else if (tx.transaction_type) label = tx.transaction_type;

  return { icon, backColor, foreColor, label };
}

/**
 * 从 FourChainState + 类别数组构建类别展示数据
 * 适用于尚未关联完整对象、只有 ID 的表单状态（如拆账条目编辑器）
 * @param chainState 四联选择器状态
 * @param mainCategories 主类别数组
 * @param subCategories 子类别数组
 */
export function buildCategoryDisplayFromChainState(
  chainState: FourChainState,
  mainCategories: MainCategory[],
  subCategories: SubCategory[],
): CategoryDisplayData | null {
  if (!chainState.main_id && !chainState.txType) return null;

  const main = chainState.main_id
    ? mainCategories.find((m) => String(m.id) === chainState.main_id)
    : null;
  const sub = chainState.sub_id
    ? subCategories.find((s) => String(s.id) === chainState.sub_id)
    : null;
  const txType = chainState.txType
    ? TRANSACTION_TYPES.find((t) => t.type === chainState.txType)
    : null;

  const icon = sub?.icon ?? main?.icon ?? txType?.icon ?? "📋";
  const backColor = sub?.back_color ?? main?.back_color ?? txType?.back_color ?? "";
  const foreColor = sub?.fore_color ?? main?.fore_color ?? txType?.fore_color ?? "";

  const parts: string[] = [];
  if (main?.label) parts.push(main.label);
  if (sub?.label) parts.push(sub.label);

  return { icon, backColor, foreColor, label: parts.join("-") };
}
