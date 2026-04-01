"use client";

import type {
  TransactionWithRelations,
  TransactionSplitWithRelations,
  TransactionStatus,
} from "@/types";
import type { EditableFields } from "@/lib/transaction/transaction-field-update";

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";

import { useTransactionStore } from "./transaction-store-context";
import { useAppData } from "./app-data-context";
import { useSaveButtonOverride } from "./save-button-override-context";

import { isValidTransaction, isWarningTransaction } from "@/lib/transaction/transaction-validation";
import { applyEditableFields } from "@/lib/transaction/transaction-field-update";
import { getEntranceSummary } from "@/lib/transaction/transaction-split-merge";

// ==================== 类型定义 ====================

export interface SaveResult {
  success: boolean;
  error?: string;
  validationAlert?: ValidationAlert;
  blockAutoSwitch?: boolean;
  txId?: number;
  saveTask?: Promise<{ success: boolean; error?: string }>;
}

export type ValidationAlert = {
  type: "danger" | "warning";
  title: string;
  hints: string[];
} | null;

interface TransactionEditorContextValue {
  // ====== 当前选中 ======
  currentId: number | null;
  currentTransaction: TransactionWithRelations | null;
  currentChildTransactions: TransactionWithRelations[];
  currentParentTransaction: TransactionWithRelations | null;
  currentIndex: number;
  totalCount: number;
  validationAlert: ValidationAlert;
  entranceSummary: ReturnType<typeof getEntranceSummary>;

  // ====== 选择 ======
  selectTransaction: (id: number | null) => void;

  // ====== 便捷修改方法 ======
  updateFields: (fields: Partial<EditableFields>) => void;
  updateSplits: (splits: TransactionSplitWithRelations[]) => void;
  updateChildrenIds: (childrenIds: number[]) => Promise<{ success: boolean; error?: string }>;

  // ====== 保存 / 丢弃 ======
  saveCurrentTransaction: (status?: TransactionStatus) => Promise<SaveResult>;
  discardCurrentChanges: () => Promise<void>;
  saveAllDirtyToServer: () => Promise<{ success: boolean; error?: string }>;

  // ====== 过滤列表引用（用于计算 currentIndex）======
  setFilteredTransactions: (txs: TransactionWithRelations[]) => void;

  // ====== 新建交易（含全局 loading）======
  isCreatingTransaction: boolean;
  createEmptyTransaction: () => Promise<{
    success: boolean;
    data?: TransactionWithRelations;
    error?: string;
  }>;
}

const TransactionEditorContext = createContext<TransactionEditorContextValue | undefined>(
  undefined,
);

// ==================== Provider ====================

