"use client";

import type { TransactionWithRelations } from "@/types";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Input, Button, Checkbox, Chip } from "@heroui/react";
import { MagnifyingGlassIcon, CheckCircleIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useVirtualizer } from "@tanstack/react-virtual";

import { ChildIndentIcon } from "@/components/icons";
import { useTransactionStore } from "@/components/context/transaction-store-context";
import {
  filterTransactionsBySearch,
  flattenTransactionsWithChildren,
} from "@/lib/hooks/use-transaction-filter";
import { TRANSACTION_STATUS_COLORS } from "@/constants/transaction-type";
import {
  calculateAmount,
  formatCategoryDisplay,
  getAmountColorClass,
} from "@/lib/transaction/transaction-display";
import { displayTxTime } from "@/lib/transaction/transaction-datetime";

interface TransactionListSelectorProps {
  selectedIds: number[]; // 当前选中的交易ID（受控）
  currentTransactionId?: number; // 当前交易ID（高亮显示且不可选）
  isDisabled?: boolean;
  onConfirm: (ids: number[]) => void | Promise<void>; // 点击完成时的回调
  /** 多选（默认）或单选 */
  selectionMode?: "multiple" | "single";
  /** 为 true 时只可选择主账单 */
  allowSelectRootRowsOnly?: boolean;
  /** 允许不选择任何项而提交 */
  allowEmptyConfirm?: boolean;
}

