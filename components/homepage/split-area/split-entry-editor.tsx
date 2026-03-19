"use client";

import type { FourChainState } from "@/components/homepage/common/four-chain-selector";

import { useState, useRef } from "react";
import { Button } from "@heroui/react";
import { Checkbox } from "@heroui/react";
import { Input } from "@heroui/react";
import { Select, SelectItem } from "@heroui/react";
import { XMarkIcon, Bars2Icon } from "@heroicons/react/24/outline";

import { AmountInput } from "@/components/homepage/common/amount-input";
import { useAppData } from "@/components/context/app-data-context";
import { TRANSACTION_TYPES } from "@/constants/transaction-type";
import { CategorySelectModal } from "@/components/homepage/split-area/category-select-modal";

// ==================== 类型定义 ====================

export interface SplitEntryData {
  localId: number;
  accountId: string;
  amount: string;
  chainState: FourChainState;
  name: string;
}

export interface SplitEntryEditorProps {
  /** 条目列表（受控） */
  entries: SplitEntryData[];
  /** 条目变化回调（受控） */
  onEntriesChange: (entries: SplitEntryData[]) => void;
  /** 名称输入框的 placeholder */
  placeholderName?: string;
  /** 无数据时的提示文案 */
  emptyMessage?: string;
  /** 无数据时的主按钮文案 */
  emptyActionLabel?: string;
  /** 无数据时的主按钮回调 */
  onEmptyAction?: () => void;
  /** 当前选中 ID 集合（受控） */
  selectedIds: Set<number>;
  /** 选中状态变化回调（受控） */
  onSelectedIdsChange: (ids: Set<number>) => void;
  /** 是否显示名称列（受控） */
  showName: boolean;
}

