import type { TransactionWithRelations } from '@/types';

/**
 * 检查交易是否匹配关键字
 * @param tx 交易记录
 * @param keyword 搜索关键字（单个）
 * @returns 是否匹配
 */
export function matchesTransactionKeyword(
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
    const datePattern1 = /^(\d{1,2})[-\/](\d{1,2})$/;
    const dateMatch1 = lowerKeyword.match(datePattern1);
    if (dateMatch1) {
      const [, month, day] = dateMatch1;
      const searchMonth = parseInt(month, 10);
      const searchDay = parseInt(day, 10);
      if (txMonth === searchMonth && txDay === searchDay) {
        return true;
      }
    }

    // 尝试匹配 MM-DD HH:MM 或 MM/DD HH:MM
    const datePattern2 = /^(\d{1,2})[-\/](\d{1,2})\s+(\d{1,2}):(\d{1,2})$/;
    const dateMatch2 = lowerKeyword.match(datePattern2);
    if (dateMatch2) {
      const [, month, day, hour, minute] = dateMatch2;
      const searchMonth = parseInt(month, 10);
      const searchDay = parseInt(day, 10);
      const searchHour = parseInt(hour, 10);
      const searchMinute = parseInt(minute, 10);
      if (
        txMonth === searchMonth &&
        txDay === searchDay &&
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
export function filterTransactionsBySearch(
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

