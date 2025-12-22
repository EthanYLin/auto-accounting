'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Checkbox } from "@heroui/checkbox";
import { Chip } from "@heroui/chip";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/table";
import { Pagination } from "@heroui/pagination";
import { MagnifyingGlassIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { useTransactionCache } from '@/components/context/transaction-cache-context';
import { TRANSACTION_TYPES, TRANSACTION_STATUS_COLORS } from '@/constants/transaction-type';
import type { TransactionWithRelations } from '@/types';

interface TransactionListSelectorProps {
  selectedIds: number[];           // 当前选中的交易ID（受控）
  currentTransactionId?: number;    // 当前交易ID（高亮显示且不可选）
  onConfirm: (ids: number[]) => void;  // 点击完成时的回调
}

// 扁平化交易列表（用于表格展示）
interface FlatTransaction extends TransactionWithRelations {
  isChild: boolean; // 是否为子账单
}

export function TransactionListSelector({ selectedIds, currentTransactionId, onConfirm }: TransactionListSelectorProps) {
  const { transactions, getChildren } = useTransactionCache();
  const [searchQuery, setSearchQuery] = useState("");
  const [tempSelectedIds, setTempSelectedIds] = useState<number[]>(selectedIds);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 当外部 selectedIds 变化时，同步到内部状态
  useEffect(() => {
    setTempSelectedIds(selectedIds);
  }, [selectedIds]);

  // 将扁平结构组织为表格行（按时间排序，父记录后面跟着子记录）
  const flatTransactions = useMemo((): FlatTransaction[] => {
    const result: FlatTransaction[] = [];
    
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
      result.push({ ...parent, isChild: false });
      
      // 获取并添加子记录（保持原有顺序）
      const children = getChildren(parent.id);
      children.forEach(child => {
        result.push({ ...child, isChild: true });
      });
    });
    
    return result;
  }, [transactions, getChildren]);

  // 搜索过滤函数
  const matchesKeyword = (tx: FlatTransaction, keyword: string): boolean => {
    const lowerKeyword = keyword.toLowerCase().trim();
    if (!lowerKeyword) return true;

    // 1. ID 搜索 - 精确匹配 (#ID)
    if (lowerKeyword.startsWith('#')) {
      const searchId = lowerKeyword.slice(1);
      if (/^\d+$/.test(searchId)) {
        return tx.id === parseInt(searchId, 10);
      }
    }

    // 2. 金额搜索 - 精确匹配绝对值（四舍五入两位小数后再比较，避免浮点精度问题）
    if (/^\d+(\.\d+)?$/.test(lowerKeyword)) {
      const searchAmount = Math.round(parseFloat(lowerKeyword) * 100);
      const txAmount = Math.round(Math.abs(tx.amount) * 100);
      return txAmount === searchAmount;
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
        if (txMonth === searchMonth && txDay === searchDay && 
            txHour === searchHour && txMinute === searchMinute) {
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
  };

  // 应用搜索过滤
  const filteredTransactions = useMemo((): FlatTransaction[] => {
    if (!searchQuery.trim()) {
      return flatTransactions;
    }

    // 按空格分割关键字
    const keywords = searchQuery.trim().split(/\s+/).filter(k => k.length > 0);

    // 过滤：必须匹配所有关键字
    return flatTransactions.filter(tx => {
      return keywords.every(keyword => matchesKeyword(tx, keyword));
    });
  }, [flatTransactions, searchQuery]);

  // 计算总页数
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

  // 当前页的数据
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredTransactions.slice(start, end);
  }, [filteredTransactions, currentPage]);

  // 搜索时重置到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // 如果有 currentTransactionId，自动定位到该交易所在页
  useEffect(() => {
    if (currentTransactionId) {
      const index = filteredTransactions.findIndex(tx => tx.id === currentTransactionId);
      if (index !== -1) {
        const page = Math.floor(index / itemsPerPage) + 1;
        setCurrentPage(page);
      }
    }
  }, [currentTransactionId, filteredTransactions]);

  // 计算金额（考虑交易类型的 sign）
  const calculateAmount = (tx: TransactionWithRelations): number => {
    const txType = TRANSACTION_TYPES.find(t => t.type === tx.transaction_type);
    return tx.amount * (txType?.sign || 1);
  };

  // 格式化类别显示（带emoji）
  const formatCategory = (tx: TransactionWithRelations): React.ReactNode => {
    const parts = [];
    if (tx.main_category?.label) parts.push(tx.main_category.label);
    if (tx.sub_category?.label) parts.push(tx.sub_category.label);
    
    const categoryText = parts.join('-') || '-';
    const emoji = tx.sub_category?.icon || tx.main_category?.icon;
    
    if (emoji) {
      return (
        <span>
          <span className="mr-1">{emoji}</span>
          {categoryText}
        </span>
      );
    }
    
    return categoryText;
  };

  // 格式化日期时间
  const formatDateTime = (datetime: string | null): string => {
    if (!datetime) return '-';
    const date = new Date(datetime);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const short = (s?: string | null) => (s && s.length > 10 ? s.slice(0, 10) + "..." : s);

  // 切换选择状态
  const toggleSelection = (id: number) => {
    // 如果是当前交易，不允许选择
    if (id === currentTransactionId) {
      return;
    }
    
    setTempSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(selectedId => selectedId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // 处理完成按钮
  const handleConfirm = () => {
    onConfirm(tempSelectedIds);
  };

  // 处理清空选择按钮
  const handleClearAndConfirm = () => {
    onConfirm([]); // 清空选择并提交
  };

  return (
    <div className="flex flex-col w-full h-full min-h-0">
      {/* 搜索框 - 固定 */}
      <div className="w-full mb-4 flex-shrink-0">
        <Input
          placeholder="搜索交易记录..."
          value={searchQuery}
          onValueChange={setSearchQuery}
          startContent={<MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />}
          variant="bordered"
          size="sm"
        />
      </div>

      {/* 表格 - 可滚动区域 */}
      <div className="flex-1 min-h-0 overflow-y-auto w-full">
        <Table 
          aria-label="交易列表"
          className="min-w-full"
          removeWrapper
        >
          <TableHeader>
            <TableColumn>选择</TableColumn>
            <TableColumn>ID</TableColumn>
            <TableColumn>名称</TableColumn>
            <TableColumn>金额</TableColumn>
            <TableColumn>账户</TableColumn>
            <TableColumn>类别</TableColumn>
            <TableColumn>日期时间</TableColumn>
            <TableColumn>状态</TableColumn>
          </TableHeader>
          <TableBody emptyContent="暂无交易记录">
            {paginatedTransactions.map((tx) => {
              const isSelected = tempSelectedIds.includes(tx.id);
              const isCurrent = tx.id === currentTransactionId;
              const cellClassName = tx.isChild 
                ? 'text-xs text-gray-500 dark:text-gray-400' 
                : isCurrent 
                ? 'font-bold text-success-600 dark:text-success-400'
                : '';
              const rowClassName = `cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${
                isSelected ? 'bg-primary-50 dark:bg-primary-900/20' : ''
              } ${isCurrent ? 'cursor-not-allowed bg-success-50 dark:bg-success-900/20' : ''}`;
              
              return (
                <TableRow
                  key={tx.id}
                  className={rowClassName}
                  onClick={() => toggleSelection(tx.id)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {tx.isChild && (
                        <div className="flex items-center h-full">
                          <svg width="20" height="24" className="text-gray-300 dark:text-gray-600">
                            <path
                              d="M 4 0 L 4 12 L 20 12"
                              stroke="currentColor"
                              strokeWidth="1"
                              fill="none"
                            />
                          </svg>
                        </div>
                      )}
                      <div className={cellClassName}>
                        <Checkbox
                          isSelected={isSelected}
                          onValueChange={() => toggleSelection(tx.id)}
                          size="sm"
                          isDisabled={isCurrent}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={cellClassName}>#{tx.id}</span>
                  </TableCell>
                  <TableCell>
                    <span className={cellClassName}>{short(tx.name) || short(tx.title) || "-"}</span>
                  </TableCell>
                  <TableCell>
                    <span className={cellClassName}>¥{calculateAmount(tx).toFixed(2)}</span>
                  </TableCell>
                  <TableCell>
                    <span className={cellClassName}>{tx.account?.name || '-'}</span>
                  </TableCell>
                  <TableCell>
                    <span className={cellClassName}>{formatCategory(tx)}</span>
                  </TableCell>
                  <TableCell>
                    <span className={cellClassName}>{formatDateTime(tx.datetime)}</span>
                  </TableCell>
                  <TableCell>
                    <div className={cellClassName}>
                      {!tx.isChild && tx.status && (
                        <Chip
                          size="sm"
                          color={TRANSACTION_STATUS_COLORS[tx.status]}
                          variant="flat"
                        >
                          {tx.status}
                        </Chip>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* 底部控制栏 - 固定不滚动 */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700 mt-4 flex-shrink-0">
        {/* 左侧：分页器 */}
        <div className="flex-shrink-0">
          {totalPages > 1 ? (
            <Pagination
              total={totalPages}
              page={currentPage}
              onChange={setCurrentPage}
              showControls
              size="sm"
            />
          ) : (
            <div className="h-8"></div>
          )}
        </div>

        {/* 右侧：按钮 */}
        <div className="flex gap-2">
          {tempSelectedIds.length > 0 && (
            <Button
              color="default"
              variant="bordered"
              onPress={handleClearAndConfirm}
              startContent={<XCircleIcon className="w-5 h-5" />}
            >
              清空选择
            </Button>
          )}
          <Button
            color="primary"
            onPress={handleConfirm}
            startContent={<CheckCircleIcon className="w-5 h-5" />}
          >
            完成
          </Button>
        </div>
      </div>
    </div>
  );
}


