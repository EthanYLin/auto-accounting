"use client";

import type { SplitEntryData } from "@/components/homepage/split-area/split-entry-editor";

import { useRef, useState, useMemo, useCallback, useEffect } from "react";
import { Button } from "@heroui/react";
import { PlusIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";
import { CheckCircleIcon as CheckCircleOutline } from "@heroicons/react/24/outline";

import { SplitEntryEditor } from "@/components/homepage/split-area/split-entry-editor";
import { getAvailableActions } from "@/lib/split-actions";
import { useAppData } from "@/components/context/app-data-context";
import { useTransactionEditor } from "@/components/context/transaction-editor-context";
import { txSplitsToEntries, entriesToTxSplits } from "@/lib/transaction/transaction-convert";
import { defaultMerge, getExitSplits } from "@/lib/transaction/transaction-split-merge";

// ==================== 主组件 ====================

/**
 * 生成 entries 的签名字符串，用于判断 store 中的拆账内容是否发生了外部回滚。
 */
function getEntriesSignature(entries: SplitEntryData[]): string {
  return JSON.stringify(
    entries.map(({ accountId, amount, name, chainState }) => ({
      accountId,
      amount,
      name,
      txType: chainState.txType ?? null,
      main_id: chainState.main_id ?? null,
      sub_id: chainState.sub_id ?? null,
      budget_id: chainState.budget_id ?? null,
    })),
  );
}

function getNextLocalId(entries: SplitEntryData[]): number {
  return entries.reduce((maxId, entry) => Math.max(maxId, entry.localId), 0) + 1;
}

export function SplitEntryArea() {
  const editor = useTransactionEditor();
  const appData = useAppData();
  const tx = editor.currentTransaction;
  const childTransactions = editor.currentChildTransactions;
  const selectedTransactionId = tx?.id ?? null;

  const nextIdRef = useRef(1);
  const lastLocalSignatureRef = useRef("[]");
  const [entries, setEntries] = useState<SplitEntryData[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showName, setShowName] = useState(false);
  const txEntries = useMemo(() => txSplitsToEntries(tx?.splits), [tx?.splits]);
  const txEntriesSignature = useMemo(() => getEntriesSignature(txEntries), [txEntries]);
  const canMergeByDefault = useMemo(() => {
    if (!tx || tx.children_ids.length === 0) return false;
    return getExitSplits(tx, childTransactions).length !== 0;
  }, [tx, childTransactions]);

  // 切换交易时，直接用当前交易的拆账初始化本地 UI 状态。
  useEffect(() => {
    lastLocalSignatureRef.current = txEntriesSignature;
    nextIdRef.current = getNextLocalId(txEntries);
    setEntries(txEntries);
    setSelectedIds(new Set());
    setShowName(tx?.splits?.some((s) => s.name && s.name.trim() !== "") ?? false);
  }, [editor.currentId, selectedTransactionId]);

  // 同一条交易下，如果 store 中的拆账内容和本地签名不一致，说明发生了外部回滚，同步回本地 entries。
  useEffect(() => {
    if (!tx) return;
    if (txEntriesSignature === lastLocalSignatureRef.current) return;
    lastLocalSignatureRef.current = txEntriesSignature;
    nextIdRef.current = getNextLocalId(txEntries);
    setEntries(txEntries);
    setSelectedIds(new Set());
    setShowName(txEntries.some((entry) => entry.name.trim() !== ""));
  }, [tx, txEntries, txEntriesSignature]);

  // ==================== 派生状态 ====================

  const allSelected = entries.length > 0 && selectedIds.size === entries.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < entries.length;

  const availableActions = useMemo(
    () => getAvailableActions(entries, selectedIds),
    [entries, selectedIds],
  );

  // ==================== 工具栏回调 ====================

  const handleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === entries.length && entries.length > 0) return new Set();
      return new Set(entries.map((e) => e.localId));
    });
  }, [entries]);

  // entries 变更时同步回 store
  const handleEntriesChange = useCallback(
    (newEntries: SplitEntryData[]) => {
      lastLocalSignatureRef.current = getEntriesSignature(newEntries);
      setEntries(newEntries);
      if (!tx) return;
      const splits = entriesToTxSplits(newEntries, appData, tx.user_id);
      editor.updateSplits(splits);
    },
    [tx, appData, editor],
  );

  const handleAdd = useCallback(() => {
    const id = nextIdRef.current++;
    handleEntriesChange([
      ...entries,
      {
        localId: id,
        accountId: appData.accounts[0]?.id.toString() ?? "",
        amount: "",
        chainState: {},
        name: "",
      },
    ]);
  }, [entries, handleEntriesChange, appData.accounts]);

  const handleDefaultMerge = useCallback(() => {
    if (!tx) return;
    const defaultMergedSplits = defaultMerge(tx, childTransactions);
    editor.updateSplits(defaultMergedSplits);
  }, [tx, childTransactions, editor]);

  const handleActionSplit = useCallback(
    (actionKey: string) => {
      const action = availableActions.find((a) => a.key === actionKey);
      if (!action || !action.split) return;
      const selectedEntries = entries.filter((e) => selectedIds.has(e.localId));
      const unselectedEntries = entries.filter((e) => !selectedIds.has(e.localId));
      const newSelectedEntries = action.split(selectedEntries);
      const newEntries = [...unselectedEntries, ...newSelectedEntries];
      handleEntriesChange(newEntries);
      setSelectedIds(new Set());
    },
    [availableActions, entries, selectedIds, handleEntriesChange],
  );

  // ==================== 渲染 ====================

  return (
    <div>
      {/* 工具栏 */}
      <div className="flex items-center gap-1 mb-3">
        {/* 全选按钮 */}
        <Button
          isIconOnly
          size="sm"
          variant="light"
          onPress={handleSelectAll}
          isDisabled={entries.length === 0}
          aria-label={allSelected ? "取消全选" : "全选"}
          title={allSelected ? "取消全选" : "全选"}
        >
          {allSelected ? (
            <CheckCircleSolid className="w-5 h-5 text-primary" />
          ) : someSelected ? (
            <CheckCircleOutline className="w-5 h-5 text-default-800" />
          ) : (
            <CheckCircleOutline className="w-5 h-5 text-default-400" />
          )}
        </Button>
        {/* 名称列显隐 */}
        <Button
          isIconOnly
          size="sm"
          variant="light"
          onPress={() => setShowName((v) => !v)}
          aria-label={showName ? "隐藏名称列" : "显示名称列"}
          title={showName ? "隐藏名称列" : "显示名称列"}
        >
          {showName ? <EyeIcon className="w-4 h-4" /> : <EyeSlashIcon className="w-4 h-4" />}
        </Button>
        {/* 增加 */}
        <Button
          size="sm"
          variant="flat"
          startContent={<PlusIcon className="w-3.5 h-3.5" />}
          onPress={handleAdd}
        >
          增加
        </Button>

        {/* 操作按钮组（可横向滚动） */}
        {availableActions.length > 0 && (
          <div className="ml-2 flex-1 min-w-0 overflow-x-auto">
            <div className="flex items-center gap-1 w-max">
              {availableActions.map((action) => {
                const ActionIcon = action.icon;
                return (
                  <Button
                    key={action.key}
                    size="sm"
                    variant={action.variant ?? "flat"}
                    color={action.color ?? "default"}
                    className="flex-shrink-0 whitespace-nowrap"
                    startContent={
                      ActionIcon ? <ActionIcon className="w-3.5 h-3.5 flex-shrink-0" /> : undefined
                    }
                    onPress={() => handleActionSplit(action.key)}
                  >
                    {action.label}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 数据区 */}
      <SplitEntryEditor
        entries={entries}
        onEntriesChange={handleEntriesChange}
        emptyMessage="暂无拆账记录"
        emptyActionLabel={canMergeByDefault ? "按默认方式合并" : undefined}
        onEmptyAction={canMergeByDefault ? handleDefaultMerge : undefined}
        placeholderName={tx?.name ?? undefined}
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        showName={showName}
      />
    </div>
  );
}
