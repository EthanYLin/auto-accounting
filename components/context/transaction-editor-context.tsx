"use client";

import type {
  TransactionWithRelations,
  TransactionSplitWithRelations,
  TransactionStatus,
  TransactionContentDraft,
} from "@/types";
import type { EditableFields } from "@/lib/transaction/transaction-field-update";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import { flushSync } from "react-dom";

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

type BatchSaveTargetStatus = Extract<TransactionStatus, "取消" | "稍后处理" | "已完成">;

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
  attachToParent: (parentId: number) => Promise<{ success: boolean; error?: string }>;

  // ====== 保存 / 丢弃 ======
  saveCurrentTransaction: (status?: TransactionStatus) => Promise<SaveResult>;
  discardCurrentChanges: () => Promise<void>;
  saveAllDirtyToServer: (
    targetStatus?: BatchSaveTargetStatus,
    targetIds?: number[],
  ) => Promise<{ success: boolean; error?: string }>;

  // ====== 过滤列表引用（用于计算 currentIndex）======
  setFilteredTransactions: (txs: TransactionWithRelations[]) => void;

  // ====== Debounce flush 注册 ======
  registerPendingFlush: (callback: () => void) => () => void;

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

  // Use refs for values that change frequently but are only needed inside callbacks.
  // This avoids recreating callbacks (and thus the context value) on every keystroke.
  const storeRef = useRef(store);
  storeRef.current = store;
  const appDataRef = useRef(appData);
  appDataRef.current = appData;

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
      storeRef.current.setTransactionDraft(currentId, (tx) =>
        applyEditableFields(tx, fields, appDataRef.current),
      );
    },
    [currentId, clearSaveButtonOverride],
  );

  const updateSplits = useCallback(
    (splits: TransactionSplitWithRelations[]) => {
      if (currentId === null) return;
      clearSaveButtonOverride();
      storeRef.current.setTransactionDraft(currentId, (draft) => ({ ...draft, splits }));
    },
    [currentId, clearSaveButtonOverride],
  );

  const updateChildrenIds = useCallback(
    async (selectedIds: number[]) => {
      if (currentId === null || !currentTransaction)
        return { success: false, error: "没有选中的交易" };
      clearSaveButtonOverride();
      return storeRef.current.saveChildrenSelection(currentId, selectedIds);
    },
    [currentId, currentTransaction, clearSaveButtonOverride],
  );

  const attachToParent = useCallback(
    async (parentId: number) => {
      if (currentId === null) return { success: false, error: "没有选中的交易" };
      if (parentId === currentId) return { success: false, error: "不能附加到自身" };
      clearSaveButtonOverride();
      const { transactions, saveChildrenSelection } = storeRef.current;
      const parent = transactions.find((t) => t.id === parentId);
      if (!parent) return { success: false, error: "目标账单不存在" };
      if (parent.parent_id !== null) return { success: false, error: "只能附加到主账单" };
      const child = transactions.find((t) => t.id === currentId);
      if (!child) return { success: false, error: "账单不存在" };
      if (child.parent_id !== null) return { success: false, error: "该账单已附加到其他主账单" };
      if (child.children_ids.length > 0)
        return { success: false, error: "请先处理当前账单的附加账单" };
      const newIds = parent.children_ids.includes(currentId)
        ? [...parent.children_ids]
        : [...parent.children_ids, currentId];
      return saveChildrenSelection(parentId, newIds);
    },
    [currentId, clearSaveButtonOverride],
  );

  // ==================== Debounce flush 注册 ====================

  const pendingFlushCallbacksRef = useRef<Set<() => void>>(new Set());

  const registerPendingFlush = useCallback((callback: () => void) => {
    pendingFlushCallbacksRef.current.add(callback);
    return () => {
      pendingFlushCallbacksRef.current.delete(callback);
    };
  }, []);

  // ==================== 保存 / 丢弃 ====================

  const currentTransactionRef = useRef(currentTransaction);
  currentTransactionRef.current = currentTransaction;
  const currentChildTransactionsRef = useRef(currentChildTransactions);
  currentChildTransactionsRef.current = currentChildTransactions;
  const transactionsByIdRef = useRef(transactionsById);
  transactionsByIdRef.current = transactionsById;
  const getChildTransactionsRef = useRef(getChildTransactions);
  getChildTransactionsRef.current = getChildTransactions;

  const saveCurrentTransaction = useCallback(
    async (status?: TransactionStatus): Promise<SaveResult> => {
      // 先刷新所有 debounce 待提交值，并强制 React 同步处理所有排队的状态更新，
      // 确保 currentTransactionRef 反映最新输入（包括未提交的 debounce 值和尚未渲染的选择变更）
      flushSync(() => {
        pendingFlushCallbacksRef.current.forEach((cb) => cb());
      });

      const curTx = currentTransactionRef.current;
      const curChildren = currentChildTransactionsRef.current;
      const curAppData = appDataRef.current;
      const curStore = storeRef.current;
      if (currentId === null || !curTx) {
        return { success: false, error: "没有选中的交易" };
      }
      if (curStore.saveState === "children-selection") {
        return { success: false, error: "当前有保存操作进行中" };
      }

      try {
        // 1. 校验保存的交易及其子交易
        const validResult = isValidTransaction(curTx, curChildren, curAppData);
        const warnResult = isWarningTransaction(curTx, curChildren, curAppData);

        // 2. 计算交易的保存后状态
        let finalStatus = curTx.status ?? "待处理";
        if (curTx.status === "附加到其他交易") {
          finalStatus = "附加到其他交易";
        } else if (!validResult.valid && (status === "已完成" || status === undefined)) {
          finalStatus = "稍后处理";
        } else if (status !== undefined) {
          finalStatus = status;
        }

        // 3. 异步保存（非阻塞）；saveToServer 内部会把 updatedDraft 写入 localEdits
        const { parent_id, children_ids, ...baseDraft } = curTx;
        const updatedDraft = { ...baseDraft, status: finalStatus };
        const saveTask = curStore.saveToServer(currentId, updatedDraft);

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

        // 5. 自动切换拦截逻辑：仅"保存并完成"且存在错误/警告时拦截
        const blockAutoSwitch = !warnResult.valid && status === "已完成";
        return { success: true, validationAlert, blockAutoSwitch, txId: currentId, saveTask };
      } catch (error) {
        console.error("保存交易失败:", error);
        const errorMessage = error instanceof Error ? error.message : "未知错误";
        return { success: false, error: errorMessage };
      }
    },
    [currentId],
  );

  const discardCurrentChanges = useCallback(async () => {
    if (currentId === null) return;
    storeRef.current.discardChanges(currentId);
  }, [currentId]);

  const saveAllDirtyToServer = useCallback(
    async (
      targetStatus?: BatchSaveTargetStatus,
      targetIds?: number[],
    ): Promise<{ success: boolean; error?: string }> => {
      const curStore = storeRef.current;
      const curAppData = appDataRef.current;
      const curTxById = transactionsByIdRef.current;
      const curGetChildren = getChildTransactionsRef.current;
      if (curStore.saveState !== "idle") {
        return { success: false, error: "当前有保存操作进行中" };
      }
      // 默认遍历所有脏交易；若调用方指定了 targetIds，就以 targetIds 为准。
      const dirtyIds = curStore.getDirtyIds();
      const idsToProcess = targetIds ?? dirtyIds;
      for (const id of idsToProcess) {
        const tx = curTxById.get(id);
        if (!tx) continue;
        // 仅在默认的"保存脏修改"路径下，跳过那些父也脏的子交易（由父的 saveToServer 一并带上）。
        if (
          targetStatus === undefined &&
          targetIds === undefined &&
          tx.parent_id &&
          dirtyIds.includes(tx.parent_id)
        ) {
          continue;
        }

        const childTransactions = curGetChildren(tx);
        const validResult = isValidTransaction(tx, childTransactions, curAppData);
        let draftOverride: TransactionContentDraft | undefined;

        if (targetStatus === undefined) {
          if (!validResult.valid && tx.status === "已完成") {
            const { parent_id, children_ids, ...baseDraft } = tx;
            draftOverride = { ...baseDraft, status: "稍后处理" };
          }
        } else {
          const finalStatus =
            targetStatus === "已完成" && !validResult.valid ? "稍后处理" : targetStatus;
          const { parent_id, children_ids, ...baseDraft } = tx;
          draftOverride = { ...baseDraft, status: finalStatus };
        }

        const result = await curStore.saveToServer(id, draftOverride);
        if (!result.success) return { success: false, error: result.error };
      }
      return { success: true };
    },
    [],
  );

  // ==================== 设置过滤列表 ====================

  const setFilteredTransactions = useCallback((txs: TransactionWithRelations[]) => {
    setFilteredTxs((prev) => {
      if (prev.length === txs.length && prev.every((tx, i) => tx.id === txs[i].id)) {
        return prev;
      }
      return txs;
    });
  }, []);

  // ==================== 新建交易 ====================

  const createEmptyTransaction = useCallback(async () => {
    setIsCreatingTransaction(true);
    try {
      return await storeRef.current.createEmptyTransaction();
    } finally {
      setIsCreatingTransaction(false);
    }
  }, []);

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
      attachToParent,
      saveCurrentTransaction,
      discardCurrentChanges,
      saveAllDirtyToServer,
      validationAlert,
      setFilteredTransactions,
      registerPendingFlush,
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
      attachToParent,
      saveCurrentTransaction,
      discardCurrentChanges,
      saveAllDirtyToServer,
      validationAlert,
      setFilteredTransactions,
      registerPendingFlush,
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
