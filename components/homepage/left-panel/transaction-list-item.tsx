"use client";

import type { TransactionWithRelations } from "@/types";

import React from "react";
import { Chip } from "@heroui/react";
import { LinkIcon, RectangleStackIcon, ScissorsIcon } from "@heroicons/react/24/outline";

import { TRANSACTION_TYPES, TRANSACTION_STATUS_COLORS } from "@/constants/transaction-type";
import { formatDateTime } from "@/lib/transaction/transaction-display";
import { useTransactionStore } from "@/components/context/transaction-store-context";

// ========== 工具函数 ==========

/**
 * 格式化金额显示
 */
function formatAmount(amount: number, sign: number): string {
  const value = amount * sign;
  const formatted = Math.abs(value).toFixed(2);
  return sign >= 0 ? `¥${formatted}` : `-¥${formatted}`;
}

// ========== 组件接口 ==========

export function TransactionListItem({
  transaction,
  isSelected = false,
  onClick,
}: {
  transaction: TransactionWithRelations;
  isSelected?: boolean;
  onClick?: () => void;
}) {
  const store = useTransactionStore();
  const isDirty = store.isDirty(transaction.id);

  // 获取图标和颜色（优先级：子类别 > 主类别 > 交易类型 > 默认）
  const getIconAndColor = () => {
    if (transaction.sub_category) {
      return {
        icon: transaction.sub_category.icon,
        backColor: transaction.sub_category.back_color,
        foreColor: transaction.sub_category.fore_color,
      };
    }
    if (transaction.main_category) {
      return {
        icon: transaction.main_category.icon,
        backColor: transaction.main_category.back_color,
        foreColor: transaction.main_category.fore_color,
      };
    }
    if (transaction.transaction_type) {
      const txType = TRANSACTION_TYPES.find((t) => t.type === transaction.transaction_type);
      if (txType) {
        return {
          icon: txType.icon,
          backColor: txType.back_color,
          foreColor: txType.fore_color,
        };
      }
    }
    return {
      icon: "📝",
      backColor: "bg-gray-100 dark:bg-gray-800",
      foreColor: "text-gray-600 dark:text-gray-400",
    };
  };

  const { icon, backColor, foreColor } = getIconAndColor();

  // 获取第一行左侧显示的文本
  const getDisplayName = () => {
    if (transaction.name) return transaction.name;
    if (transaction.title) return transaction.title;
    const mainLabel = transaction.main_category?.label || "";
    const subLabel = transaction.sub_category?.label || "";
    if (mainLabel && subLabel) return `${mainLabel}-${subLabel}`;
    if (mainLabel) return mainLabel;
    return "-";
  };

  // 获取金额符号
  const getAmountSign = () => {
    if (transaction.transaction_type) {
      const txType = TRANSACTION_TYPES.find((t) => t.type === transaction.transaction_type);
      return txType?.sign || 1;
    }
    return 1;
  };

  const sign = getAmountSign();
  const isCanceled = transaction.status === "取消";
  const amountColor = transaction.transaction_type
    ? TRANSACTION_TYPES.find((t) => t.type === transaction.transaction_type)?.amount_color ||
      "text-gray-600 dark:text-gray-400"
    : "text-gray-600 dark:text-gray-400";
  const splitsCount = transaction.splits?.length || 0;
  const childrenCount = transaction.children_ids.length;
  const isChild = !!transaction.parent_id;
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`
        ${isChild ? "pl-8 pr-4 py-2" : "px-4 py-3"} cursor-pointer transition-colors border-b border-gray-200 dark:border-gray-700
        ${isSelected ? "bg-primary-50 dark:bg-primary-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"}
      `}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-center gap-3">
        {/* 子记录的引导线 */}
        {isChild && (
          <div className="flex items-center h-full flex-shrink-0">
            <svg width="20" height="24" className="text-gray-300 dark:text-gray-600">
              <path d="M 4 0 L 4 12 L 20 12" stroke="currentColor" strokeWidth="1" fill="none" />
            </svg>
          </div>
        )}

        {/* 左侧圆形图标 */}
        <div className="relative">
          <div
            className={`${isChild ? "w-8 h-8 text-base" : "w-10 h-10 text-lg"} rounded-full ${backColor} ${foreColor} flex items-center justify-center flex-shrink-0`}
          >
            {icon}
          </div>
          {/* 未保存指示点 */}
          {isDirty && (
            <div
              className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-warning border-2 border-white dark:border-gray-900"
              title="未保存的更改"
            />
          )}
        </div>

        {/* 右侧内容 */}
        <div className="flex-1 min-w-0">
          {/* 第一行：名称和金额 */}
          <div className="flex items-baseline justify-between mb-1">
            <span
              className={`${isChild ? "text-xs" : "text-sm"} ${isChild ? "font-normal" : "font-medium"} text-gray-900 dark:text-gray-100 truncate`}
            >
              {getDisplayName()}
            </span>
            <span
              className={`${isChild ? "text-xs" : "text-sm"} ${isChild ? "font-normal" : "font-bold"} ml-2 flex-shrink-0 ${isCanceled ? "text-gray-500 dark:text-gray-400" : amountColor}`}
            >
              <span className={isCanceled ? "line-through inline-block decoration-1" : ""}>
                {formatAmount(transaction.amount, sign)}
              </span>
            </span>
          </div>

          {/* 第二行：日期时间和账户 */}
          <div
            className={`flex items-center justify-between ${isChild ? "text-[10px]" : "text-xs"} text-gray-500 dark:text-gray-400 mb-1`}
          >
            <span className="truncate">
              {formatDateTime(transaction.datetime, "short")}
              {transaction.merchant && ` - ${transaction.merchant}`}
            </span>
            <span className="ml-2 flex-shrink-0 truncate max-w-[80px]">
              {transaction.account?.name || "-"}
            </span>
          </div>

          {/* 第三行：ID、特殊标记和状态 */}
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-1.5 ${isChild ? "text-[10px]" : "text-xs"}`}>
              <span
                className={`${isChild ? "font-normal" : "font-semibold"} text-gray-600 dark:text-gray-400`}
              >
                #{transaction.id}
              </span>

              {/* 特殊标记图标 */}
              {transaction.parent_id && (
                <LinkIcon className="w-3.5 h-3.5 text-gray-500" title="附加到其他交易" />
              )}

              {childrenCount > 0 && (
                <span
                  className="flex items-center gap-0.5 text-gray-500"
                  title={`${childrenCount} 个交易附加到该交易`}
                >
                  <RectangleStackIcon className="w-3.5 h-3.5" />
                  <span className="text-[10px]">{childrenCount}</span>
                </span>
              )}

              {splitsCount > 0 && (
                <span
                  className="flex items-center gap-0.5 text-gray-500"
                  title={`包含 ${splitsCount} 个拆账`}
                >
                  <ScissorsIcon className="w-3.5 h-3.5" />
                  <span className="text-[10px]">{splitsCount}</span>
                </span>
              )}
            </div>

            {/* 状态 Chip - 子记录不显示, 已完成及取消状态不显示 */}
            {!isChild && transaction.status && transaction.status !== "已完成" && transaction.status !== "取消" && (
              <Chip
                size="sm"
                color={TRANSACTION_STATUS_COLORS[transaction.status]}
                variant="flat"
                className="h-5"
              >
                {transaction.status}
              </Chip>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
