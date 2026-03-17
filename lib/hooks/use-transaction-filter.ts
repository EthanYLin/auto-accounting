import { useState, useMemo, useCallback } from 'react';
import type { TransactionStatus, TransactionWithRelations } from '@/types';
import { useSaveButtonOverride } from '@/components/context/save-button-override-context';

// ==================== 内部工具函数 ====================

/**
 * 检查交易是否匹配关键字
 */
function matchesTransactionKeyword(
  tx: TransactionWithRelations,
  keyword: string
): boolean {
  const lowerKeyword = keyword.toLowerCase().trim();
  if (!lowerKeyword) return true;

  // 1. ID 搜索 - 精确匹配 (#ID)
  if (lowerKeyword.startsWith('#')) {
    const searchId = lowerKeyword.slice(1);
    if (/^\d+$/.test(searchId)) {
      return tx.id === parseInt(searchId, 10);
    }
  }

  // 2. 金额搜索 - 只要绝对值的整数部分相等即可
  if (/^\d+(\.\d+)?$/.test(lowerKeyword)) {
    const searchInt = Math.floor(parseFloat(lowerKeyword));
    const txInt = Math.floor(Math.abs(tx.amount));
    return txInt === searchInt;
  }

  // 3. 日期时间搜索
  if (tx.datetime) {
    const txDate = new Date(tx.datetime);
    const txMonth = txDate.getMonth() + 1;
    const txDay = txDate.getDate();
    const txHour = txDate.getHours();
    const txMinute = txDate.getMinutes();

    // MM-DD 或 MM/DD
    const datePattern = /^(\d{1,2})[-\/](\d{1,2})$/;
    const dateMatch = lowerKeyword.match(datePattern);
    if (dateMatch) {
      const [, month, day] = dateMatch;
      if (txMonth === parseInt(month, 10) && txDay === parseInt(day, 10)) {
        return true;
      }
    }

    // HH:MM
    const timePattern = /^(\d{1,2}):(\d{1,2})$/;
    const timeMatch = lowerKeyword.match(timePattern);
    if (timeMatch) {
      const [, hour, minute] = timeMatch;
      if (txHour === parseInt(hour, 10) && txMinute === parseInt(minute, 10)) {
        return true;
      }
    }
  }

  // 4. 账户名称 - 模糊搜索
  if (tx.account?.name && tx.account.name.toLowerCase().includes(lowerKeyword)) return true;

  // 5. 交易名称 - 模糊搜索
  if (tx.name && tx.name.toLowerCase().includes(lowerKeyword)) return true;

  // 6. 商家 - 模糊搜索
  if (tx.merchant && tx.merchant.toLowerCase().includes(lowerKeyword)) return true;

  // 7. 主类别 - 精确匹配
  if (tx.main_category?.label && tx.main_category.label === keyword) return true;

  // 8. 子类别 - 精确匹配
  if (tx.sub_category?.label && tx.sub_category.label === keyword) return true;

  // 9. 识别标题 - 模糊搜索
  if (tx.title && tx.title.toLowerCase().includes(lowerKeyword)) return true;

  return false;
}

/**
 * 将交易按时间排序，并确保子交易紧跟其父交易。
 */
export function flattenTransactionsWithChildren(
  transactions: TransactionWithRelations[]
): TransactionWithRelations[] {
  const result: TransactionWithRelations[] = [];
  const transactionMap = new Map(transactions.map(tx => [tx.id, tx]));

  const rootTransactions = transactions
    .filter(tx => !tx.parent_id)
    .sort((a, b) => {
      const dateA = a.datetime ? new Date(a.datetime).getTime() : 0;
      const dateB = b.datetime ? new Date(b.datetime).getTime() : 0;
      return dateB - dateA;
    });

  rootTransactions.forEach(parent => {
    result.push(parent);
    parent.children_ids.forEach(childId => {
      const child = transactionMap.get(childId);
      if (child) result.push(child);
    });
  });

  return result;
}

/**
 * 根据搜索查询过滤交易列表
 */
export function filterTransactionsBySearch(
  transactions: TransactionWithRelations[],
  searchQuery: string
): TransactionWithRelations[] {
  if (!searchQuery.trim()) return transactions;
  const keywords = searchQuery.trim().split(/\s+/).filter(k => k.length > 0);
  return transactions.filter(tx =>
    keywords.every(keyword => matchesTransactionKeyword(tx, keyword))
  );
}

// ==================== Hook ====================

/**
 * 管理交易搜索/过滤状态，返回过滤后的交易列表。
 * 内部维护 searchQuery 和 statusFilter 状态。
 */
export function useTransactionFilter(transactions: TransactionWithRelations[]) {
  const { clearSaveButtonOverride } = useSaveButtonOverride();
  const [searchQuery, setSearchQueryState] = useState('');
  const [statusFilter, setStatusFilterState] = useState<TransactionStatus | 'all'>('all');

  const setSearchQuery = useCallback((value: string) => {
    clearSaveButtonOverride();
    setSearchQueryState(value);
  }, [clearSaveButtonOverride]);

  const setStatusFilter = useCallback((value: TransactionStatus | 'all') => {
    clearSaveButtonOverride();
    setStatusFilterState(value);
  }, [clearSaveButtonOverride]);

  const flatTransactions = useMemo(
    () => flattenTransactionsWithChildren(transactions),
    [transactions]
  );

  // 先应用搜索过滤，再应用状态过滤
  const filteredTransactions = useMemo(() => {
    let result = flatTransactions;

    // 1. 搜索过滤
    if (searchQuery.trim()) {
      const matched = filterTransactionsBySearch(flatTransactions, searchQuery);
      const matchedIds = new Set(matched.map(tx => tx.id));

      // 当子记录匹配时，将父记录也加入结果；当父记录匹配时，将子记录也加入结果。
      matched.forEach(tx => {
        if (!tx.parent_id && tx.children_ids.length > 0) {
          tx.children_ids.forEach(childId => matchedIds.add(childId));
        }
        if (tx.parent_id) {
          matchedIds.add(tx.parent_id);
        }
      });

      result = result.filter(tx => matchedIds.has(tx.id));
    }

    // 2. 状态过滤
    if (statusFilter !== 'all') {
      result = result.filter(tx => tx.status === statusFilter);
    }

    return result;
  }, [flatTransactions, searchQuery, statusFilter]);

  const isFiltered = searchQuery.trim() !== '' || statusFilter !== 'all';

  const clearFilters = useCallback(() => {
    clearSaveButtonOverride();
    setSearchQueryState('');
    setStatusFilterState('all');
  }, [clearSaveButtonOverride]);

  return {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    filteredTransactions,
    isFiltered,
    clearFilters,
  };
}
