'use client';

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { Spinner } from '@heroui/spinner';
import { Button } from '@heroui/button';
import { CloudArrowDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { TransactionListItem } from './transaction-list-item';
import { useTransactionCache } from '@/components/context/transaction-cache-context';
import { useAppData } from '@/components/context/app-data-context';
import type { TransactionWithRelations } from '@/types';

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
  /** 将列表滚动到当前选中的交易 */
  scrollToCurrent: () => void;
}

export const TransactionOverviewList = forwardRef<TransactionOverviewListHandle, TransactionOverviewListProps>(
function TransactionOverviewList(
  {
  currentId,
  onSelectTransaction,
  filteredTransactions,
  isFiltered = false,
  onClearFilters,
}: TransactionOverviewListProps,
  ref: React.Ref<TransactionOverviewListHandle>
) {
  const { isLoading, error, loadTransactions, transactions} = useTransactionCache();
  const { isLoading: appDataLoading, hasLoaded: hasLoadedAppData } = useAppData();

  const containerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    scrollToCurrent() {
      if (currentId == null || !containerRef.current) return;
      const el = containerRef.current.querySelector(`[data-tx-id="${currentId}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
  if (isLoading) {
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
              variant="flat" 
              onPress={loadTransactions} 
              isDisabled={isLoading || appDataLoading || !hasLoadedAppData}
              startContent={<CloudArrowDownIcon className="w-4 h-4" />}
            >
              从云端加载
            </Button>
          )}
        </div>
      </div>
    );
  }

  // 渲染交易列表
  return (
    <div className="w-full" ref={containerRef}>
      {filteredTransactions.map((transaction) => {
        return (
          <div key={transaction.id} data-tx-id={transaction.id}>
            <TransactionListItem
              transaction={transaction}
              isSelected={currentId !== undefined && transaction.id === currentId}
              onClick={() => onSelectTransaction(transaction.id)}
            />
          </div>
        );
      })}
    </div>
  );
});

