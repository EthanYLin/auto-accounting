"use client";

import type { NewTransactionData } from "@/types";

import { useCallback } from "react";

import { bulkInsertTransactions, bulkInsertTransactionSplits } from "@/app/actions/data";
import { buildInsertFromNewData } from "@/lib/transaction/transaction-convert";
import { useTransactionStore } from "@/components/context/transaction-store-context";

/**
 * 三阶段批量写入
 * 1. 批量插入所有父交易，拿回带 id 的结果（顺序与入参一一对应）
 * 2. 收集所有 children，绑定 parent_id 后批量插入
 * 3. 收集所有 splits，绑定 transaction_id 后批量插入
 */
async function bulkCreateTransactions(
  newTransactions: NewTransactionData[],
  loadTransactions: () => Promise<void>,
): Promise<{ success: true } | { success: false; error: string }> {
  if (newTransactions.length === 0) {
    await loadTransactions();
    return { success: true };
  }

  // ── 阶段 1：批量插入父交易 ──────────────────────────────────────────────
  const parentPayloads = newTransactions.map((txData) => buildInsertFromNewData(txData).tx);
  const parentResult = await bulkInsertTransactions(parentPayloads);
  if (!parentResult.success || !parentResult.data) {
    return { success: false, error: parentResult.error || "插入交易记录失败" };
  }
  const createdParents = parentResult.data; // 顺序与 parentPayloads 一一对应

  // ── 阶段 2：批量插入所有 children ──────────────────────────────────────
  const allChildren = newTransactions.flatMap((txData, i) =>
    (txData.children ?? []).map((child) => {
      const { tx: childTx } = buildInsertFromNewData(child);
      return { ...childTx, parent_id: createdParents[i].id };
    }),
  );

  if (allChildren.length > 0) {
    const childResult = await bulkInsertTransactions(allChildren);
    if (!childResult.success) {
      return { success: false, error: childResult.error || "插入子交易记录失败" };
    }
  }

  // ── 阶段 3：批量插入所有 splits ─────────────────────────────────────────
  const allSplits = newTransactions.flatMap((txData, i) =>
    buildInsertFromNewData(txData).splits.map((s) => ({
      ...s,
      transaction_id: createdParents[i].id,
    })),
  );

  if (allSplits.length > 0) {
    const splitsResult = await bulkInsertTransactionSplits(allSplits);
    if (!splitsResult.success) {
      return { success: false, error: splitsResult.error || "插入拆账记录失败" };
    }
  }

  await loadTransactions();
  return { success: true };
}

export function useTransactionImport() {
  const { loadTransactions } = useTransactionStore();

  const createTransactions = useCallback(
    async (newTransactions: NewTransactionData[]) => {
      try {
        return await bulkCreateTransactions(newTransactions, loadTransactions);
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
