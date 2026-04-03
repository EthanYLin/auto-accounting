/**
 * 负责根据入口交易及其附加交易计算出口拆分。
 * 当用户尚未手动分账时，提供单条入口直接映射和多条入口按账户合并两种默认策略。
 */
import type {
  Account,
  TransactionWithRelations,
  TransactionSplitWithRelations,
  TransactionType,
  MainCategory,
  SubCategory,
  BudgetType,
} from "@/types";

import { calculateAmount } from "@/lib/transaction/transaction-display";

// ==================== Split 合并逻辑 ====================

/**
 * 在没有附加交易且用户未分账时，出口=入口交易。
 */
export function getDefaultSplit(
  tx: TransactionWithRelations | TransactionSplitWithRelations,
): TransactionSplitWithRelations {
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

/**
 * 根据入口交易及其附加交易计算合并后的交易类型
 */
function getMergedTransactionType(
  tx: TransactionWithRelations | TransactionSplitWithRelations,
  entries: TransactionSplitWithRelations[],
  sum: number,
): TransactionType {
  let txTypeGroup: "income_expense" | "receivable_payable" | "transfer" | "other";
  const resolvedType =
    tx.transaction_type ?? entries.find((e) => e.transaction_type)?.transaction_type;

  if (resolvedType === "收入" || resolvedType === "支出") {
    txTypeGroup = "income_expense";
  } else if (resolvedType === "应收款项" || resolvedType === "应付款项") {
    txTypeGroup = "receivable_payable";
  } else if (resolvedType === "转入" || resolvedType === "转出") {
    txTypeGroup = "transfer";
  } else {
    txTypeGroup = "other";
  }

  if (txTypeGroup === "income_expense" || txTypeGroup === "other") {
    return sum < 0 ? "支出" : "收入";
  } else if (txTypeGroup === "transfer") {
    return sum < 0 ? "转出" : "转入";
  } else {
    return sum < 0 ? "应收款项" : "应付款项";
  }
}

/**
 * 在存在附加交易、入口为多条且用户未分账时，按账户合并入口交易生成默认出口。
 * 同一账户下的金额会先按交易方向抵消后汇总，再推导合并后的类型、名称与分类信息。
 */
export function defaultMerge(
  tx: TransactionWithRelations | TransactionSplitWithRelations,
  children: TransactionWithRelations[] | TransactionSplitWithRelations[],
): TransactionSplitWithRelations[] {
  const result: TransactionSplitWithRelations[] = [];

  // 1. 合并所有记录，过滤掉转出/转入/无交易类型的记录
  const allEntries = [tx, ...children];
  const participating: TransactionSplitWithRelations[] = [];
  allEntries.forEach((e) => {
    if (e.transaction_type && e.transaction_type !== "转出" && e.transaction_type !== "转入") {
      participating.push(e);
    } else {
      result.push(getDefaultSplit(e));
    }
  });

  // 2. 按账户分组
  const groups = new Map<number, TransactionSplitWithRelations[]>();
  participating.forEach((e) => {
    const accId = e.account.id;
    if (!groups.has(accId)) groups.set(accId, []);
    groups.get(accId)!.push(e);
  });

  // 3. 逐组合并
  Array.from(groups.values()).forEach((entries) => {
    // (1) 金额：带符号求和（分），为 0 则抵消该记录
    const sumCents = entries.reduce(
      (acc: number, e: TransactionSplitWithRelations) => acc + Math.round(calculateAmount(e) * 100),
      0,
    );
    if (sumCents === 0) return;

    // 本组中的主交易(可能无)
    const mainTx: TransactionSplitWithRelations | undefined = entries.find((e) => e.id === tx.id);

    // (2) 名称：主记录名称非空取主记录，否则取第一个非空项
    const name = mainTx?.name ?? entries.find((e) => e.name)?.name ?? null;

    // (3) 交易类型：由主记录类型（全局）+ 合并后金额正负决定
    //     若主记录类型为空，则参考本组第一条类型非空记录
    const mergedType: TransactionType = getMergedTransactionType(tx, entries, sumCents);

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
      const typeMatch = entries.find((e) => e.transaction_type === mergedType && e.main_category);
      if (typeMatch) {
        mainCat = typeMatch.main_category;
        subCat = typeMatch.sub_category;
        budget = typeMatch.budget_type;
      }
    }

    result.push({
      id: mainTx?.id ?? entries[0].id,
      amount: Math.abs(sumCents) / 100,
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

/**
 * 获取当前交易对应的出口拆分结果。
 * 若有拆账数据，以拆账数据为准；若尚未分账，根据账户进行合并。
 */
export function getExitSplits(
  tx: TransactionWithRelations,
  children: TransactionWithRelations[],
): TransactionSplitWithRelations[] {
  // 若有拆账数据，以拆账数据为准
  if (tx.splits?.length) return tx.splits;
  // 若入口仅一条，无拆账记录，出口=入口
  if (tx.children_ids.length === 0) {
    return [getDefaultSplit(tx)];
  }
  // 若入口有多条，无拆账记录，出口=入口的合并
  return defaultMerge(tx, children);
}

// ==================== Entrance Summary 入口合并预览 ====================

/**
 * 按账户合并入口交易，返回每个账户的合并后金额与交易类型
 */
export function getEntranceSummary(
  tx: TransactionWithRelations | TransactionSplitWithRelations,
  children: TransactionWithRelations[] | TransactionSplitWithRelations[],
): { account: Account; amount: number; transaction_type?: TransactionType }[] {
  const allEntries: TransactionSplitWithRelations[] = [tx, ...children];
  const groups = new Map<number, TransactionSplitWithRelations[]>();
  allEntries.forEach((e) => {
    const accId = e.account.id;
    if (!groups.has(accId)) groups.set(accId, []);
    groups.get(accId)!.push(e);
  });

  const result: { account: Account; amount: number; transaction_type?: TransactionType }[] = [];

  Array.from(groups.values()).forEach((entries) => {
    const sumCents = entries.reduce(
      (acc: number, e: TransactionSplitWithRelations) => acc + Math.round(calculateAmount(e) * 100),
      0,
    );
    const mergedType: TransactionType = getMergedTransactionType(entries[0], entries, sumCents);
    result.push({
      account: entries[0].account,
      amount: sumCents / 100,
      transaction_type: sumCents === 0 ? undefined : mergedType,
    });
  });

  return result;
}