export function TransactionEditorProvider({ children }: { children: React.ReactNode }) {
  const store = useTransactionStore();
  const appData = useAppData();
  const { clearSaveButtonOverride } = useSaveButtonOverride();

  const [currentId, setCurrentId] = useState<number | null>(null);
  const [filteredTxs, setFilteredTxs] = useState<TransactionWithRelations[]>([]);
  const [validationAlert, setValidationAlert] = useState<ValidationAlert>(null);
  const [isCreatingTransaction, setIsCreatingTransaction] = useState(false);

  const selectTransaction = useCallback(
    (id: number | null) => {
      clearSaveButtonOverride();
      setCurrentId(id);
    },
    [clearSaveButtonOverride],
  );

  useEffect(() => {
    setValidationAlert(null);
  }, [currentId]);

  const transactionsById = useMemo(() => {
    return new Map(store.transactions.map((tx) => [tx.id, tx] as const));
  }, [store.transactions]);

  const currentTransaction = useMemo(() => {
    if (currentId === null) return null;
    return transactionsById.get(currentId) ?? null;
  }, [currentId, transactionsById]);

  const getChildTransactions = useCallback(
    (tx: TransactionWithRelations) => {
      return tx.children_ids
        .map((id) => transactionsById.get(id))
        .filter((child): child is TransactionWithRelations => !!child);
    },
    [transactionsById],
  );

  const currentChildTransactions = useMemo(() => {
    if (!currentTransaction) return [];
    return getChildTransactions(currentTransaction);
  }, [currentTransaction, getChildTransactions]);

  const currentParentTransaction = useMemo(() => {
    if (!currentTransaction?.parent_id) return null;
    return transactionsById.get(currentTransaction.parent_id) ?? null;
  }, [currentTransaction, transactionsById]);

  useEffect(() => {
    if (currentId !== null && currentTransaction === null) {
      setCurrentId(null);
    }
  }, [currentId, currentTransaction]);

  const { currentIndex, totalCount } = useMemo(() => {
    if (currentId === null || currentTransaction === null) {
      return { currentIndex: 0, totalCount: filteredTxs.length };
    }
    const index = filteredTxs.findIndex((tx) => tx.id === currentId);
    return {
      currentIndex: index === -1 ? 0 : index + 1,
      totalCount: filteredTxs.length,
    };
  }, [currentId, currentTransaction, filteredTxs]);

  const entranceSummary = useMemo(
    () =>
      currentTransaction ? getEntranceSummary(currentTransaction, currentChildTransactions) : [],
    [currentTransaction, currentChildTransactions],
  );

  // ==================== 便捷修改方法 ====================

  const updateFields = useCallback(
    (fields: Partial<EditableFields>) => {
      if (currentId === null) return;
      clearSaveButtonOverride();
      store.setTransactionDraft(currentId, (tx) => applyEditableFields(tx, fields, appData));
    },
    [currentId, clearSaveButtonOverride, store, appData],
  );

  const updateSplits = useCallback(
    (splits: TransactionSplitWithRelations[]) => {
      if (currentId === null) return;
      clearSaveButtonOverride();
      store.setTransactionDraft(currentId, (draft) => ({ ...draft, splits }));
    },
    [currentId, clearSaveButtonOverride, store],
  );

  const updateChildrenIds = useCallback(
    async (selectedIds: number[]) => {
      if (currentId === null || !currentTransaction)
        return { success: false, error: "没有选中的交易" };
      clearSaveButtonOverride();
      return store.saveChildrenSelection(currentId, selectedIds);
    },
    [currentId, currentTransaction, clearSaveButtonOverride, store],
  );

  // ==================== 保存 / 丢弃 ====================

  const saveCurrentTransaction = useCallback(
    async (status?: TransactionStatus): Promise<SaveResult> => {
      if (currentId === null || !currentTransaction) {
        return { success: false, error: "没有选中的交易" };
      }
      if (store.saveState === "children-selection") {
        return { success: false, error: "当前有保存操作进行中" };
      }

      try {
        // 1. 校验保存的交易及其子交易
        const validResult = isValidTransaction(
          currentTransaction,
          currentChildTransactions,
          appData,
        );
        const warnResult = isWarningTransaction(
          currentTransaction,
          currentChildTransactions,
          appData,
        );

        // 2. 计算交易的保存后状态
        let finalStatus = currentTransaction.status ?? "待处理";
        // 若当前交易已是附加交易，则无论用户传递何种状态，都保持为“附加到其他交易”
        if (currentTransaction.status === "附加到其他交易") {
          finalStatus = "附加到其他交易";
        }
        // 若用户希望保存为“已完成”状态/未指定状态，但未通过校验，则降级为“稍后处理”
        else if (!validResult.valid && (status === "已完成" || status === undefined)) {
          finalStatus = "稍后处理";
        }
        // 若用户传递了新状态，则使用用户传递的状态
        else if (status !== undefined) {
          finalStatus = status;
        }

        // 3. 更新本地 Overlay 并异步保存（非阻塞）
        const { parent_id, children_ids, ...baseDraft } = currentTransaction;

        void parent_id;
        void children_ids;

        const updatedDraft = { ...baseDraft, status: finalStatus };
        store.setTransactionDraft(currentId, () => updatedDraft);
        const saveTask = store.saveToServer(currentId, updatedDraft);

        // 4. 构建校验提示
        let validationAlert: ValidationAlert = null;
        if (!validResult.valid && status === "已完成") {
          validationAlert = {
            type: "danger",
            title: "该交易已被设置为稍后处理",
            hints: validResult.hint,
          };
        } else if (!warnResult.valid) {
          validationAlert = { type: "warning", title: "请留意以下信息", hints: warnResult.hint };
        }
        setValidationAlert(validationAlert);

        // 5. 自动切换拦截逻辑：仅“保存并完成”且存在错误/警告时拦截
        const blockAutoSwitch = !warnResult.valid && status === "已完成";
        return { success: true, validationAlert, blockAutoSwitch, txId: currentId, saveTask };
      } catch (error) {
        console.error("保存交易失败:", error);
        const errorMessage = error instanceof Error ? error.message : "未知错误";
        return { success: false, error: errorMessage };
      }
    },
    [currentId, currentTransaction, currentChildTransactions, store, appData],
  );

  const discardCurrentChanges = useCallback(async () => {
    if (currentId === null) return;
    store.discardChanges(currentId);
  }, [currentId, store]);

  const saveAllDirtyToServer = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (store.saveState !== "idle") {
      return { success: false, error: "当前有保存操作进行中" };
    }
    const dirtyIds = store.getDirtyIds();
    const unsavedIds = new Set();
    let savedCount = 0;
    for (const id of dirtyIds) {
      // 如果某交易和他的父交易都在脏列表里，则只保存父交易即可，避免重复保存
      const tx = transactionsById.get(id);
      if (!tx) continue;
      if (tx.parent_id && dirtyIds.includes(tx.parent_id)) continue;
      // 1. 校验保存的交易及其子交易
      const childTransactions = getChildTransactions(tx);
      const validResult = isValidTransaction(tx, childTransactions, appData);
      // 2. 若校验不通过，则跳过保存并记录未保存的交易 ID
      if (!validResult.valid) {
        unsavedIds.add(id);
        childTransactions
          .map((child) => child.id)
          .filter((cid) => dirtyIds.includes(cid))
          .forEach((cid) => unsavedIds.add(cid));
        continue;
      }
      // 3. 保存交易
      const result = await store.saveToServer(id);
      if (!result.success) return { success: false, error: result.error };
      savedCount++;
    }
    if (unsavedIds.size == 0) return { success: true };
    else
      return {
        success: false,
        error: `共保存了${savedCount}条交易，以下交易校验失败未保存：${Array.from(unsavedIds)
          .map((id) => `#${id}`)
          .join(", ")}`,
      };
  }, [store, appData, transactionsById, getChildTransactions]);

  // ==================== 设置过滤列表 ====================

  const setFilteredTransactions = useCallback((txs: TransactionWithRelations[]) => {
    setFilteredTxs(txs);
  }, []);

  // ==================== 新建交易 ====================

  const createEmptyTransaction = useCallback(async () => {
    setIsCreatingTransaction(true);
    try {
      return await store.createEmptyTransaction();
    } finally {
      setIsCreatingTransaction(false);
    }
  }, [store]);

  // ==================== Context Value ====================

  const value: TransactionEditorContextValue = useMemo(
    () => ({
      currentId,
      currentTransaction,
      currentChildTransactions,
      currentParentTransaction,
      currentIndex,
      totalCount,
      selectTransaction,
      updateFields,
      updateSplits,
      updateChildrenIds,
      saveCurrentTransaction,
      discardCurrentChanges,
      saveAllDirtyToServer,
      validationAlert,
      setFilteredTransactions,
      isCreatingTransaction,
      createEmptyTransaction,
      entranceSummary,
    }),
    [
      currentId,
      currentTransaction,
      currentChildTransactions,
      currentParentTransaction,
      currentIndex,
      totalCount,
      selectTransaction,
      updateFields,
      updateSplits,
      updateChildrenIds,
      saveCurrentTransaction,
      discardCurrentChanges,
      saveAllDirtyToServer,
      validationAlert,
      setFilteredTransactions,
      isCreatingTransaction,
      createEmptyTransaction,
      entranceSummary,
    ],
  );

  return (
    <TransactionEditorContext.Provider value={value}>{children}</TransactionEditorContext.Provider>
  );
}

// ==================== Hook ====================

export function useTransactionEditor() {
  const context = useContext(TransactionEditorContext);
  if (context === undefined) {
    throw new Error("useTransactionEditor must be used within a TransactionEditorProvider");
  }
  return context;
}
