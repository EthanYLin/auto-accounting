"use client";

import type { TransactionContentDraft, TransactionUpdate, TransactionWithRelations } from "@/types";
import type { SaveQueueResult, TransactionSaveState } from "../../lib/hooks/use-save-queue";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { produce } from "immer";
import { DateTime } from "luxon";

import { useSaveQueue } from "../../lib/hooks/use-save-queue";

import { useAppData } from "./app-data-context";

import {
  bulkInsertTransactionSplits,
  insertTransaction,
  getAllTransactions,
  getAllTransactionSplits,
  updateTransaction as updateTransactionAction,
  deleteTransactionSplits,
  bulkDeleteTransactions,
} from "@/app/actions/data";
import {
  buildTransactionsWithRelations,
  buildTransactionAndSplits,
  mergeContentDraft,
} from "@/lib/transaction/transaction-convert";
import {
  TRANSACTION_DATETIME_FORMAT,
  TRANSACTION_TIME_ZONE,
} from "@/lib/transaction/transaction-datetime";
export type { TransactionSaveState } from "../../lib/hooks/use-save-queue";

type SaveResult = SaveQueueResult;
type TransactionPatch = Partial<Omit<TransactionUpdate, "user_id">>;

const SAVE_BUSY_ERROR = "当前有保存操作进行中";

// ==================== 类型定义 ====================

interface TransactionStoreContextValue {
  transactions: TransactionWithRelations[];
  isFetching: boolean;
  error: string | null;
  hasLoaded: boolean;
  saveState: TransactionSaveState;

  // ==================== 服务端加载 ====================
  loadTransactions: () => Promise<void>;

  // ==================== 脏状态跟踪 ====================
  setTransactionDraft: (
    id: number,
    updater: (draft: TransactionContentDraft) => TransactionContentDraft,
  ) => void;
  isDirty: (id: number) => boolean;
  getDirtyIds: () => number[];
  discardChanges: (id: number) => void;
  discardAllChanges: () => void;

  // ==================== 持久化到服务端 ====================
  saveToServer: (id: number, draftOverride?: TransactionContentDraft) => Promise<SaveResult>;
  saveChildrenSelection: (parentId: number, selectedIds: number[]) => Promise<SaveResult>;

  // ==================== 新建与删除交易 ====================
  createEmptyTransaction: () => Promise<{
    success: boolean;
    data?: TransactionWithRelations;
    error?: string;
  }>;
  deleteTransactions: (ids: number[]) => Promise<{ success: boolean; error?: string }>;
}

const TransactionStoreContext = createContext<TransactionStoreContextValue | undefined>(undefined);

// ==================== Provider ====================

