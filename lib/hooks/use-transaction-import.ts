"use client";

import type { NewTransactionData } from "@/types";

import { useCallback } from "react";

import {
  bulkInsertTransactions,
  bulkInsertTransactionSplits,
  insertTransaction,
} from "@/app/actions/data";
import { buildInsertFromNewData } from "@/lib/transaction/transaction-convert";
import { useTransactionStore } from "@/components/context/transaction-store-context";

function isOnlyRootTransactions(items: NewTransactionData[]): boolean {
  return items.every(
    (tx) => (tx.splits?.length ?? 0) === 0 && (tx.children?.length ?? 0) === 0,
  );
}

async function createTransactionsBulk(
  newTransactions: NewTransactionData[],
  loadTransactions: () => Promise<void>,
) {
  if (newTransactions.length > 0) {
    const txs = newTransactions.map((txData) => buildInsertFromNewData(txData).tx);
    const bulkResult = await bulkInsertTransactions(txs);
    if (!bulkResult.success) {
      return { success: false, error: bulkResult.error || "插入交易记录失败" } as const;
    }
  }
  await loadTransactions();
  return { success: true } as const;
}

async function createTransactionsSequential(
  newTransactions: NewTransactionData[],
  loadTransactions: () => Promise<void>,
) {
  for (const txData of newTransactions) {
    const { tx, splits } = buildInsertFromNewData(txData);
    const insertTxResult = await insertTransaction(tx);
    if (!insertTxResult.success || !insertTxResult.data) {
      return { success: false, error: insertTxResult.error || "插入交易记录失败" } as const;
    }
    const createdTxId = insertTxResult.data.id;

    if (splits.length > 0) {
      const splitsToInsert = splits.map((s) => ({ ...s, transaction_id: createdTxId }));
      const insertSplitsResult = await bulkInsertTransactionSplits(splitsToInsert);
      if (!insertSplitsResult.success) {
        return {
          success: false,
          error: insertSplitsResult.error || "插入拆账记录失败",
        } as const;
      }
    }

    const txChildren = txData.children ?? [];
    if (txChildren.length > 0) {
      const childrenToInsert = txChildren.map((child) => {
        const { tx: childTx } = buildInsertFromNewData(child);
        return { ...childTx, parent_id: createdTxId };
      });
      const insertChildrenResult = await bulkInsertTransactions(childrenToInsert);
      if (!insertChildrenResult.success) {
        return {
          success: false,
          error: insertChildrenResult.error || "插入子交易记录失败",
        } as const;
      }
    }
  }

  await loadTransactions();
  return { success: true } as const;
}

export function useTransactionImport() {
  const { loadTransactions } = useTransactionStore();

  const createTransactions = useCallback(
    async (newTransactions: NewTransactionData[]) => {
      try {
        if (isOnlyRootTransactions(newTransactions)) {
          return await createTransactionsBulk(newTransactions, loadTransactions);
        }
        return await createTransactionsSequential(newTransactions, loadTransactions);
      } catch (error) {
        console.error("创建交易记录异常:", error);
        const errorMessage = error instanceof Error ? error.message : "创建交易记录失败";
        return { success: false, error: errorMessage } as const;
      }
    },
    [loadTransactions],
  );

  return { createTransactions };
}
