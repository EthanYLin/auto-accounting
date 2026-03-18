/**
 * 负责根据入口交易及其附加交易计算出口拆分。
 * 当用户尚未手动分账时，提供单条入口直接映射和多条入口按账户合并两种默认策略。
 */
import type {
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
function getDefaultSplit(
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
    // (1) 金额：带符号求和，为 0 则抵消该记录
    const sum = entries.reduce(
      (acc: number, e: TransactionSplitWithRelations) => acc + calculateAmount(e),
      0,
    );
    if (sum === 0) return;

    // 本组中的主交易(可能无)
    const mainTx: TransactionSplitWithRelations | undefined = entries.find((e) => e.id === tx.id);

    // (2) 名称：主记录名称非空取主记录，否则取第一个非空项
    const name = mainTx?.name ?? entries.find((e) => e.name)?.name ?? null;

    // (3) 交易类型：由主记录类型（全局）+ 合并后金额正负决定
    //     若主记录类型为空，则参考本组第一条类型非空记录
    let refCategory: "income_expense" | "receivable_payable" | "other";
    if (tx.transaction_type) {
      if (tx.transaction_type === "收入" || tx.transaction_type === "支出") {
        refCategory = "income_expense";
      } else if (tx.transaction_type === "应收款项" || tx.transaction_type === "应付款项") {
        refCategory = "receivable_payable";
      } else {
        refCategory = "other";
      }
    } else {
      const firstType = entries.find((e) => e.transaction_type)?.transaction_type;
      if (firstType === "收入" || firstType === "支出") {
        refCategory = "income_expense";
      } else if (firstType === "应收款项" || firstType === "应付款项") {
        refCategory = "receivable_payable";
      } else {
        refCategory = "other";
      }
    }

    let mergedType: TransactionType;
    if (refCategory === "income_expense" || refCategory === "other") {
      mergedType = sum < 0 ? "支出" : "收入";
    } else {
      mergedType = sum < 0 ? "应收款项" : "应付款项";
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
      const typeMatch = entries.find((e) => e.transaction_type === mergedType && e.main_category);
      if (typeMatch) {
        mainCat = typeMatch.main_category;
        subCat = typeMatch.sub_category;
        budget = typeMatch.budget_type;
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
