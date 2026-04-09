"use client";

import type { TransactionWithRelations } from "@/types";

import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { Spinner } from "@heroui/react";
import { Button } from "@heroui/react";
import { CloudArrowDownIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useVirtualizer } from "@tanstack/react-virtual";

import { TransactionListItem } from "./transaction-list-item";

import { useTransactionStore } from "@/components/context/transaction-store-context";
import { useAppData } from "@/components/context/app-data-context";

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

  const virtualizer = useVirtualizer({
    count: filteredTransactions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 73,
    overscan: 8,
    measureElement:
      typeof window !== "undefined" && navigator.userAgent.indexOf("Firefox") === -1
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
  });

  useImperativeHandle(ref, () => ({
    scrollToTransaction(targetId?: number | null) {
      const id = targetId ?? currentId;
      if (id == null) return;
      const index = filteredTransactions.findIndex((t) => t.id === id);
      if (index === -1) return;
      virtualizer.scrollToIndex(index, { behavior: "smooth", align: "center" });
    },
  }));

  // 错误状态
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-danger text-sm mb-2">加载失败</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{error}</p>
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
          <p className="text-sm text-gray-500 dark:text-gray-400">暂无交易记录</p>
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

  // 渲染虚拟化交易列表
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
          const transaction = filteredTransactions[virtualItem.index];

          return (
            <div
              key={transaction.id}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
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
                isSelected={currentId !== undefined && transaction.id === currentId}
                isDirty={isDirty(transaction.id)}
                onSelect={onSelectTransaction}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
});
