/**
 * 负责交易相关数据结构之间的转换。
 * 包括数据库记录与带关联对象的交易互转，
 * SplitEntryData 与 TransactionSplitWithRelations 之间的转换，
 * 以及合并 Server Baseline 与 Content Draft 等逻辑。
 */
import type {
  Transaction,
  TransactionContentDraft,
  TransactionWithRelations,
  TransactionInsert,
  TransactionSplit,
  TransactionSplitInsert,
  TransactionSplitWithRelations,
  NewTransactionData,
  AppDataValue,
} from "@/types";
import type { SplitEntryData } from "@/components/homepage/split-area/split-entry-editor";

import { formatTxTime } from "@/lib/transaction/transaction-datetime";

// ==================== 数据库 <==> 业务对象 ====================

/**
 * Transaction + TransactionSplit[] (数据库) --> 带关联数据的 TransactionWithRelations
 */
export function buildTransactionsWithRelations(
  allTransactions: Transaction[],
  allSplits: TransactionSplit[] = [],
  appData: AppDataValue,
): TransactionWithRelations[] {
  const { accounts, mainCategories, subCategories, budgetTypes } = appData;

  // 第一遍：添加账户、类别、预算等关联数据，以及 splits
  const txWithRelations: TransactionWithRelations[] = allTransactions.map((tx) => {
    const account = accounts.find((a) => a.id === tx.account_id);
    const mainCategory = mainCategories.find((mc) => mc.id === tx.main_category_id);
    const subCategory = subCategories.find((sc) => sc.id === tx.sub_category_id);
    const budgetType = budgetTypes.find((bt) => bt.id === tx.budget_type_id);

    const txSplitsWithRelations = allSplits
      .filter((split) => split.transaction_id === tx.id)
      .map((split) => {
        const splitAccount = accounts.find((a) => a.id === split.account_id);
        const splitMainCategory = mainCategories.find((mc) => mc.id === split.main_category_id);
        const splitSubCategory = subCategories.find((sc) => sc.id === split.sub_category_id);
        const splitBudgetType = budgetTypes.find((bt) => bt.id === split.budget_type_id);

        const {
          account_id,
          main_category_id,
          sub_category_id,
          budget_type_id,
          transaction_id,
          ...splitWithoutIds
        } = split;

        void account_id;
        void main_category_id;
        void sub_category_id;
        void budget_type_id;
        void transaction_id;

        return {
          ...splitWithoutIds,
          account: splitAccount!,
          main_category: splitMainCategory,
          sub_category: splitSubCategory,
          budget_type: splitBudgetType,
        };
      });

    const { account_id, main_category_id, sub_category_id, budget_type_id, ...txWithoutIds } = tx;

    void account_id;
    void main_category_id;
    void sub_category_id;
    void budget_type_id;

    return {
      ...txWithoutIds,
      datetime: formatTxTime(txWithoutIds.datetime),
      account: account!,
      main_category: mainCategory,
      sub_category: subCategory,
      budget_type: budgetType,
      children_ids: [] as number[],
      splits: txSplitsWithRelations,
    };
  });

  // 第二遍：维护 children_ids 关系
  allTransactions.forEach((tx, index) => {
    if (tx.parent_id) {
      const parentIndex = allTransactions.findIndex((p) => p.id === tx.parent_id);
      if (parentIndex !== -1) {
        txWithRelations[parentIndex].children_ids.push(txWithRelations[index].id);
      }
    }
  });

  return txWithRelations;
}

/**
 * TransactionWithRelations --> Transaction + TransactionSplit[] (数据库)
 */
export function buildTransactionAndSplits(txWithRelations: TransactionWithRelations): {
  transaction: Transaction;
  splits: TransactionSplit[];
} {
  const {
    account,
    main_category,
    sub_category,
    budget_type,
    children_ids,
    splits: txSplits,
    ...txData
  } = txWithRelations;

  void children_ids;

  const transaction: Transaction = {
    ...txData,
    datetime: formatTxTime(txData.datetime),
    account_id: account.id,
    main_category_id: main_category?.id ?? null,
    sub_category_id: sub_category?.id ?? null,
    budget_type_id: budget_type?.id ?? null,
  };

  const splits: TransactionSplit[] = (txSplits ?? []).map((splitWithRelations) => {
    const { account, main_category, sub_category, budget_type, ...splitData } = splitWithRelations;
    return {
      ...splitData,
      account_id: account.id,
      main_category_id: main_category?.id ?? null,
      sub_category_id: sub_category?.id ?? null,
      budget_type_id: budget_type?.id ?? null,
      transaction_id: txWithRelations.id,
    };
  });

  return { transaction, splits };
}

