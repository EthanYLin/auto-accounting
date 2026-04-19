import type { TransactionStatus, TransactionWithRelations } from "@/types";

import { useState, useMemo, useCallback, useRef } from "react";

import { getAmountSymbol } from "../transaction/transaction-display";

import { useSaveButtonOverride } from "@/components/context/save-button-override-context";
import { parseTxTime } from "@/lib/transaction/transaction-datetime";

// ==================== 内部工具函数 ====================
export type SortOrder = "newest" | "oldest";

/**
 * 检查交易是否匹配关键字
 */
function matchesTransactionKeyword(tx: TransactionWithRelations, keyword: string): boolean {
  const lowerKeyword = keyword.toLowerCase().trim();
  if (!lowerKeyword) return true;

  // 1. ID 搜索 - 精确匹配 (#ID)
  if (lowerKeyword.startsWith("#")) {
    const searchId = lowerKeyword.slice(1);
    if (/^\d+$/.test(searchId)) {
      return tx.id === parseInt(searchId, 10);
    }
  }

  // 2. 金额搜索
  // (a). 如果搜索整数，则只要整数部分相等即可
  // (b). 如果搜索小数，则要求整数与小数部分均相等(cents相等)
  // (c). 如果搜索 "-"，要求 getAmountSign 为 -1
  // (d). 如果搜索 "+"，要求 getAmountSign 为 +1

  const txSign = getAmountSymbol(tx.transaction_type);
  // 纯符号搜索
  if (lowerKeyword === "-" || lowerKeyword === "+") {
    if (txSign === lowerKeyword) return true;
  }
  // 数值搜索
  const match = lowerKeyword.match(/^([-+])?(\d+(?:\.\d+)?)$/);
  if (match) {
    const [_, searchSign, numStr] = match; // 提取符号和数字部分
    const signOk = searchSign === undefined || searchSign === txSign;
    if (signOk) {
      if (numStr.includes(".")) {
        // 小数搜索
        const txCents = Math.round(Math.abs(tx.amount) * 100);
        const searchCents = Math.round(parseFloat(numStr) * 100);
        if (txCents === searchCents) return true;
      } else {
        // 整数搜索
        const txInt = Math.floor(Math.abs(tx.amount));
        const searchInt = Math.floor(parseFloat(numStr));
        if (txInt === searchInt) return true;
      }
    }
  }

  // 3. 日期时间搜索
  const txDateTime = parseTxTime(tx.datetime);
  if (txDateTime) {
    const txMonth = txDateTime.month;
    const txDay = txDateTime.day;
    const txHour = txDateTime.hour;
    const txMinute = txDateTime.minute;

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

  // 10. 状态 - 精确匹配
  if (tx.status && tx.status === keyword) return true;

  // 11. 备注 - 模糊搜索
  if (tx.remark && tx.remark.toLowerCase().includes(lowerKeyword)) return true;

  return false;
}

/**
 * 将交易按时间排序，并确保子交易紧跟其父交易。
 */
export function flattenTransactionsWithChildren(
  transactions: TransactionWithRelations[],
  sortOrder: SortOrder = "newest",
): TransactionWithRelations[] {
  const result: TransactionWithRelations[] = [];
  const transactionMap = new Map(transactions.map((tx) => [tx.id, tx]));

  const rootTransactions = transactions
    .filter((tx) => !tx.parent_id)
    .sort((a, b) => {
      // datetime 格式为 yyyy-MM-ddTHH:mm:ss，可直接字符串比较
      const da = a.datetime ?? "";
      const db = b.datetime ?? "";
      if (sortOrder === "newest") {
        return da < db ? 1 : da > db ? -1 : 0;
      } else {
        return da < db ? -1 : da > db ? 1 : 0;
      }
    });

  rootTransactions.forEach((parent) => {
    result.push(parent);
    parent.children_ids.forEach((childId) => {
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
  searchQuery: string,
  includeParent: boolean = false,
  includeChildren: boolean = false,
): Set<number> {
  if (!searchQuery.trim()) return new Set(transactions.map((tx) => tx.id));
  const keywords = searchQuery
    .trim()
    .split(/\s+/)
    .filter((k) => k.length > 0);
  return new Set(
    transactions
      .filter((tx) => keywords.every((keyword) => matchesTransactionKeyword(tx, keyword)))
      .flatMap((tx) => {
        if (includeParent && tx.parent_id) return [tx.id, tx.parent_id];
        if (includeChildren && tx.children_ids.length > 0) return [tx.id, ...tx.children_ids];
        return [tx.id];
      }),
  );
}

/**
 * 根据状态过滤交易列表
 */
export function filterTransactionsByStatus(
  transactions: TransactionWithRelations[],
  status: TransactionStatus,
  includeParent: boolean = false,
  includeChildren: boolean = false,
): Set<number> {
  return new Set(
    transactions
      .filter((tx) => tx.status === status)
      .flatMap((tx) => {
        if (includeParent && tx.parent_id) return [tx.id, tx.parent_id];
        if (includeChildren && tx.children_ids.length > 0) return [tx.id, ...tx.children_ids];
        return [tx.id];
      }),
  );
}

// ==================== Hook ====================

/**
 * 管理交易搜索/过滤状态，返回过滤后的交易列表。
 * 内部维护 searchQuery（输入框草稿）与 appliedSearchQuery（参与过滤，失焦或 Enter 提交）及 statusFilter。
 * @param selectedTransactionId 当前选中的交易 id；过滤后会始终保留该条（及同组父/子），避免侧栏列表与编辑区脱节。
 */
export function useTransactionFilter(
  transactions: TransactionWithRelations[],
  selectedTransactionId?: number | null,
) {
  const { clearSaveButtonOverride } = useSaveButtonOverride();
  const [searchQuery, setSearchQueryState] = useState("");
  const [appliedSearchQuery, setAppliedSearchQuery] = useState("");
  const searchQueryRef = useRef(searchQuery);
  searchQueryRef.current = searchQuery;
  const [statusFilter, setStatusFilterState] = useState<TransactionStatus | "all">("all");
  const [sortOrder, setSortOrderState] = useState<SortOrder>("newest");

  const setSearchQuery = useCallback(
    (value: string) => {
      clearSaveButtonOverride();
      setSearchQueryState(value);
      if (value === "") {
        setAppliedSearchQuery("");
      }
    },
    [clearSaveButtonOverride],
  );

  /** 将输入框草稿提交为实际过滤条件（失焦或 Enter 时调用） */
  const commitSearchQuery = useCallback(() => {
    setAppliedSearchQuery(searchQueryRef.current);
  }, []);

  const setStatusFilter = useCallback(
    (value: TransactionStatus | "all") => {
      clearSaveButtonOverride();
      setStatusFilterState(value);
    },
    [clearSaveButtonOverride],
  );

  const setSortOrder = useCallback((value: SortOrder) => {
    setSortOrderState(value);
  }, []);

  // 结构指纹：仅在影响排序的属性变化时才会改变
  // （ID 集合、父子关系、用于排序的日期时间）。
  // 仅修改内容字段（名称、金额、商户等）不会改变此指纹。
  const structuralFingerprint = useMemo(() => {
    let fp = "";
    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      if (i > 0) fp += ";";
      fp += `${tx.id},${tx.parent_id ?? ""},${tx.datetime ?? ""},${tx.children_ids.join("-")}`;
    }
    return fp;
  }, [transactions]);

  // 昂贵的排序（O(n log n) 次 Luxon 日期解析）仅在结构变化时重新执行
  const sortedIds = useMemo(
    () => flattenTransactionsWithChildren(transactions, sortOrder).map((tx) => tx.id),
    [structuralFingerprint, sortOrder],
  );

  // 廉价的 O(n) 重建：使用稳定的排序顺序 + 当前交易数据
  const flatTransactions = useMemo(() => {
    const txMap = new Map(transactions.map((tx) => [tx.id, tx]));
    const result: TransactionWithRelations[] = [];
    for (const id of sortedIds) {
      const tx = txMap.get(id);
      if (tx) result.push(tx);
    }
    return result;
  }, [sortedIds, transactions]);

  // 先应用搜索过滤，再应用状态过滤
  const filteredTransactions = useMemo(() => {
    // 1. 搜索过滤（当父记录匹配时，将子记录也加入结果；当子记录匹配时，将父记录也加入结果）
    let resultIds = appliedSearchQuery.trim()
      ? filterTransactionsBySearch(flatTransactions, appliedSearchQuery, true, true)
      : new Set(flatTransactions.map((tx) => tx.id));

    // 2. 状态过滤：与搜索结果取交集（AND 语义）
    if (statusFilter !== "all") {
      const statusIds = filterTransactionsByStatus(flatTransactions, statusFilter, false, true);
      resultIds = new Set(Array.from(resultIds).filter((id) => statusIds.has(id)));
    }

    // 3. 始终纳入当前的选中交易（当父记录匹配时，将子记录也加入结果；当子记录匹配时，将父记录也加入结果）
    if (selectedTransactionId != null) {
      const currentTx = flatTransactions.find((tx) => tx.id === selectedTransactionId);
      if (currentTx) {
        resultIds.add(currentTx.id);
        if (currentTx.parent_id) resultIds.add(currentTx.parent_id);
        currentTx.children_ids.forEach((id) => resultIds.add(id));
      }
    }

    return flatTransactions.filter((tx) => resultIds.has(tx.id));
  }, [flatTransactions, appliedSearchQuery, statusFilter, selectedTransactionId]);

  const isFiltered =
    appliedSearchQuery.trim() !== "" || statusFilter !== "all" || sortOrder !== "newest";

  const clearFilters = useCallback(() => {
    clearSaveButtonOverride();
    setSearchQueryState("");
    setAppliedSearchQuery("");
    setStatusFilterState("all");
    setSortOrderState("newest");
  }, [clearSaveButtonOverride]);

  return {
    searchQuery,
    setSearchQuery,
    commitSearchQuery,
    statusFilter,
    setStatusFilter,
    sortOrder,
    setSortOrder,
    filteredTransactions,
    isFiltered,
    clearFilters,
  };
}
