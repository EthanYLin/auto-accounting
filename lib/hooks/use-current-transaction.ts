import { useMemo } from "react";
import type { TransactionWithRelations } from "@/types";

/**
 * 基于当前选中 ID 计算选中交易及其在过滤列表中的位置。
 * @param currentId 当前选中的交易 ID（可为空）。
 * @param transactions 全量交易列表。
 * @param filteredTransactions 已过滤的交易列表（用于位置计算）。
 * @returns 选中交易及其索引信息。
 */
export function useCurrentTransaction(
  currentId: number | null,
  transactions: TransactionWithRelations[],
  filteredTransactions: TransactionWithRelations[]
) {
  const currentTransaction = useMemo(() => {
    if (currentId === null) return null;
    return transactions.find(tx => tx.id === currentId) || null;
  }, [currentId, transactions]);

  const { currentIndex, totalCount } = useMemo(() => {
    if (currentId === null) {
      return { currentIndex: 0, totalCount: filteredTransactions.length };
    }
    const index = filteredTransactions.findIndex(tx => tx.id === currentId);
    return {
      currentIndex: index === -1 ? 0 : index + 1,
      totalCount: filteredTransactions.length,
    };
  }, [currentId, filteredTransactions]);

  return { currentTransaction, currentIndex, totalCount };
}
