import type { TransactionWithRelations } from "@/types";

import { getExitSplits } from "@/lib/transaction/transaction-split-merge";

/**
 * 将当前交易的出口拆分结果转换为一组可导出的交易列表。
 */
export function buildExportTransactions(
  tx: TransactionWithRelations,
  children: TransactionWithRelations[],
): ReadonlyArray<TransactionWithRelations> {
  const splits = getExitSplits(tx, children);

  // 保证转出交易和转入交易上下相邻
  splits.sort((a, b) => {
    const x = a.transaction_type === "转出" ? 0 : a.transaction_type === "转入" ? 1 : 2;
    const y = b.transaction_type === "转出" ? 0 : b.transaction_type === "转入" ? 1 : 2;
    return x - y;
  });

  return splits.map((split) => ({
    ...tx,
    account: split.account,
    amount: split.amount,
    name: split.name?.trim() ? split.name : tx.name,
    transaction_type: split.transaction_type,
    main_category: split.main_category,
    sub_category: split.sub_category,
    budget_type: split.budget_type,
    parent_id: null,
    children_ids: [],
    splits: [],
    status: tx.status,
  }));
}

/**
 * 从全部交易中筛出可导出的已完成根交易，并携带其子交易展开为分组后的导出列表。
 */
export function exportTransactions(
  transactions: TransactionWithRelations[],
): ReadonlyArray<ReadonlyArray<TransactionWithRelations>> {
  const transactionMap = new Map(transactions.map((tx) => [tx.id, tx] as const));

  return transactions
    .filter((tx) => !tx.parent_id && tx.status === "已完成")
    .map((tx) => {
      const children = tx.children_ids
        .map((childId) => transactionMap.get(childId))
        .filter((child): child is TransactionWithRelations => !!child);

      return buildExportTransactions(tx, children);
    });
}
