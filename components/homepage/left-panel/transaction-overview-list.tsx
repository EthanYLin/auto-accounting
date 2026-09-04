"use client";

import type { TransactionWithRelations } from "@/types";

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Spinner } from "@heroui/react";
import { Button } from "@heroui/react";
import { CloudArrowDownIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useVirtualizer } from "@tanstack/react-virtual";

import { TransactionListItem, TRANSACTION_LIST_ROW_HEIGHT_PX } from "./transaction-list-item";

import { useTransactionStore } from "@/components/context/transaction-store-context";
import { useAppData } from "@/components/context/app-data-context";

/** 子交易达到该数量时，父交易默认折叠 */
const DEFAULT_COLLAPSE_MIN_CHILDREN = 5;

interface TransactionOverviewListProps {
  /** 当前选中的交易 ID */
  currentId?: number;
  /** 选择交易的回调 */
  onSelectTransaction: (id: number) => void;
  /** 已过滤的交易列表 */
  filteredTransactions: TransactionWithRelations[];
  /** 是否有激活的过滤条件 */
  isFiltered?: boolean;
  /** 清除过滤器的回调 */
  onClearFilters?: () => void;
}

export interface TransactionOverviewListHandle {
  /** 将列表滚动到指定交易，不传 id 则滚动到当前选中项 */
  scrollToTransaction: (targetId?: number | null) => void;
}

export const TransactionOverviewList = forwardRef<
  TransactionOverviewListHandle,
  TransactionOverviewListProps
>(function TransactionOverviewList(
  {
    currentId,
    onSelectTransaction,
    filteredTransactions,
    isFiltered = false,
    onClearFilters,
  }: TransactionOverviewListProps,
  ref: React.Ref<TransactionOverviewListHandle>,
) {
  const { isFetching, error, loadTransactions, transactions, isDirty } = useTransactionStore();
  const { isLoading: appDataLoading, hasLoaded: hasLoadedAppData } = useAppData();

  const parentRef = useRef<HTMLDivElement>(null);

  const [collapseOverrides, setCollapseOverrides] = useState<Map<number, boolean>>(() => new Map());
  const collapsedIds = useMemo(() => {
    const ids = new Set<number>();
    for (const tx of filteredTransactions) {
      if (tx.parent_id || tx.children_ids.length === 0) continue;
      const collapsed =
        collapseOverrides.get(tx.id) ?? tx.children_ids.length >= DEFAULT_COLLAPSE_MIN_CHILDREN;
      if (collapsed) ids.add(tx.id);
    }
    return ids;
  }, [filteredTransactions, collapseOverrides]);
  const collapsedIdsRef = useRef(collapsedIds);
  collapsedIdsRef.current = collapsedIds;
  const pendingScrollIdRef = useRef<number | null>(null);
  const prevCurrentIdRef = useRef(currentId);

  const visibleTransactions = useMemo(() => {
    if (collapsedIds.size === 0) return filteredTransactions;
    return filteredTransactions.filter((tx) => !tx.parent_id || !collapsedIds.has(tx.parent_id));
  }, [filteredTransactions, collapsedIds]);

  const toggleCollapsed = useCallback((parentId: number) => {
    setCollapseOverrides((prev) => {
      const next = new Map(prev);
      next.set(parentId, !collapsedIdsRef.current.has(parentId));
      return next;
    });
  }, []);

  const expandParentOf = useCallback(
    (txId: number) => {
      const tx = filteredTransactions.find((t) => t.id === txId);
      if (!tx?.parent_id || !collapsedIdsRef.current.has(tx.parent_id)) return false;
      const parentId = tx.parent_id;
      setCollapseOverrides((prev) => {
        if (prev.get(parentId) === false) return prev;
        const next = new Map(prev);
        next.set(parentId, false);
        return next;
      });
      return true;
    },
    [filteredTransactions],
  );

  // 选中项切换到被折叠的子交易时自动展开，便于定位
  useEffect(() => {
    const prevId = prevCurrentIdRef.current;
    prevCurrentIdRef.current = currentId;
    if (currentId == null || currentId === prevId) return;
    expandParentOf(currentId);
  }, [currentId, expandParentOf]);

  const virtualizer = useVirtualizer({
    count: visibleTransactions.length,
    getScrollElement: () => parentRef.current,
    getItemKey: (index) => visibleTransactions[index]?.id ?? index,
    estimateSize: () => TRANSACTION_LIST_ROW_HEIGHT_PX,
    overscan: 15,
  });

  const scrollToVisible = useCallback(
    (id: number) => {
      const index = visibleTransactions.findIndex((t) => t.id === id);
      if (index === -1) return;
      virtualizer.scrollToIndex(index, { behavior: "smooth", align: "center" });
    },
    [visibleTransactions, virtualizer],
  );

  useEffect(() => {
    const pendingId = pendingScrollIdRef.current;
    if (pendingId == null) return;
    if (visibleTransactions.some((t) => t.id === pendingId)) {
      pendingScrollIdRef.current = null;
      scrollToVisible(pendingId);
    }
  }, [visibleTransactions, scrollToVisible]);

  useImperativeHandle(ref, () => ({
    scrollToTransaction(targetId?: number | null) {
      const id = targetId ?? currentId;
      if (id == null) return;
      if (expandParentOf(id)) {
        pendingScrollIdRef.current = id;
        return;
      }
      scrollToVisible(id);
    },
  }));

  // 错误状态
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-danger text-sm mb-2">加载失败</p>
        <p className="text-xs text-gray-500 dark:text-zinc-500">{error}</p>
      </div>
    );
  }

  // 加载状态
  if (isFetching) {
    return (
      <div className="flex h-full w-full">
        <div className="m-auto">
          <Spinner size="sm" color="default" />
        </div>
      </div>
    );
  }

  // 空状态
  if (filteredTransactions.length === 0) {
    return (
      <div className="flex h-full w-full">
        <div className="m-auto flex flex-col items-center justify-center text-center gap-3">
          <p className="text-sm text-gray-500 dark:text-zinc-500">暂无交易记录</p>
          {isFiltered && transactions.length > 0 ? (
            <Button
              size="sm"
              color="default"
              variant="flat"
              onPress={onClearFilters}
              startContent={<XMarkIcon className="w-4 h-4" />}
            >
              清除过滤器
            </Button>
          ) : (
            <Button
              size="sm"
              color="default"
              variant="light"
              onPress={loadTransactions}
              isLoading={isFetching}
              isDisabled={isFetching || appDataLoading || !hasLoadedAppData}
              startContent={<CloudArrowDownIcon className="w-4 h-4" />}
            >
              从云端加载
            </Button>
          )}
        </div>
      </div>
    );
  }

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div ref={parentRef} className="h-full w-full overflow-y-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualItems.map((virtualItem) => {
          const transaction = visibleTransactions[virtualItem.index];
          if (!transaction) return null;

          const isCollapsed = collapsedIds.has(transaction.id);
          const isSelected =
            currentId !== undefined &&
            (transaction.id === currentId ||
              (isCollapsed && transaction.children_ids.includes(currentId)));

          return (
            <div
              key={transaction.id}
              data-index={virtualItem.index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <TransactionListItem
                transaction={transaction}
                isSelected={isSelected}
                isDirty={isDirty(transaction.id)}
                isCollapsed={isCollapsed}
                onSelect={onSelectTransaction}
                onToggleCollapse={toggleCollapsed}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
});
