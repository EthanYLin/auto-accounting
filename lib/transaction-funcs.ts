import type { TransactionWithRelations, TransactionSplitWithRelations, TransactionType, MainCategory, SubCategory, BudgetType } from '@/types';
import { TRANSACTION_TYPES } from '@/constants/transaction-type';
import type { FourChainState } from '@/components/homepage/common/four-chain-selector';
import { TxFieldInputsData } from '@/components/homepage/tx-field-inputs';
import { SplitEntryData } from '@/components/homepage/split-area/split-entry-editor';

// ==================== 金额相关 ====================

/**
 * 获取金额颜色类名
 * @param transactionType 交易类型
 */
export function getAmountColorClass(transactionType?: TransactionType | null): string {
  if (!transactionType) return 'text-default-600';
  const txType = TRANSACTION_TYPES.find(t => t.type === transactionType);
  return txType?.amount_color || 'text-default-600';
}

/**
 * 获取金额符号文字（+ 或 -）
 * @param transactionType 交易类型
 */
export function getAmountSymbol(transactionType?: TransactionType | null): string {
  if (!transactionType) return '';
  const txType = TRANSACTION_TYPES.find(t => t.type === transactionType);
  return txType?.sign === 1 ? '+' : '-';
}

/**
 * 计算金额（考虑交易类型的 sign，正负向）
 * @param tx 交易记录 或 拆账条目
 */
export function calculateAmount(tx: TransactionWithRelations): number;
export function calculateAmount(split: TransactionSplitWithRelations): number;
export function calculateAmount(input: TransactionWithRelations | TransactionSplitWithRelations): number {
  const txType = TRANSACTION_TYPES.find(t => t.type === input.transaction_type);
  return input.amount * (txType?.sign || 1);
}

// ==================== 日期格式化 ====================

/**
 * 格式化日期时间
 * @param datetime ISO 日期字符串
 * @param format 'long'（含年份，默认）或 'short'（仅月日时分）
 */
export function formatDateTime(datetime: string | null, format: 'long' | 'short' = 'long'): string {
    if (!datetime) return '-';
    const date = new Date(datetime);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return format === 'long' ? `${year}-${month}-${day} ${hours}:${minutes}` : `${month}-${day} ${hours}:${minutes}`;
}

// ==================== 类别格式化 ====================

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
  return parts.join('-') || '-';
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
    ? TRANSACTION_TYPES.find(t => t.type === tx.transaction_type)
    : null;

  const icon = tx.sub_category?.icon ?? tx.main_category?.icon ?? txType?.icon ?? '📋';
  const backColor = tx.sub_category?.back_color ?? tx.main_category?.back_color ?? txType?.back_color ?? '';
  const foreColor = tx.sub_category?.fore_color ?? tx.main_category?.fore_color ?? txType?.fore_color ?? '';

  const parts: string[] = [];
  if (tx.main_category?.label) parts.push(tx.main_category.label);
  if (tx.sub_category?.label) parts.push(tx.sub_category.label);

  return { icon, backColor, foreColor, label: parts.join('-') || '-' };
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
    ? mainCategories.find(m => String(m.id) === chainState.main_id)
    : null;
  const sub = chainState.sub_id
    ? subCategories.find(s => String(s.id) === chainState.sub_id)
    : null;
  const txTypeDef = chainState.txType
    ? TRANSACTION_TYPES.find(t => t.type === chainState.txType)
    : null;

  const icon = sub?.icon ?? main?.icon ?? txTypeDef?.icon ?? '📋';
  const backColor = sub?.back_color ?? main?.back_color ?? txTypeDef?.back_color ?? '';
  const foreColor = sub?.fore_color ?? main?.fore_color ?? txTypeDef?.fore_color ?? '';

  const parts: string[] = [];
  if (main?.label) parts.push(main.label);
  if (sub?.label) parts.push(sub.label);

  return { icon, backColor, foreColor, label: parts.join('-') };
}

