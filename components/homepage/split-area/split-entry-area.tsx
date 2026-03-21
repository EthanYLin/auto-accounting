"use client";

import type { SplitEntryData } from "@/components/homepage/split-area/split-entry-editor";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Button } from "@heroui/react";
import { PlusIcon, EyeIcon, EyeSlashIcon, InboxArrowDownIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";
import { CheckCircleIcon as CheckCircleOutline } from "@heroicons/react/24/outline";

import {
  SplitEntryDialogs,
  type SplitDialogKey,
} from "@/components/homepage/split-area/split-entry-dialogs";
import { SplitEntryEditor } from "@/components/homepage/split-area/split-entry-editor";
import {
  getAvailableActions,
  type SplitActionKey,
  type SplitActionPayload,
} from "@/lib/split-actions";
import { useAppData } from "@/components/context/app-data-context";
import { useTransactionEditor } from "@/components/context/transaction-editor-context";
import { txSplitsToEntries, entriesToTxSplits } from "@/lib/transaction/transaction-convert";
import { getDefaultSplit } from "@/lib/transaction/transaction-split-merge";

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

  const lastLocalSignatureRef = useRef("[]");
  const [entries, setEntries] = useState<SplitEntryData[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showName, setShowName] = useState(false);
  const [activeDialog, setActiveDialog] = useState<SplitDialogKey | null>(null);
  const txEntries = useMemo(() => txSplitsToEntries(tx?.splits), [tx?.splits]);
  const txEntriesSignature = useMemo(() => getEntriesSignature(txEntries), [txEntries]);

  // 切换交易时，直接用当前交易的拆账初始化本地 UI 状态。
  useEffect(() => {
    lastLocalSignatureRef.current = txEntriesSignature;
    setEntries(txEntries);
    setSelectedIds(new Set());
    setShowName(tx?.splits?.some((s) => s.name && s.name.trim() !== "") ?? false);
    setActiveDialog(null);
  }, [editor.currentId, selectedTransactionId]);

  // 同一条交易下，如果 store 中的拆账内容和本地签名不一致，说明发生了外部回滚，同步回本地 entries。
  useEffect(() => {
    if (!tx) return;
    if (txEntriesSignature === lastLocalSignatureRef.current) return;
    lastLocalSignatureRef.current = txEntriesSignature;
    setEntries(txEntries);
    setSelectedIds(new Set());
    setShowName(txEntries.some((entry) => entry.name.trim() !== ""));
    setActiveDialog(null);
  }, [tx, txEntries, txEntriesSignature]);

  // ==================== 派生状态 ====================

  const allSelected = entries.length > 0 && selectedIds.size === entries.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < entries.length;

  /**
   * 当前交易没有分账时，默认将入口交易作为出口，方便用户直接选择分账方式。
   * 当前交易有分账时，defaultEntries为空。
   */
  const defaultEntries = useMemo(() => {
    if (entries.length > 0 || !tx) return null;
    return txSplitsToEntries([getDefaultSplit(tx), ...childTransactions.map(getDefaultSplit)]);
  }, [entries.length, tx, childTransactions]);

  const availableActions = useMemo(() => {
    const currentEntries = defaultEntries ?? entries;
    const currentSelectedIds = defaultEntries
      ? new Set(currentEntries.map((e) => e.localId))
      : selectedIds;
    return getAvailableActions(currentEntries, currentSelectedIds);
  }, [entries, selectedIds, defaultEntries]);

  const selectedEntries = useMemo(() => {
    if (defaultEntries) return defaultEntries;
    return entries.filter((entry) => selectedIds.has(entry.localId));
  }, [entries, selectedIds, defaultEntries]);

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
    handleEntriesChange([
      ...entries,
      {
        localId: getNextLocalId(entries),
        accountId: appData.accounts[0]?.id.toString() ?? "",
        amount: "",
        chainState: {},
        name: "",
      },
    ]);
  }, [entries, handleEntriesChange, appData.accounts]);

  const replaceSelectedEntries = useCallback(
    (nextSelectedEntries: SplitEntryData[]) => {
      const unselectedEntries = entries.filter((entry) => !selectedIds.has(entry.localId));
      const nextEntries = [...unselectedEntries, ...nextSelectedEntries];
      handleEntriesChange(nextEntries);
      setSelectedIds(new Set());
    },
    [entries, selectedIds, handleEntriesChange],
  );

  const handleActionPress = useCallback(
    (actionKey: SplitActionKey) => {
      const action = availableActions.find((a) => a.key === actionKey);
      if (!action) return;
      const nextLocalId = getNextLocalId(defaultEntries ?? entries);
      switch (actionKey) {
        case "merge": {
          const updatedSelectedEntries = action.split(selectedEntries, nextLocalId);
          replaceSelectedEntries(updatedSelectedEntries);
          break;
        }
        default:
          setActiveDialog(actionKey);
          break;
      }
    },
    [availableActions, entries, defaultEntries, replaceSelectedEntries, selectedEntries],
  );

  const handleDialogSubmit = useCallback(
    (payload: SplitActionPayload) => {
      setActiveDialog(null);
      const nextLocalId = getNextLocalId(defaultEntries ?? entries);
      const action = availableActions.find((item) => item.key === payload.actionKey);
      if (!action) return;
      const updatedSelectedEntries = action.split(selectedEntries, nextLocalId, payload);
      replaceSelectedEntries(updatedSelectedEntries);
    },
    [availableActions, entries, defaultEntries, replaceSelectedEntries, selectedEntries],
  );

  const handleDialogClose = useCallback(() => {
    setActiveDialog(null);
  }, []);

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

        {entries.length === 0 && (
          <Button
            size="sm"
            variant="flat"
            color={availableActions.length > 0 ? "default" : "primary"}
            startContent={<InboxArrowDownIcon className="w-3.5 h-3.5" />}
            onPress={() => replaceSelectedEntries(selectedEntries)}
          >
            打开分账
          </Button>
        )}

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
                    onPress={() => handleActionPress(action.key)}
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
        placeholderName={tx?.name ?? undefined}
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        showName={showName}
      />

      {tx ? (
        <SplitEntryDialogs
          activeDialog={activeDialog}
          rootTransaction={tx}
          selectedEntries={selectedEntries}
          onSubmit={handleDialogSubmit}
          onClose={handleDialogClose}
        />
      ) : null}
    </div>
  );
}
