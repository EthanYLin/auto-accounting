"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@heroui/button";
import { Checkbox } from "@heroui/checkbox";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { AmountInput } from "@/components/homepage/amount-input";
import {
  PlusIcon,
  XMarkIcon,
  Bars2Icon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";
import { CheckCircleIcon as CheckCircleOutline } from "@heroicons/react/24/outline";
import { useAppData } from "@/components/context/app-data-context";
import { TRANSACTION_TYPES } from "@/constants/transaction-type";
import type { FourChainState } from "@/components/homepage/four-chain-selector";
import { CategorySelectModal } from "@/components/homepage/category-select-modal";
import type { TransactionWithRelations } from "@/types";

// ==================== 类型定义 ====================

export interface SplitEntryData {
  localId: string;
  accountId: string;
  amount: string;
  chainState: FourChainState;
  name: string;
}

interface SplitEntryAreaProps {
  currentTransaction: TransactionWithRelations | null;
}

// 类别图标展示组件（圆形底色 + emoji）
function CategoryIcon({
  icon,
  backColor,
}: {
  icon: string;
  backColor?: string;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full flex-shrink-0 w-5 h-5 text-[11px] ${backColor || "bg-gray-200 dark:bg-gray-600"}`}
    >
      {icon}
    </span>
  );
}

// ==================== 主组件 ====================

export function SplitEntryArea({ currentTransaction }: SplitEntryAreaProps) {
  const { accounts, mainCategories, subCategories, budgetTypes } = useAppData();
  const nextIdRef = useRef(1);

  const [entries, setEntries] = useState<SplitEntryData[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showName, setShowName] = useState(true);

  // 拖拽状态
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const canDragRef = useRef(false);

  // 类别 Modal 状态
  const [editingLocalId, setEditingLocalId] = useState<string | null>(null);

  // ==================== 从 splits 初始化 entries ====================

  const splits = currentTransaction?.splits;

  useEffect(() => {
    if (!splits || splits.length === 0) {
      setEntries([]);
      setSelectedIds(new Set());
      return;
    }

    const newEntries: SplitEntryData[] = splits.map((split) => ({
      localId: `db-${split.id}`,
      accountId: String(split.account.id),
      amount: Math.abs(split.amount).toFixed(2),
      chainState: {
        txType: split.transaction_type ?? undefined,
        main_id: split.main_category ? String(split.main_category.id) : undefined,
        sub_id: split.sub_category ? String(split.sub_category.id) : undefined,
        budget_id: split.budget_type ? String(split.budget_type.id) : undefined,
      },
      name: split.name ?? "",
    }));

    setEntries(newEntries);
    setSelectedIds(new Set());
    nextIdRef.current = splits.length + 1;
  }, [currentTransaction?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ==================== 操作回调 ====================

  const generateId = useCallback(() => {
    const id = `split-${nextIdRef.current}`;
    nextIdRef.current += 1;
    return id;
  }, []);

  const handleAdd = useCallback(() => {
    setEntries((prev) => [
      ...prev,
      {
        localId: generateId(),
        accountId: "",
        amount: "",
        chainState: {},
        name: "",
      },
    ]);
  }, [generateId]);

  const handleDelete = useCallback((localId: string) => {
    setEntries((prev) => prev.filter((e) => e.localId !== localId));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(localId);
      return next;
    });
  }, []);

  const handleToggleSelect = useCallback((localId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(localId)) next.delete(localId);
      else next.add(localId);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === entries.length && entries.length > 0) {
        return new Set();
      }
      return new Set(entries.map((e) => e.localId));
    });
  }, [entries]);

  const handleUpdateEntry = useCallback(
    (localId: string, field: keyof Omit<SplitEntryData, "localId">, value: unknown) => {
      setEntries((prev) =>
        prev.map((e) => (e.localId === localId ? { ...e, [field]: value } : e)),
      );
    },
    [],
  );

  // ==================== 类别 Modal ====================

  const openCategoryModal = useCallback((localId: string) => {
    setEditingLocalId(localId);
  }, []);

  const confirmCategoryModal = useCallback(
    (chainState: FourChainState) => {
      if (!editingLocalId) return;
      handleUpdateEntry(editingLocalId, "chainState", chainState);
      setEditingLocalId(null);
    },
    [editingLocalId, handleUpdateEntry],
  );

  const cancelCategoryModal = useCallback(() => {
    setEditingLocalId(null);
  }, []);

  // ==================== 类别展示辅助 ====================

  const buildCategoryDisplay = useCallback(
    (chainState: FourChainState) => {
      if (!chainState.main_id && !chainState.txType) return null;

      const main = chainState.main_id
        ? mainCategories.find((m) => String(m.id) === chainState.main_id)
        : null;
      const sub = chainState.sub_id
        ? subCategories.find((s) => String(s.id) === chainState.sub_id)
        : null;
      const budget = chainState.budget_id
        ? budgetTypes.find((b) => String(b.id) === chainState.budget_id)
        : null;
      const txTypeDef = chainState.txType
        ? TRANSACTION_TYPES.find((t) => t.type === chainState.txType)
        : null;

      const icon = sub?.icon ?? main?.icon ?? txTypeDef?.icon ?? "📋";
      const backColor = sub?.back_color ?? main?.back_color ?? txTypeDef?.back_color ?? "";
      const foreColor = sub?.fore_color ?? main?.fore_color ?? txTypeDef?.fore_color ?? "";

      const parts: string[] = [];
      if (main?.label) parts.push(main.label);
      if (sub?.label) parts.push(sub.label);

      return { icon, backColor, foreColor, label: parts.join("-") };
    },
    [mainCategories, subCategories, budgetTypes],
  );

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
    setEntries((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(dragOverIndex, 0, moved);
      return next;
    });
  };

  const handleRowDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
    canDragRef.current = false;
  };

  // ==================== 派生状态 ====================

  const allSelected = entries.length > 0 && selectedIds.size === entries.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < entries.length;

  // ==================== 渲染 ====================

  // 子交易不显示拆账区
  if (currentTransaction?.parent) return null;

  // 零状态 & 普通状态：共享标题栏 + 工具栏
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
      </div>

      {/* 数据区 */}
      {entries.length === 0 ? (
        <div className="text-xs text-gray-400 dark:text-gray-500">
          {currentTransaction?.children.length === 0 ? "暂无拆账数据" : "暂无拆账数据，将按照账户自动合并拆账"}
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
                        <span className="text-xs font-medium w-4 text-center">
                          {index + 1}
                        </span>
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
                        onClick={() => openCategoryModal(entry.localId)}
                        className="flex-1 min-w-[120px] flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors overflow-hidden"
                      >
                        {categoryDisplay ? (
                          <>
                            <CategoryIcon icon={categoryDisplay.icon} backColor={categoryDisplay.backColor} />
                            <span className={`text-[13px] font-medium truncate ${categoryDisplay.foreColor || "text-default-900"}`}>
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
                          placeholder={currentTransaction?.name ?? "名称"}
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
        initialChainState={
          entries.find((e) => e.localId === editingLocalId)?.chainState ?? {}
        }
        onConfirm={confirmCategoryModal}
        onCancel={cancelCategoryModal}
      />
    </div>
  );
}