export function TransactionStoreProvider({ children }: { children: React.ReactNode }) {
  const appData = useAppData();
  const { accounts, currentUserId, hasLoaded: appDataReady } = appData;
  const queryClient = useQueryClient();

  const [localEdits, setLocalEdits] = useState<Map<number, TransactionContentDraft>>(new Map());
  const { saveState, offerSingleSave, offerExclusiveAction } = useSaveQueue();

  const localEditsRef = useRef(localEdits);
  localEditsRef.current = localEdits;

  const isDirty = useCallback((id: number) => localEditsRef.current.has(id), []);
  const getDirtyIds = useCallback(() => Array.from(localEditsRef.current.keys()), []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (localEditsRef.current.size > 0) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const canLoadTransactions = appDataReady && accounts.length > 0 && currentUserId !== null;
  const transactionQueryKey = useMemo(
    () => ["transactions-list", currentUserId] as const,
    [currentUserId],
  );

  useEffect(() => {
    setLocalEdits(new Map());
  }, [currentUserId]);

  // ==================== 从服务端读取 ====================

  const query = useQuery({
    queryKey: transactionQueryKey,
    queryFn: async () => {
      const [txRes, splitsRes] = await Promise.all([
        getAllTransactions(),
        getAllTransactionSplits(),
      ]);
      if (!txRes.success || !splitsRes.success) {
        throw new Error(txRes.error || splitsRes.error || "获取交易数据失败");
      }
      return buildTransactionsWithRelations(txRes.data || [], splitsRes.data || [], appData);
    },
    enabled: canLoadTransactions,
    staleTime: 5 * 60 * 1000,
  });

  const loadTransactions = useCallback(async () => {
    setLocalEdits(new Map());
    await queryClient.invalidateQueries({ queryKey: transactionQueryKey });
  }, [queryClient, transactionQueryKey]);

  // ==================== 合并数据 ====================

  const getBaseline = useCallback(
    (id: number): TransactionWithRelations | undefined => {
      return (queryClient.getQueryData<TransactionWithRelations[]>(transactionQueryKey) ?? []).find(
        (tx) => tx.id === id,
      );
    },
    [queryClient, transactionQueryKey],
  );

  const transactions = useMemo(() => {
    if (!canLoadTransactions) return [];
    return (query.data ?? []).map((tx) => mergeContentDraft(tx, localEdits.get(tx.id)));
  }, [canLoadTransactions, query.data, localEdits]);

  // ==================== 本地修改 ====================

  const setTransactionDraft = useCallback(
    (id: number, updater: (draft: TransactionContentDraft) => TransactionContentDraft) => {
      setLocalEdits((prev) => {
        const existing = prev.get(id);
        if (existing) return new Map(prev).set(id, updater(existing));
        const baseTx = getBaseline(id);
        if (!baseTx) return prev;
        const { parent_id, children_ids, ...baseDraft } = baseTx;

        void parent_id;
        void children_ids;

        return new Map(prev).set(id, updater(baseDraft));
      });
    },
    [getBaseline],
  );

  // ==================== 持久化到服务端 ====================

  /** 保存单条交易到服务端（更新交易 + 重建拆账） */
  const persistSingleTx = useCallback(
    async (id: number, tx: TransactionWithRelations): Promise<SaveResult> => {
      const { transaction, splits } = buildTransactionAndSplits(tx);
      const r1 = await updateTransactionAction(id, transaction);
      if (!r1.success) return { success: false, error: r1.error || `更新交易 #${id} 失败` };
      const r2 = await deleteTransactionSplits(id);
      if (!r2.success) return { success: false, error: r2.error || `删除交易 #${id} 拆账失败` };
      const r3 = await bulkInsertTransactionSplits(splits);
      if (!r3.success) return { success: false, error: r3.error || `插入交易 #${id} 拆账失败` };
      return { success: true };
    },
    [],
  );

  const clearMatchingLocalEdits = useCallback(
    (ids: number[], draftSnapshot: Map<number, TransactionContentDraft>) => {
      setLocalEdits((prev) => {
        const next = new Map(prev);
        ids.forEach((id) => {
          if (next.get(id) === draftSnapshot.get(id)) next.delete(id);
        });
        return next;
      });
    },
    [],
  );

  const saveToServer = useCallback(
    async (id: number, draftOverride?: TransactionContentDraft): Promise<SaveResult> => {
      if (saveState === "children-selection") return { success: false, error: SAVE_BUSY_ERROR };

      // 1. 计算要保存的交易与子交易
      const snapshot = new Map(localEditsRef.current);
      if (draftOverride) snapshot.set(id, draftOverride);
      const baseTx = getBaseline(id);
      if (!baseTx) return { success: false, error: "交易记录不存在" };
      const dirtyChildIds = baseTx.children_ids.filter((cid) => snapshot.has(cid));
      const idsToSave = [id, ...dirtyChildIds];
      const draftSnapshot = new Map<number, TransactionContentDraft>();
      idsToSave.forEach((txId) => {
        const draft = snapshot.get(txId);
        if (draft) draftSnapshot.set(txId, draft);
      });

      const savedTxs = new Map<number, TransactionWithRelations>();
      return offerSingleSave(async () => {
        try {
          // 2. 发送保存请求
          for (const txId of idsToSave) {
            const base = getBaseline(txId);
            if (!base) throw new Error(`交易 #${txId} 不存在`);
            const tx = mergeContentDraft(base, draftSnapshot.get(txId));
            const result = await persistSingleTx(txId, tx);
            if (!result.success) throw new Error(result.error || `保存交易 #${txId} 失败`);
            savedTxs.set(txId, tx);
          }

          // 3. 更新 Server baseline cache
          queryClient.setQueryData<TransactionWithRelations[]>(transactionQueryKey, (old) =>
            produce(old ?? [], (draft) => {
              savedTxs.forEach((tx, txId) => {
                const idx = draft.findIndex((item) => item.id === txId);
                if (idx >= 0) draft[idx] = tx;
              });
            }),
          );

          // 4. 清除本地修改
          clearMatchingLocalEdits(idsToSave, draftSnapshot);
          return { success: true };
        } catch (error) {
          console.error("保存交易失败:", error);
          clearMatchingLocalEdits(idsToSave, draftSnapshot);
          await queryClient.invalidateQueries({ queryKey: transactionQueryKey });
          return { success: false, error: error instanceof Error ? error.message : "保存交易失败" };
        }
      });
    },
    [
      clearMatchingLocalEdits,
      getBaseline,
      offerSingleSave,
      persistSingleTx,
      queryClient,
      saveState,
      transactionQueryKey,
    ],
  );

  const saveChildrenSelection = useCallback(
    async (parentId: number, selectedIds: number[]): Promise<SaveResult> => {
      if (saveState !== "idle") return { success: false, error: SAVE_BUSY_ERROR };

      const parentTx = getBaseline(parentId);
      if (!parentTx) return { success: false, error: "父交易不存在" };

      // 1. 计算变更集合: 被添加的子交易、被移除的子交易、受影响的旧父交易、旧父交易的脱挂孙交易
      const selectedSet = new Set(selectedIds);
      const removedSet = new Set(parentTx.children_ids.filter((id) => !selectedSet.has(id)));
      const addedSet = new Set(selectedIds.filter((id) => !parentTx.children_ids.includes(id)));
      if (addedSet.size === 0 && removedSet.size === 0) return { success: true };

      const oldParentSet = new Set<number>();
      const orphanedChildSet = new Set<number>();
      for (const childId of Array.from(addedSet)) {
        const child = getBaseline(childId);
        if (!child) continue;
        if (child.parent_id !== null && child.parent_id !== parentId)
          oldParentSet.add(child.parent_id);
        child.children_ids.forEach((gcId) => orphanedChildSet.add(gcId));
      }
      const affectedIds = new Set([
        parentId,
        ...Array.from(removedSet),
        ...Array.from(addedSet),
        ...Array.from(oldParentSet),
        ...Array.from(orphanedChildSet),
      ]);

      return offerExclusiveAction(async () => {
        // 2. 乐观更新 Baseline Cache
        queryClient.setQueryData<TransactionWithRelations[]>(transactionQueryKey, (old) =>
          produce(old ?? [], (draft) => {
            const draftMap = new Map(draft.map((tx) => [tx.id, tx]));
            const parent = draftMap.get(parentId);
            if (parent) {
              parent.status = "待处理";
              parent.children_ids = [...selectedIds];
            }
            removedSet.forEach((id) => {
              const tx = draftMap.get(id);
              if (tx) {
                tx.parent_id = null;
                tx.status = "待处理";
              }
            });
            oldParentSet.forEach((id) => {
              const tx = draftMap.get(id);
              if (tx) {
                tx.status = "待处理";
                tx.children_ids = tx.children_ids.filter((cid) => !addedSet.has(cid));
              }
            });
            orphanedChildSet.forEach((id) => {
              const tx = draftMap.get(id);
              if (tx) {
                tx.parent_id = null;
                tx.status = "待处理";
              }
            });
            addedSet.forEach((id) => {
              const tx = draftMap.get(id);
              if (tx) {
                tx.parent_id = parentId;
                tx.status = "附加到其他交易";
                tx.splits = [];
                tx.children_ids = [];
              }
            });
          }),
        );

        // 3. 若受影响交易存在Overlay层，更新本地 Overlay 层的 status 和 splits
        setLocalEdits((prev) => {
          const next = new Map(prev);
          next.forEach((draft, draftId) => {
            if (
              draftId === parentId ||
              removedSet.has(draftId) ||
              oldParentSet.has(draftId) ||
              orphanedChildSet.has(draftId)
            ) {
              next.set(draftId, { ...draft, status: "待处理" });
            }
            if (addedSet.has(draftId)) {
              next.set(draftId, { ...draft, status: "附加到其他交易", splits: [] });
            }
          });
          return next;
        });

        // 4. 同步到服务器
        try {
          const txUpdates = new Map<number, TransactionPatch>();
          txUpdates.set(parentId, { status: "待处理" });
          oldParentSet.forEach((id) =>
            txUpdates.set(id, { ...txUpdates.get(id), status: "待处理" }),
          );
          removedSet.forEach((id) =>
            txUpdates.set(id, { ...txUpdates.get(id), parent_id: null, status: "待处理" }),
          );
          orphanedChildSet.forEach((id) =>
            txUpdates.set(id, { ...txUpdates.get(id), parent_id: null, status: "待处理" }),
          );
          addedSet.forEach((id) =>
            txUpdates.set(id, {
              ...txUpdates.get(id),
              parent_id: parentId,
              status: "附加到其他交易",
            }),
          );

          for (const [txId, payload] of Array.from(txUpdates.entries())) {
            const r = await updateTransactionAction(txId, payload);
            if (!r.success) throw new Error(r.error || `更新交易 #${txId} 关系失败`);
          }

          for (const childId of Array.from(addedSet)) {
            const r = await deleteTransactionSplits(childId);
            if (!r.success) throw new Error(r.error || `清除交易 #${childId} 拆账失败`);
          }

          return { success: true };
        } catch (error) {
          console.error("保存父子关系失败:", error);
          setLocalEdits((prev) => {
            const next = new Map(prev);
            affectedIds.forEach((id) => next.delete(id));
            return next;
          });
          await queryClient.invalidateQueries({ queryKey: transactionQueryKey });
          return {
            success: false,
            error: error instanceof Error ? error.message : "保存父子关系失败",
          };
        }
      });
    },
    [getBaseline, offerExclusiveAction, queryClient, saveState, transactionQueryKey],
  );

  // ==================== 放弃修改 ====================
  const discardChanges = useCallback(
    (id: number) => {
      if (saveState !== "idle") return;
      setLocalEdits((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    },
    [saveState],
  );
  const discardAllChanges = useCallback(() => {
    if (saveState !== "idle") return;
    setLocalEdits(new Map());
  }, [saveState]);

  // ==================== 创建 ====================

  const createEmptyTransaction = useCallback(async () => {
    if (saveState !== "idle") return { success: false, error: SAVE_BUSY_ERROR } as const;
    if (accounts.length === 0) return { success: false, error: "暂无账户，无法新建记录" } as const;
    try {
      const result = await insertTransaction({
        account_id: accounts[0].id,
        amount: 0,
        datetime: DateTime.now()
          .setZone(TRANSACTION_TIME_ZONE)
          .toFormat(TRANSACTION_DATETIME_FORMAT),
        source: "手动新建",
        status: "待处理",
      });
      if (!result.success || !result.data)
        return { success: false, error: result.error || "新建记录失败" } as const;

      const createdTx = buildTransactionsWithRelations([result.data], [], appData)[0];
      queryClient.setQueryData<TransactionWithRelations[]>(transactionQueryKey, (old) => [
        createdTx,
        ...(old ?? []).filter((tx) => tx.id !== createdTx.id),
      ]);
      return { success: true, data: createdTx } as const;
    } catch (error) {
      console.error("新建交易记录异常:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "新建记录失败",
      } as const;
    }
  }, [accounts, appData, queryClient, saveState, transactionQueryKey]);

  // ==================== 删除 ====================

  const deleteTransactions = useCallback(
    async (ids: number[]) => {
      if (saveState !== "idle") return { success: false, error: SAVE_BUSY_ERROR } as const;
      if (ids.length === 0) return { success: true } as const;
      const idsToDelete = new Set(ids);
      const orphanedChildIds = Array.from(
        new Set(ids.flatMap((id) => getBaseline(id)?.children_ids ?? [])),
      ).filter((id) => !idsToDelete.has(id));

      try {
        // 1. 乐观更新 Baseline Cache
        queryClient.setQueryData<TransactionWithRelations[]>(transactionQueryKey, (old) =>
          produce(old ?? [], (draft) => {
            for (const tx of draft) {
              if (tx.parent_id !== null && idsToDelete.has(tx.parent_id)) {
                tx.parent_id = null;
                tx.status = "待处理";
              }
              if (tx.children_ids.some((id) => idsToDelete.has(id))) {
                tx.children_ids = tx.children_ids.filter((id) => !idsToDelete.has(id));
              }
            }
            for (let i = draft.length - 1; i >= 0; i--) {
              if (idsToDelete.has(draft[i].id)) {
                draft.splice(i, 1);
              }
            }
          }),
        );

        // 2. 若被删除的交易存在 Overlay 层，删除 Overlay 层；若被删除交易的子交易存在 Overlay 层，更新子交易的 status
        setLocalEdits((prev) => {
          const next = new Map(prev);
          for (const id of ids) next.delete(id);
          for (const childId of orphanedChildIds) {
            const draft = next.get(childId);
            if (draft) next.set(childId, { ...draft, status: "待处理" });
          }
          return next;
        });

        // 3. 同步到服务器
        for (const childId of orphanedChildIds) {
          const r = await updateTransactionAction(childId, { parent_id: null, status: "待处理" });
          if (!r.success)
            throw new Error(r.error || `父交易被删除，更新子交易 #${childId} 关系失败`);
        }
        const deleteResult = await bulkDeleteTransactions(ids);
        if (!deleteResult.success) throw new Error(deleteResult.error || "删除交易失败");

        return { success: true } as const;
      } catch (error) {
        console.error("删除交易记录异常:", error);
        // 退回到服务端数据，清除本地修改
        setLocalEdits((prev) => {
          const next = new Map(prev);
          [...ids, ...orphanedChildIds].forEach((id) => next.delete(id));
          return next;
        });
        await queryClient.invalidateQueries({ queryKey: transactionQueryKey });
        return {
          success: false,
          error: error instanceof Error ? error.message : "删除交易记录失败",
        } as const;
      }
    },
    [getBaseline, queryClient, saveState, transactionQueryKey],
  );

  // ==================== Context Value ====================

  const value: TransactionStoreContextValue = useMemo(
    () => ({
      transactions,
      isFetching: query.isFetching,
      error: query.error
        ? query.error instanceof Error
          ? query.error.message
          : "加载交易数据失败"
        : null,
      hasLoaded: query.isSuccess,
      saveState,
      isDirty,
      getDirtyIds,
      loadTransactions,
      setTransactionDraft,
      discardChanges,
      discardAllChanges,
      saveToServer,
      saveChildrenSelection,
      createEmptyTransaction,
      deleteTransactions,
    }),
    [
      transactions,
      query.isFetching,
      query.error,
      query.isSuccess,
      saveState,
      isDirty,
      getDirtyIds,
      loadTransactions,
      setTransactionDraft,
      saveToServer,
      saveChildrenSelection,
      discardChanges,
      discardAllChanges,
      createEmptyTransaction,
      deleteTransactions,
    ],
  );

  return (
    <TransactionStoreContext.Provider value={value}>{children}</TransactionStoreContext.Provider>
  );
}

// ==================== Hook ====================

export function useTransactionStore() {
  const ctx = useContext(TransactionStoreContext);
  if (!ctx) throw new Error("useTransactionStore must be used within a TransactionStoreProvider");
  return ctx;
}
