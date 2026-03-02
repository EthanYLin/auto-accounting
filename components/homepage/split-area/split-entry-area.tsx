"use client";

import { useRef, useState, useMemo, useCallback, useEffect } from "react";
import { Button } from "@heroui/button";
import {
  PlusIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";
import { CheckCircleIcon as CheckCircleOutline } from "@heroicons/react/24/outline";
import { SplitEntryEditor } from "@/components/homepage/split-area/split-entry-editor";
import type { SplitEntryData } from "@/components/homepage/split-area/split-entry-editor";
import { getAvailableActions } from "@/lib/split-actions";
import type { TransactionWithRelations } from "@/types";
import { useAppData } from "@/components/context/app-data-context";

interface SplitEntryAreaProps {
  currentTransaction: TransactionWithRelations;
  entries: SplitEntryData[];
  onEntriesChange: (entries: SplitEntryData[]) => void;
}

// ==================== 主组件 ====================

export function SplitEntryArea({ currentTransaction, entries, onEntriesChange }: SplitEntryAreaProps) {
  const nextIdRef = useRef(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showName, setShowName] = useState(false);
  const { accounts } = useAppData();

  // currentTransaction 切换时重置工具栏状态
  useEffect(() => {
    setSelectedIds(new Set());
    setShowName(currentTransaction.splits?.some((s) => s.name && s.name.trim() !== "") ?? false);
  }, [currentTransaction]);

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

  const handleAdd = useCallback(() => {
    const id = `split-${nextIdRef.current++}`;
    onEntriesChange([
      ...entries,
      { localId: id, accountId: accounts[0]?.id.toString() ?? "", amount: "", chainState: {}, name: "" },
    ]);
  }, [entries, onEntriesChange]);

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
          {showName ? (
            <EyeIcon className="w-4 h-4" />
          ) : (
            <EyeSlashIcon className="w-4 h-4" />
          )}
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
                      ActionIcon
                        ? <ActionIcon className="w-3.5 h-3.5 flex-shrink-0" />
                        : undefined
                    }
                    onPress={() => {
                      // TODO: 按钮点击逻辑
                    }}
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
        onEntriesChange={onEntriesChange}
        placeholderName={currentTransaction.name ?? undefined}
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        showName={showName}
      />
    </div>
  );
}