export function defaultMerge(tx: TransactionWithRelations, children: TransactionWithRelations[]): TransactionSplitWithRelations[] {
  const result: TransactionSplitWithRelations[] = [];

  // 1. 合并所有记录，过滤掉转出/转入/无交易类型的记录
  const allEntries = [tx, ...children];
  const participating: TransactionWithRelations[] = [];
  allEntries.forEach(e => {
    if (e.transaction_type && e.transaction_type !== '转出' && e.transaction_type !== '转入') {
      participating.push(e);
    } else {
      result.push(getDefaultSplit(e));
    }
  });

  // 2. 按账户分组
  const groups = new Map<number, TransactionWithRelations[]>();
  participating.forEach(e => {
    const accId = e.account.id;
    if (!groups.has(accId)) groups.set(accId, []);
    groups.get(accId)!.push(e);
  });

  // 3. 逐组合并
  Array.from(groups.values()).forEach(entries => {
    // (1) 金额：带符号求和，为 0 则抵消该记录
    const sum = entries.reduce((acc: number, e: TransactionWithRelations) => acc + calculateAmount(e), 0);
    if (sum === 0) return;

    // 本组中的主交易(可能无)
    const mainTx: TransactionWithRelations | undefined = entries.find(e => e.id === tx.id);

    // (2) 名称：主记录名称非空取主记录，否则取第一个非空项
    const name = (mainTx?.name) ?? entries.find(e => e.name)?.name ?? null;

    // (3) 交易类型：由主记录类型（全局）+ 合并后金额正负决定
    //     若主记录类型为空，则参考本组第一条类型非空记录
    let refCategory: 'income_expense' | 'receivable_payable' | 'other';
    if (tx.transaction_type) {
      if (tx.transaction_type === '收入' || tx.transaction_type === '支出') {
        refCategory = 'income_expense';
      } else if (tx.transaction_type === '应收款项' || tx.transaction_type === '应付款项') {
        refCategory = 'receivable_payable';
      } else {
        refCategory = 'other';
      }
    } else {
      const firstType = entries.find(e => e.transaction_type)?.transaction_type;
      if (firstType === '收入' || firstType === '支出') {
        refCategory = 'income_expense';
      } else if (firstType === '应收款项' || firstType === '应付款项') {
        refCategory = 'receivable_payable';
      } else {
        refCategory = 'other';
      }
    }

    let mergedType: TransactionType;
    if (refCategory === 'income_expense' || refCategory === 'other') {
      mergedType = sum < 0 ? '支出' : '收入';
    } else {
      mergedType = sum < 0 ? '应收款项' : '应付款项';
    }

    // (4) 主类别、子类别、预算计划
    let mainCat: MainCategory | undefined;
    let subCat: SubCategory | undefined;
    let budget: BudgetType | undefined;

    if (mainTx?.main_category && mainTx.transaction_type === mergedType) {
      // 主记录非空、且主记录类型与合并类型相同：取主记录
      mainCat = mainTx.main_category;
      subCat = mainTx.sub_category;
      budget = mainTx.budget_type;
    } else {
      // 取第一个类型与合并类型相同的记录
      const typeMatch = entries.find(e => e.transaction_type === mergedType && e.main_category);
      if (typeMatch) {
        mainCat = typeMatch.main_category;
        subCat = typeMatch.sub_category;
        budget = typeMatch.budget_type;
      } else {
        // 取第一个有主类别的记录
        const anyCat = entries.find(e => e.main_category);
        if (anyCat) {
          mainCat = anyCat.main_category;
          subCat = anyCat.sub_category;
          budget = anyCat.budget_type;
        }
      }
    }

    result.push({
      id: mainTx?.id ?? entries[0].id,
      amount: Math.abs(sum),
      name,
      transaction_type: mergedType,
      user_id: tx.user_id,
      account: entries[0].account,
      main_category: mainCat,
      sub_category: subCat,
      budget_type: budget,
    });
  });

  return result;
}

export function getDefaultSplit(tx: TransactionWithRelations): TransactionSplitWithRelations {
  return {
    id: tx.id,
    amount: tx.amount,
    name: tx.name ?? null,
    transaction_type: tx.transaction_type ?? null,
    user_id: tx.user_id,
    account: tx.account,
    main_category: tx.main_category,
    sub_category: tx.sub_category,
    budget_type: tx.budget_type,
  };
}

export function getExitSplits(tx: TransactionWithRelations, children: TransactionWithRelations[]): TransactionSplitWithRelations[] {
  // 若有拆账数据，以拆账数据为准
  if (tx.splits?.length) return tx.splits;
  // 若入口仅一条，无拆账记录，出口=入口
  if (tx.children_ids.length === 0) {
    return [getDefaultSplit(tx)];
  }
  // 若入口有多条，无拆账记录，出口=入口的合并
  return defaultMerge(tx, children);
}