// 类别图标展示组件（圆形底色 + emoji）
function CategoryIcon({ icon, backColor }: { icon: string; backColor?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full flex-shrink-0 w-5 h-5 text-[11px] ${backColor || "bg-gray-200 dark:bg-gray-600"}`}
    >
      {icon}
    </span>
  );
}

// ==================== 主组件 ====================

export function SplitEntryEditor({
  entries,
  onEntriesChange,
  placeholderName,
  emptyMessage = "暂无拆账记录",
  emptyActionLabel,
  onEmptyAction,
  selectedIds,
  onSelectedIdsChange,
  showName,
}: SplitEntryEditorProps) {
  const { accounts, mainCategories, subCategories } = useAppData();

  // 拖拽状态
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const canDragRef = useRef(false);

  // 类别 Modal 状态
  const [editingLocalId, setEditingLocalId] = useState<number | null>(null);

  // ==================== 操作回调 ====================

  const handleDelete = (localId: number) => {
    onEntriesChange(entries.filter((e) => e.localId !== localId));
    const next = new Set(selectedIds);
    next.delete(localId);
    onSelectedIdsChange(next);
  };

  const handleToggleSelect = (localId: number) => {
    const next = new Set(selectedIds);
    if (next.has(localId)) next.delete(localId);
    else next.add(localId);
    onSelectedIdsChange(next);
  };

  const handleUpdateEntry = (
    localId: number,
    field: keyof Omit<SplitEntryData, "localId">,
    value: unknown,
  ) => {
    onEntriesChange(entries.map((e) => (e.localId === localId ? { ...e, [field]: value } : e)));
  };

  // ==================== 类别 Modal ====================

  const openCategoryModal = (localId: number) => {
    setEditingLocalId(localId);
  };

  const confirmCategoryModal = (chainState: FourChainState) => {
    if (editingLocalId === null) return;
    handleUpdateEntry(editingLocalId, "chainState", chainState);
    setEditingLocalId(null);
  };

  const cancelCategoryModal = () => {
    setEditingLocalId(null);
  };

  // ==================== 类别展示辅助 ====================

  const buildCategoryDisplay = (chainState: FourChainState) => {
    if (!chainState.main_id && !chainState.txType) return null;

    const main = chainState.main_id
      ? mainCategories.find((m) => String(m.id) === chainState.main_id)
      : null;
    const sub = chainState.sub_id
      ? subCategories.find((s) => String(s.id) === chainState.sub_id)
      : null;
    const txType = chainState.txType
      ? TRANSACTION_TYPES.find((t) => t.type === chainState.txType)
      : null;

    const icon = sub?.icon ?? main?.icon ?? txType?.icon ?? "📋";
    const backColor = sub?.back_color ?? main?.back_color ?? txType?.back_color ?? "";
    const foreColor = sub?.fore_color ?? main?.fore_color ?? txType?.fore_color ?? "";

    const parts: string[] = [];
    if (main?.label) parts.push(main.label);
    if (sub?.label) parts.push(sub.label);

    return { icon, backColor, foreColor, label: parts.join("-") };
  };

  // ==================== 拖拽排序 ====================

  const handleHandlePointerDown = () => {
    canDragRef.current = true;
  };

  const handleRowDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    if (!canDragRef.current) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = "move";
    requestAnimationFrame(() => setDragIndex(index));
  };

  const handleRowDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragIndex === null || index === dragOverIndex) return;
    setDragOverIndex(index);
  };

  const handleRowDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (dragIndex === null || dragOverIndex === null || dragIndex === dragOverIndex) return;
    const next = [...entries];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(dragOverIndex, 0, moved);
    onEntriesChange(next);
  };

  const handleRowDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
    canDragRef.current = false;
  };

  // ==================== 渲染 ====================

  return (
    <div>
      {/* 数据区 */}
      {entries.length === 0 ? (
        <div className="flex flex-col items-start gap-2 px-1 py-1">
          <div className="text-xs text-gray-400 dark:text-gray-500">{emptyMessage}</div>
          {emptyActionLabel && onEmptyAction ? (
            <Button size="sm" color="primary" onPress={onEmptyAction}>
              {emptyActionLabel}
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-1.5">
          {entries.map((entry, index) => {
            const isDragging = dragIndex === index;
            const isOver = dragOverIndex === index && dragIndex !== index;
            const categoryDisplay = buildCategoryDisplay(entry.chainState);

            return (
              <div
                key={entry.localId}
                draggable
                onDragStart={(e) => handleRowDragStart(e, index)}
                onDragOver={(e) => handleRowDragOver(e, index)}
                onDrop={handleRowDrop}
                onDragEnd={handleRowDragEnd}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all
                          ${isDragging ? "opacity-40 bg-gray-100 dark:bg-gray-700" : "bg-gray-50 dark:bg-gray-800/50"}
                          ${isOver ? "ring-2 ring-blue-400 ring-offset-1 dark:ring-offset-gray-900" : ""}
                        `}
              >
                {/* 拖动柄 + 序号 */}
                <div
                  onPointerDown={handleHandlePointerDown}
                  className="flex items-center gap-1 flex-shrink-0 w-[38px] cursor-grab active:cursor-grabbing text-gray-400 dark:text-gray-500 select-none"
                >
                  <Bars2Icon className="w-4 h-4" />
                  <span className="text-xs font-medium w-4 text-center">{index + 1}</span>
                </div>

                {/* 勾选框 */}
                <Checkbox
                  size="sm"
                  isSelected={selectedIds.has(entry.localId)}
                  onValueChange={() => handleToggleSelect(entry.localId)}
                  className="flex-shrink-0"
                />

                {/* 账户下拉框 */}
                <Select
                  aria-label="账户"
                  placeholder="账户"
                  selectedKeys={entry.accountId ? [entry.accountId] : []}
                  onSelectionChange={(keys) => {
                    const key = Array.from(keys)[0] as string;
                    handleUpdateEntry(entry.localId, "accountId", key || "");
                  }}
                  size="sm"
                  variant="underlined"
                  className="w-36 flex-shrink-0"
                  classNames={{ value: "text-[13px]", trigger: "min-h-8" }}
                >
                  {accounts.map((account) => (
                    <SelectItem key={account.id.toString()}>{account.name}</SelectItem>
                  ))}
                </Select>

                {/* 金额输入框 */}
                <div className="w-28 flex-shrink-0">
                  <AmountInput
                    value={entry.amount}
                    onChange={(v) => handleUpdateEntry(entry.localId, "amount", v)}
                    transactionType={entry.chainState.txType}
                    textSize="text-sm"
                    minHeight="min-h-[36px]"
                    className="h-full"
                  />
                </div>

                {/* 类别展示 */}
                <div
                  className="flex-1 min-w-[120px] flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors overflow-hidden"
                  role="button"
                  tabIndex={0}
                  onClick={() => openCategoryModal(entry.localId)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openCategoryModal(entry.localId);
                    }
                  }}
                >
                  {categoryDisplay ? (
                    <>
                      <CategoryIcon
                        icon={categoryDisplay.icon}
                        backColor={categoryDisplay.backColor}
                      />
                      <span
                        className={`text-[13px] font-medium truncate ${categoryDisplay.foreColor || "text-default-900"}`}
                      >
                        {categoryDisplay.label}
                      </span>
                    </>
                  ) : (
                    <span className="text-[13px] text-gray-400 dark:text-gray-500">
                      点击选择类别
                    </span>
                  )}
                </div>

                {/* 名称输入框 */}
                {showName && (
                  <Input
                    aria-label="名称"
                    placeholder={placeholderName ?? "名称"}
                    value={entry.name}
                    onValueChange={(v) => handleUpdateEntry(entry.localId, "name", v)}
                    size="sm"
                    variant="underlined"
                    className="w-36 flex-shrink-0"
                    classNames={{ input: "text-[13px]" }}
                  />
                )}

                {/* 删除按钮 */}
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  color="danger"
                  onPress={() => handleDelete(entry.localId)}
                  aria-label="删除"
                  className="flex-shrink-0"
                >
                  <XMarkIcon className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* 类别选择 Modal */}
      <CategorySelectModal
        key={editingLocalId ?? "__closed"}
        isOpen={editingLocalId !== null}
        initialChainState={entries.find((e) => e.localId === editingLocalId)?.chainState ?? {}}
        onConfirm={confirmCategoryModal}
        onCancel={cancelCategoryModal}
      />
    </div>
  );
}