export function TransactionListSelector({
  selectedIds,
  currentTransactionId,
  isDisabled = false,
  onConfirm,
  selectionMode = "multiple",
  allowSelectRootRowsOnly = false,
  allowEmptyConfirm = true,
}: TransactionListSelectorProps) {
  const { transactions } = useTransactionStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [tempSelectedIds, setTempSelectedIds] = useState<number[]>(() => [...selectedIds]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

  // 300ms debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 当外部 selectedIds 变化时，同步到内部状态
  useEffect(() => {
    setTempSelectedIds([...selectedIds]);
  }, [selectedIds]);

  const orderedTransactions = useMemo(
    () => flattenTransactionsWithChildren(transactions),
    [transactions],
  );

  // 使用搜索过滤
  const filteredTransactions = useMemo(() => {
    const ids = filterTransactionsBySearch(orderedTransactions, debouncedSearchQuery);
    return orderedTransactions.filter((tx) => ids.has(tx.id));
  }, [orderedTransactions, debouncedSearchQuery]);

  const virtualizer = useVirtualizer({
    count: filteredTransactions.length,
    getScrollElement: () => scrollRef.current,
    getItemKey: (index) => filteredTransactions[index].id,
    estimateSize: (index) => (filteredTransactions[index].parent_id ? 38 : 44),
    overscan: 18,
    measureElement:
      typeof window !== "undefined" && navigator.userAgent.indexOf("Firefox") === -1
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
  });

  useEffect(() => {
    if (hasScrolledRef.current || !currentTransactionId) return;
    const index = filteredTransactions.findIndex((tx) => tx.id === currentTransactionId);
    if (index !== -1) {
      hasScrolledRef.current = true;
      requestAnimationFrame(() => {
        virtualizer.scrollToIndex(index, { align: "center" });
      });
    }
  }, [currentTransactionId, filteredTransactions, virtualizer]);

  // 切换选择状态
  const toggleSelection = useCallback(
    (id: number) => {
      // 如果是当前交易，不允许选择
      if (isDisabled || id === currentTransactionId) return;
      // 如果只允许选择主账单，则不允许选择已有 parent_id 的行
      if (allowSelectRootRowsOnly && orderedTransactions.find((t) => t.id === id)?.parent_id)
        return;

      if (selectionMode === "single") {
        // 单选模式
        setTempSelectedIds((prev) => (prev.includes(id) ? [] : [id]));
        return;
      } else {
        // 多选模式
        setTempSelectedIds((prev) =>
          prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id],
        );
      }
    },
    [isDisabled, currentTransactionId, allowSelectRootRowsOnly, orderedTransactions, selectionMode],
  );

  const handleConfirm = () => onConfirm(tempSelectedIds);
  const handleClearAndConfirm = () => onConfirm([]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isDisabled) return;
    if (!allowEmptyConfirm && tempSelectedIds.length === 0) return;
    handleConfirm();
  };

  const handleKeyDownCapture = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (isDisabled || event.nativeEvent.isComposing) return;
    if (event.key !== "Enter") return;
    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    if (event.target instanceof HTMLElement && event.target.closest("button")) return;
    if (!allowEmptyConfirm && tempSelectedIds.length === 0) return;
    event.preventDefault();
    event.currentTarget.requestSubmit();
  };

  const handleBodyScroll = useCallback(() => {
    if (headerScrollRef.current && scrollRef.current) {
      headerScrollRef.current.scrollLeft = scrollRef.current.scrollLeft;
    }
  }, []);

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <form
      className="flex flex-col w-full h-full min-h-0"
      onSubmit={handleSubmit}
      onKeyDownCapture={handleKeyDownCapture}
    >
      {/* Search */}
      <div className="w-full mb-3 flex-shrink-0">
        <Input
          placeholder="搜索交易记录..."
          value={searchQuery}
          onValueChange={setSearchQuery}
          isDisabled={isDisabled}
          isClearable
          startContent={<MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />}
          variant="bordered"
          size="sm"
          classNames={{ input: "text-base sm:text-small" }}
        />
      </div>

      {/* 表头：独立于纵向滚动，横向通过 JS 同步 */}
      <div ref={headerScrollRef} className="flex-shrink-0 min-w-0 w-full overflow-hidden">
        <div className="min-w-[774px] flex items-center border-b border-divider bg-background px-3 py-1.5 text-[11px] font-medium text-default-400">
          <span className="w-[64px] flex-shrink-0" />
          <span className="w-[80px] flex-shrink-0">ID</span>
          <span className="min-w-0 flex-1 basis-0">名称</span>
          <span className="w-[105px] flex-shrink-0">金额</span>
          <span className="w-[100px] flex-shrink-0">账户</span>
          <span className="w-[95px] flex-shrink-0">类别</span>
          <span className="w-[110px] flex-shrink-0">日期时间</span>
          <span className="w-[120px] flex-shrink-0">状态</span>
        </div>
      </div>

      {/* 表体：纵向+横向滚动，横向滚动时同步表头 */}
      <div
        ref={scrollRef}
        className="min-h-0 min-w-0 w-full flex-1 overflow-auto overscroll-contain"
        onScroll={handleBodyScroll}
      >
        {filteredTransactions.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-default-400">
            暂无交易记录
          </div>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              position: "relative",
            }}
            className="w-full min-w-[774px]"
          >
            {virtualItems.map((virtualItem) => {
              const tx = filteredTransactions[virtualItem.index];
              const isRowSelectable =
                !isDisabled &&
                tx.id !== currentTransactionId &&
                !(allowSelectRootRowsOnly && !!tx.parent_id);
              return (
                <SelectorRow
                  key={tx.id}
                  tx={tx}
                  virtualItem={virtualItem}
                  measureElement={virtualizer.measureElement}
                  isSelected={tempSelectedIds.includes(tx.id)}
                  isCurrent={tx.id === currentTransactionId}
                  isDisabled={isDisabled}
                  isRowSelectable={isRowSelectable}
                  onToggle={toggleSelection}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-divider mt-2 flex-shrink-0">
        <div className="text-sm text-primary">
          {tempSelectedIds.length > 0 && (
            <>
              已选 <span className="font-bold">{tempSelectedIds.length}</span> 项
            </>
          )}
        </div>
        <div className="flex gap-2">
          {tempSelectedIds.length > 0 && allowEmptyConfirm && (
            <Button
              type="button"
              color="danger"
              variant="light"
              size="sm"
              isDisabled={isDisabled}
              onPress={handleClearAndConfirm}
              startContent={<TrashIcon className="w-4 h-4" />}
            >
              清空
            </Button>
          )}
          <Button
            type="submit"
            color="primary"
            size="sm"
            isDisabled={isDisabled || (!allowEmptyConfirm && tempSelectedIds.length === 0)}
            onPress={handleConfirm}
            startContent={<CheckCircleIcon className="w-5 h-5" />}
          >
            完成
          </Button>
        </div>
      </div>
    </form>
  );
}

// ========== Row component ==========

interface SelectorRowProps {
  tx: TransactionWithRelations;
  virtualItem: { index: number; start: number };
  measureElement: (node: Element | null) => void;
  isSelected: boolean;
  isCurrent: boolean;
  isDisabled: boolean;
  isRowSelectable: boolean;
  onToggle: (id: number) => void;
}

const SelectorRow = React.memo(function SelectorRow({
  tx,
  virtualItem,
  measureElement,
  isSelected,
  isCurrent,
  isDisabled,
  isRowSelectable,
  onToggle,
}: SelectorRowProps) {
  const isChild = !!tx.parent_id;

  const bgClass = isCurrent
    ? "bg-success-50 dark:bg-success-900/20"
    : isSelected
      ? "bg-primary-50 dark:bg-primary-900/20"
      : isRowSelectable
        ? "hover:bg-default-100"
        : "opacity-60";

  const textClass = isChild
    ? "text-xs text-gray-500 dark:text-gray-400"
    : isCurrent
      ? "font-bold text-success-600 dark:text-success-400"
      : "";

  return (
    <div
      data-index={virtualItem.index}
      ref={measureElement}
      role="button"
      tabIndex={0}
      className={`absolute top-0 left-0 w-full min-w-[774px] flex items-center px-3 text-sm transition-colors ${bgClass} ${isCurrent || !isRowSelectable ? "cursor-not-allowed" : "cursor-pointer"} ${isChild ? "py-1.5" : "py-2"}`}
      style={{ transform: `translateY(${virtualItem.start}px)` }}
      onClick={() => {
        if (isRowSelectable) onToggle(tx.id);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (isRowSelectable) onToggle(tx.id);
        }
      }}
    >
      {/* 选择 */}
      <div className="w-[64px] flex-shrink-0 flex items-center gap-1 overflow-hidden">
        {isChild && <ChildIndentIcon className="text-gray-300 dark:text-gray-600 flex-shrink-0" />}
        <Checkbox
          isSelected={isSelected}
          onValueChange={() => onToggle(tx.id)}
          size="sm"
          isDisabled={isDisabled || isCurrent || !isRowSelectable}
          className="flex-shrink-0"
        />
      </div>

      {/* ID */}
      <div className={`w-[80px] flex-shrink-0 truncate ${textClass}`}>#{tx.id}</div>

      {/* 名称 */}
      <div className={`min-w-0 flex-1 basis-0 truncate ${textClass}`}>
        {tx.name || tx.title || "-"}
      </div>

      {/* 金额 */}
      <div
        className={`w-[105px] flex-shrink-0 truncate tabular-nums ${isChild ? "text-xs" : ""} ${isCurrent ? "font-bold" : ""} ${getAmountColorClass(tx.transaction_type)}`}
      >
        ¥{calculateAmount(tx).toFixed(2)}
      </div>

      {/* 账户 */}
      <div className={`w-[100px] flex-shrink-0 truncate ${textClass}`}>
        {tx.account?.name || "-"}
      </div>

      {/* 类别 */}
      <div className="w-[95px] flex-shrink-0 overflow-hidden">
        {(() => {
          const cat = formatCategoryDisplay(tx);
          if (!cat) return <div className={`truncate ${textClass}`}>-</div>;
          return (
            <div className={`flex items-center gap-1 overflow-hidden ${textClass}`}>
              <span
                className={`inline-flex items-center justify-center rounded-full flex-shrink-0 w-4 h-4 text-[10px] ${cat.backColor || "bg-gray-200 dark:bg-gray-600"}`}
              >
                {cat.icon}
              </span>
              <span className="truncate">{cat.label}</span>
            </div>
          );
        })()}
      </div>

      {/* 日期时间 */}
      <div className={`w-[110px] flex-shrink-0 truncate ${textClass}`}>
        {displayTxTime(tx.datetime, "short")}
      </div>

      {/* 状态 */}
      <div className="w-[120px] flex-shrink-0 overflow-hidden">
        {!isChild && tx.status && (
          <Chip
            size="sm"
            color={TRANSACTION_STATUS_COLORS[tx.status]}
            variant="flat"
            classNames={{
              base: "max-w-full",
              content: "truncate text-[11px] px-1",
            }}
          >
            {tx.status}
          </Chip>
        )}
      </div>
    </div>
  );
});
