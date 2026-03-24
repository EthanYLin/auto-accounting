import type { TransactionWithRelations } from "@/types";

import { useCallback } from "react";
import { addToast } from "@heroui/react";

// ==================== 类型定义 ====================

interface UseTransactionNavigationOptions {
  filteredTransactions: TransactionWithRelations[];
  currentIndex: number;
  totalCount: number;
  onSelectTransaction: (id: number | null) => void;
  onLocateCurrent?: () => void;
}

// ==================== Hook ====================

/**
 * 交易列表导航逻辑：前后翻页、跳转下一待处理、定位当前。
 */
export function useTransactionNavigation({
  filteredTransactions,
  currentIndex,
  totalCount,
  onSelectTransaction,
  onLocateCurrent,
}: UseTransactionNavigationOptions) {
  const goToPrevious = useCallback(() => {
    if (currentIndex > 1) {
      const prevTx = filteredTransactions[currentIndex - 2];
      if (prevTx) onSelectTransaction(prevTx.id);
    }
  }, [currentIndex, filteredTransactions, onSelectTransaction]);

  const goToNext = useCallback(() => {
    if (currentIndex > 0 && currentIndex < totalCount) {
      const nextTx = filteredTransactions[currentIndex];
      if (nextTx) onSelectTransaction(nextTx.id);
    }
  }, [currentIndex, totalCount, filteredTransactions, onSelectTransaction]);

  const goToIndex = useCallback(
    (index: number) => {
      if (!Number.isInteger(index)) return;
      if (index < 1 || index > totalCount) return;
      const targetTx = filteredTransactions[index - 1];
      if (targetTx) {
        onSelectTransaction(targetTx.id);
      }
    },
    [totalCount, filteredTransactions, onSelectTransaction],
  );

  const goToNextPending = useCallback(() => {
    const pendingStatuses = new Set(["待处理", "经自动处理取消", "经自动处理填写"]);
    const startIndex = currentIndex; // currentIndex 是 1-based
    for (let i = startIndex; i < filteredTransactions.length; i++) {
      if (pendingStatuses.has(filteredTransactions[i].status ?? "")) {
        onSelectTransaction(filteredTransactions[i].id);
        return;
      }
    }
    for (let i = 0; i < startIndex; i++) {
      if (pendingStatuses.has(filteredTransactions[i].status ?? "")) {
        onSelectTransaction(filteredTransactions[i].id);
        return;
      }
    }
    addToast({
      title: "无更多待处理的交易",
      description: "当前列表中没有更多待处理的交易。",
      color: "primary",
    });
  }, [currentIndex, filteredTransactions, onSelectTransaction]);

  const locateCurrent = useCallback(() => {
    onLocateCurrent?.();
  }, [onLocateCurrent]);

  return {
    goToPrevious,
    goToNext,
    goToIndex,
    goToNextPending,
    locateCurrent,
  };
}

export type TransactionNavigation = ReturnType<typeof useTransactionNavigation>;
