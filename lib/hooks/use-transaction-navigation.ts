import type { TransactionWithRelations } from "@/types";

import { useCallback } from "react";
import { addToast } from "@heroui/react";

import { useCommandListener } from "@/lib/commands";

interface UseTransactionNavigationOptions {
  filteredTransactions: TransactionWithRelations[];
  currentIndex: number;
  totalCount: number;
  onSelectTransaction: (id: number | null) => void;
  onLocateCurrent?: (targetId?: number) => void;
}

// ==================== Hook ====================

/**
 * 交易列表导航逻辑：前后翻页、跳转下一待处理、定位当前。
 * 同时监听对应的命令事件，热键和按钮均可触发。
 */
export function useTransactionNavigation({
  filteredTransactions,
  currentIndex,
  totalCount,
  onSelectTransaction,
  onLocateCurrent,
}: UseTransactionNavigationOptions) {
  const selectAndLocate = useCallback(
    (id: number) => {
      onSelectTransaction(id);
      onLocateCurrent?.(id);
    },
    [onSelectTransaction, onLocateCurrent],
  );

  const goToPrevious = useCallback(() => {
    if (currentIndex > 1) {
      const prevTx = filteredTransactions[currentIndex - 2];
      if (prevTx) selectAndLocate(prevTx.id);
    }
  }, [currentIndex, filteredTransactions, selectAndLocate]);

  const goToNext = useCallback(() => {
    if (currentIndex > 0 && currentIndex < totalCount) {
      const nextTx = filteredTransactions[currentIndex];
      if (nextTx) selectAndLocate(nextTx.id);
    }
  }, [currentIndex, totalCount, filteredTransactions, selectAndLocate]);

  const goToIndex = useCallback(
    (index: number) => {
      if (!Number.isInteger(index)) return;
      if (index < 1 || index > totalCount) return;
      const targetTx = filteredTransactions[index - 1];
      if (targetTx) selectAndLocate(targetTx.id);
    },
    [totalCount, filteredTransactions, selectAndLocate],
  );

  const goToNextPending = useCallback(() => {
    const pendingStatuses = new Set(["待处理", "经自动处理取消", "经自动处理填写"]);
    const startIndex = currentIndex;
    for (let i = startIndex; i < filteredTransactions.length; i++) {
      if (pendingStatuses.has(filteredTransactions[i].status ?? "")) {
        selectAndLocate(filteredTransactions[i].id);
        return;
      }
    }
    for (let i = 0; i < startIndex; i++) {
      if (pendingStatuses.has(filteredTransactions[i].status ?? "")) {
        selectAndLocate(filteredTransactions[i].id);
        return;
      }
    }
    addToast({
      title: "无更多待处理的交易",
      description: "当前列表中没有更多待处理的交易。",
      color: "primary",
    });
  }, [currentIndex, filteredTransactions, selectAndLocate]);

  const locateCurrent = useCallback(() => {
    onLocateCurrent?.();
  }, [onLocateCurrent]);

  useCommandListener("go-previous", goToPrevious);
  useCommandListener("go-next", goToNext);
  useCommandListener("go-to-index", (detail: { index: number }) => goToIndex(detail.index));
  useCommandListener("locate-current", locateCurrent);
  useCommandListener("next-pending", goToNextPending);

  return {
    goToPrevious,
    goToNext,
    goToIndex,
    goToNextPending,
    locateCurrent,
  };
}

export type TransactionNavigation = ReturnType<typeof useTransactionNavigation>;
