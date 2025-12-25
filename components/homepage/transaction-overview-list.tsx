'use client';

import React, { useMemo } from 'react';
import { Spinner } from '@heroui/spinner';
import { TransactionListItem } from './transaction-list-item';
import { useTransactionCache } from '@/components/context/transaction-cache-context';
import { filterTransactionsBySearch } from '@/lib/utils/transaction-search';
import type { TransactionStatus } from '@/types';

interface TransactionOverviewListProps {
  currentId: number;
  onSelectTransaction: (id: number) => void;
  statusFilter?: TransactionStatus | 'all';
  searchQuery?: string;
}

export function TransactionOverviewList({
  currentId,
  onSelectTransaction,
  statusFilter = 'all',
  searchQuery = '',
}: TransactionOverviewListProps) {
  const { transactions, isLoading, error } = useTransactionCache();
  
  // 先应用搜索过滤，再应用状态过滤
  const filteredTransactions = useMemo(() => {
    // 1. 搜索过滤
    let result = filterTransactionsBySearch(transactions, searchQuery);
    
    // 2. 状态过滤
    if (statusFilter !== 'all') {
      result = result.filter(tx => tx.status === statusFilter);
    }
    
    return result;
  }, [transactions, searchQuery, statusFilter]);

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
      <div className="flex items-center justify-center p-8">
        <Spinner size="sm" />
      </div>
    );
  }

  // 空状态
  if (filteredTransactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">暂无交易记录</p>
      </div>
    );
  }

  // 渲染交易列表
  return (
    <div className="w-full">
      {filteredTransactions.map((transaction) => {
        const childrenCount = transactions.filter(tx => tx.parent_id === transaction.id).length;
        
        return (
          <TransactionListItem
            key={transaction.id}
            transaction={transaction}
            isSelected={transaction.id === currentId}
            childrenCount={childrenCount}
            onClick={() => onSelectTransaction(transaction.id)}
          />
        );
      })}
    </div>
  );
}