/**
 * TxWithRelations(Server Baseline) + TxContentDraft => 完整的 TransactionWithRelations。
 */
export function mergeContentDraft(
  baseTx: TransactionWithRelations,
  draft?: TransactionContentDraft,
): TransactionWithRelations {
  if (!draft) {
    return { ...baseTx, children_ids: [...baseTx.children_ids] };
  }
  return {
    ...baseTx,
    ...draft,
    parent_id: baseTx.parent_id,
    children_ids: [...baseTx.children_ids],
  };
}

/**
 * NewTransactionData --> TransactionInsert + TransactionSplitInsert[] (可插入数据库)
 */
export function buildInsertFromNewData(newData: NewTransactionData): {
  tx: Omit<TransactionInsert, "user_id">;
  splits: Array<Omit<TransactionSplitInsert, "user_id" | "transaction_id">>;
} {
  const { account, main_category, sub_category, budget_type, children, splits, ...txFields } =
    newData;

  void children;

  const tx: Omit<TransactionInsert, "user_id"> = {
    ...txFields,
    datetime: formatTxTime(txFields.datetime),
    account_id: account.id,
    main_category_id: main_category?.id ?? null,
    sub_category_id: sub_category?.id ?? null,
    budget_type_id: budget_type?.id ?? null,
  };
  const insertSplits = (splits ?? []).map((split) => {
    const { account, main_category, sub_category, budget_type, ...splitFields } = split;
    return {
      ...splitFields,
      account_id: account.id,
      main_category_id: main_category?.id ?? null,
      sub_category_id: sub_category?.id ?? null,
      budget_type_id: budget_type?.id ?? null,
    };
  });
  return { tx, splits: insertSplits };
}

// ==================== 分账业务对象 <==> 分账 UI 展示 ====================

/**
 * TransactionSplitWithRelations[] --> SplitEntryData[] (UI)
 */
export function txSplitsToEntries(
  splits: TransactionSplitWithRelations[] | undefined,
): SplitEntryData[] {
  if (!splits || splits.length === 0) return [];
  return splits.map((split) => ({
    localId: split.id,
    accountId: String(split.account.id),
    amount: Math.abs(split.amount).toFixed(2),
    chainState: {
      txType: split.transaction_type ?? undefined,
      main_id: split.main_category ? String(split.main_category.id) : undefined,
      sub_id: split.sub_category ? String(split.sub_category.id) : undefined,
      budget_id: split.budget_type ? String(split.budget_type.id) : undefined,
    },
    name: split.name ?? "",
  }));
}

/**
 * SplitEntryData[] (UI) --> TransactionSplitWithRelations[] (业务对象)
 */
export function entriesToTxSplits(
  entries: SplitEntryData[],
  appData: AppDataValue,
  userId: string,
): TransactionSplitWithRelations[] {
  return entries.map((entry) => {
    const splitAccount = appData.accounts.find((a) => String(a.id) === entry.accountId)!;
    const splitMainCat = entry.chainState.main_id
      ? appData.mainCategories.find((mc) => String(mc.id) === entry.chainState.main_id)
      : undefined;
    const splitSubCat = entry.chainState.sub_id
      ? appData.subCategories.find((sc) => String(sc.id) === entry.chainState.sub_id)
      : undefined;
    const splitBudget = entry.chainState.budget_id
      ? appData.budgetTypes.find((bt) => String(bt.id) === entry.chainState.budget_id)
      : undefined;

    return {
      id: entry.localId,
      amount: parseFloat(entry.amount) || 0,
      name: entry.name || null,
      transaction_type: entry.chainState.txType ?? null,
      user_id: userId,
      account: splitAccount,
      main_category: splitMainCat,
      sub_category: splitSubCat,
      budget_type: splitBudget,
    };
  });
}
