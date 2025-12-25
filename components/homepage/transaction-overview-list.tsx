'use client';

import React, { useMemo } from 'react';
import { Spinner } from '@heroui/spinner';
import { TransactionListItem } from './transaction-list-item';
import { useTransactionCache } from '@/components/context/transaction-cache-context';
import { filterTransactionsBySearch } from '@/lib/utils/transaction-search';
import type { TransactionStatus, TransactionWithRelations } from '@/types';

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
  
  // 将扁平结构组织为列表（根交易按时间排序，子交易跟在父交易后面）
  const flatTransactions = useMemo(() => {
    const result: TransactionWithRelations[] = [];
    
    // 获取所有根记录（没有 parent_id 的记录）并按时间倒序排序
    const rootTransactions = transactions
      .filter(tx => !tx.parent_id)
      .sort((a, b) => {
        const dateA = a.datetime ? new Date(a.datetime).getTime() : 0;
        const dateB = b.datetime ? new Date(b.datetime).getTime() : 0;
        return dateB - dateA; // 新的在前
      });
    
    rootTransactions.forEach(parent => {
      // 添加父记录
      result.push(parent);
      
      // 直接使用 children 属性（保持原有顺序）
      parent.children.forEach(child => {
        result.push(child);
      });
    });
    
    return result;
  }, [transactions]);
  
  // 先应用搜索过滤，再应用状态过滤
  const filteredTransactions = useMemo(() => {
    let result = flatTransactions;
    
    // 1. 搜索过滤
    if (searchQuery.trim()) {
      // 先使用原有的搜索逻辑找出匹配的交易
      const matched = filterTransactionsBySearch(flatTransactions, searchQuery);
      const matchedIds = new Set(matched.map(tx => tx.id));
      
      // 找出所有匹配的父记录，并将其子记录也加入匹配集合
      matched.forEach(tx => {
        if (!tx.parent_id && tx.children.length > 0) {
          tx.children.forEach(child => matchedIds.add(child.id));
        }
      });
      
      // 过滤：交易本身匹配 或 其父记录匹配
      result = flatTransactions.filter(tx => {
        if (matchedIds.has(tx.id)) return true;
        if (tx.parent_id && matchedIds.has(tx.parent_id)) return true;
        return false;
      });
    }
    
    // 2. 状态过滤
    if (statusFilter !== 'all') {
      result = result.filter(tx => tx.status === statusFilter);
    }
    
    return result;
  }, [flatTransactions, searchQuery, statusFilter]);

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
        return (
          <TransactionListItem
            key={transaction.id}
            transaction={transaction}
            isSelected={transaction.id === currentId}
            onClick={() => onSelectTransaction(transaction.id)}
          />
        );
      })}
    </div>
  );
}

