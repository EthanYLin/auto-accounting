import { useMemo } from 'react';
import type { TransactionStatus, TransactionWithRelations } from '@/types';

/**
 * 检查交易是否匹配关键字
 * @param tx 交易记录
 * @param keyword 搜索关键字（单个）
 * @returns 是否匹配
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
    const txMonth = txDate.getMonth() + 1; // 0-indexed
    const txDay = txDate.getDate();
    const txHour = txDate.getHours();
    const txMinute = txDate.getMinutes();

    // 尝试匹配 MM-DD 或 MM/DD
    const datePattern = /^(\d{1,2})[-\/](\d{1,2})$/;
    const dateMatch = lowerKeyword.match(datePattern);
    if (dateMatch) {
      const [, month, day] = dateMatch;
      const searchMonth = parseInt(month, 10);
      const searchDay = parseInt(day, 10);
      if (txMonth === searchMonth && txDay === searchDay) {
        return true;
      }
    }

    // 尝试匹配 HH:MM
    const timePattern = /^(\d{1,2}):(\d{1,2})$/;
    const timeMatch = lowerKeyword.match(timePattern);
    if (timeMatch) {
      const [, hour, minute] = timeMatch;
      const searchHour = parseInt(hour, 10);
      const searchMinute = parseInt(minute, 10);
      if (
        txHour === searchHour &&
        txMinute === searchMinute
      ) {
        return true;
      }
    }
  }

  // 4. 账户名称 - 模糊搜索
  if (tx.account?.name && tx.account.name.toLowerCase().includes(lowerKeyword)) {
    return true;
  }

  // 5. 交易名称 - 模糊搜索
  if (tx.name && tx.name.toLowerCase().includes(lowerKeyword)) {
    return true;
  }

  // 6. 商家 - 模糊搜索
  if (tx.merchant && tx.merchant.toLowerCase().includes(lowerKeyword)) {
    return true;
  }

  // 7. 主类别 - 精确匹配
  if (tx.main_category?.label && tx.main_category.label === keyword) {
    return true;
  }

  // 8. 子类别 - 精确匹配
  if (tx.sub_category?.label && tx.sub_category.label === keyword) {
    return true;
  }

  // 9. 识别标题 - 模糊搜索
  if (tx.title && tx.title.toLowerCase().includes(lowerKeyword)) {
    return true;
  }

  return false;
}

/**
 * 根据搜索查询过滤交易列表
 * @param transactions 交易列表
 * @param searchQuery 搜索查询字符串（可以包含多个关键字，用空格分隔）
 * @returns 过滤后的交易列表
 */
function filterTransactionsBySearch(
  transactions: TransactionWithRelations[],
  searchQuery: string
): TransactionWithRelations[] {
  if (!searchQuery.trim()) {
    return transactions;
  }

  // 按空格分割关键字
  const keywords = searchQuery.trim().split(/\s+/).filter(k => k.length > 0);

  // 过滤：必须匹配所有关键字
  return transactions.filter(tx => {
    return keywords.every(keyword => matchesTransactionKeyword(tx, keyword));
  });
}

/**
 * 按搜索关键字和状态过滤交易，并按照时间排序返回结果，其中子交易紧跟其父交易。
 * @param transactions 全量交易列表。
 * @param searchQuery 以空格分隔的关键字；支持 ID、金额、日期时间、名称、商家、分类等。
 * @param statusFilter 交易状态过滤条件或 'all'。
 * @returns 符合关键字和状态的有序交易列表，按时间排序，子交易紧跟父交易。
 */
export function useFilteredTransactions(
  transactions: TransactionWithRelations[],
  searchQuery: string,
  statusFilter: TransactionStatus | 'all'
) {
  // 将所有交易按时间排序，并确保子交易紧跟其父交易
  const flatTransactions = useMemo(() => {
    const result: TransactionWithRelations[] = [];
    
    // 获取所有根记录（没有 parent 的记录）并按时间倒序排序
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
      
      // 通过 children_ids 查找子记录
      parent.children_ids.forEach(childId => {
        const child = transactions.find(t => t.id === childId);
        if (child) result.push(child);
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

  return filteredTransactions;
}
