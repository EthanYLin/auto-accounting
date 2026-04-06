"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Input } from "@heroui/react";
import { Button } from "@heroui/react";
import { Checkbox } from "@heroui/react";
import { Chip } from "@heroui/react";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/react";
import { Pagination } from "@heroui/react";
import { MagnifyingGlassIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";

import { useTransactionStore } from "@/components/context/transaction-store-context";
import {
  filterTransactionsBySearch,
  flattenTransactionsWithChildren,
} from "@/lib/hooks/use-transaction-filter";
import { TRANSACTION_STATUS_COLORS } from "@/constants/transaction-type";
import { calculateAmount, formatCategoryDisplay } from "@/lib/transaction/transaction-display";
import { displayTxTime } from "@/lib/transaction/transaction-datetime";

interface TransactionListSelectorProps {
  selectedIds: number[]; // 当前选中的交易ID（受控）
  currentTransactionId?: number; // 当前交易ID（高亮显示且不可选）
  isDisabled?: boolean;
  onConfirm: (ids: number[]) => void | Promise<void>; // 点击完成时的回调
}

export function TransactionListSelector({
  selectedIds,
  currentTransactionId,
  isDisabled = false,
  onConfirm,
}: TransactionListSelectorProps) {
  const { transactions } = useTransactionStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [tempSelectedIds, setTempSelectedIds] = useState<number[]>(() => [...selectedIds]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 当外部 selectedIds 变化时，同步到内部状态
  useEffect(() => {
    setTempSelectedIds([...selectedIds]);
  }, [selectedIds]);

  const orderedTransactions = useMemo(
    () => flattenTransactionsWithChildren(transactions),
    [transactions],
  );

  // 使用搜索过滤
  const filteredTransactions = useMemo(() => {
    const ids = filterTransactionsBySearch(orderedTransactions, searchQuery);
    return orderedTransactions.filter((tx) => ids.has(tx.id));
  }, [orderedTransactions, searchQuery]);

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
      const index = filteredTransactions.findIndex((tx) => tx.id === currentTransactionId);
      if (index !== -1) {
        const page = Math.floor(index / itemsPerPage) + 1;
        setCurrentPage(page);
      }
    }
  }, [currentTransactionId, filteredTransactions]);

  const short = (s?: string | null) => (s && s.length > 13 ? s.slice(0, 13) + "..." : s);

  // 切换选择状态
  const toggleSelection = (id: number) => {
    // 如果是当前交易，不允许选择
    if (isDisabled || id === currentTransactionId) {
      return;
    }

    setTempSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((selectedId) => selectedId !== id);
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
          isDisabled={isDisabled}
          startContent={<MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />}
          variant="bordered"
          size="sm"
        />
      </div>

      {/* 表格 - 可滚动区域 */}
      <div className="flex-1 min-h-0 overflow-y-auto w-full">
        <Table aria-label="交易列表" className="min-w-full" removeWrapper>
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
              const isChild = !!tx.parent_id;
              const cellClassName = isChild
                ? "text-xs text-gray-500 dark:text-gray-400"
                : isCurrent
                  ? "font-bold text-success-600 dark:text-success-400"
                  : "";
              const rowClassName = `cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${
                isSelected ? "bg-primary-50 dark:bg-primary-900/20" : ""
              } ${isCurrent ? "cursor-not-allowed bg-success-50 dark:bg-success-900/20" : ""}`;

              return (
                <TableRow
                  key={tx.id}
                  className={rowClassName}
                  onClick={() => toggleSelection(tx.id)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {isChild && (
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
                          isDisabled={isDisabled || isCurrent}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={cellClassName}>#{tx.id}</span>
                  </TableCell>
                  <TableCell>
                    <span className={cellClassName}>
                      {short(tx.name) || short(tx.title) || "-"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={cellClassName}>¥{calculateAmount(tx).toFixed(2)}</span>
                  </TableCell>
                  <TableCell>
                    <span className={cellClassName}>{tx.account?.name || "-"}</span>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const cat = formatCategoryDisplay(tx);
                      if (!cat) return <span className={cellClassName}>-</span>;
                      return (
                        <span className={`flex items-center gap-1.5 ${cellClassName}`}>
                          <span
                            className={`inline-flex items-center justify-center rounded-full flex-shrink-0 w-5 h-5 text-[11px] ${cat.backColor || "bg-gray-200 dark:bg-gray-600"}`}
                          >
                            {cat.icon}
                          </span>
                          {cat.label}
                        </span>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    <span className={cellClassName}>{displayTxTime(tx.datetime, "short")}</span>
                  </TableCell>
                  <TableCell>
                    <div className={cellClassName}>
                      {!isChild && tx.status && (
                        <Chip size="sm" color={TRANSACTION_STATUS_COLORS[tx.status]} variant="flat">
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
              isDisabled={isDisabled}
              onPress={handleClearAndConfirm}
              startContent={<XCircleIcon className="w-5 h-5" />}
            >
              清空选择
            </Button>
          )}
          <Button
            color="primary"
            isDisabled={isDisabled}
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
