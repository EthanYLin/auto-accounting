"use client";

import type { TransactionWithRelations } from "@/types";

import React, { memo, useCallback } from "react";
import { Chip } from "@heroui/react";
import { LinkIcon, RectangleStackIcon, ScissorsIcon } from "@heroicons/react/24/outline";

import { TRANSACTION_TYPES, TRANSACTION_STATUS_COLORS } from "@/constants/transaction-type";
import {
  formatAmountParts,
  formatDisplayTitle,
  getAmountColorClass,
} from "@/lib/transaction/transaction-display";
import { displayTxTime } from "@/lib/transaction/transaction-datetime";

// ========== 组件接口 ==========

export const TransactionListItem = memo(function TransactionListItem({
  transaction,
  isSelected = false,
  isDirty = false,
  onSelect,
}: {
  transaction: TransactionWithRelations;
  isSelected?: boolean;
  isDirty?: boolean;
  onSelect?: (id: number) => void;
}) {
  const onClick = useCallback(() => onSelect?.(transaction.id), [onSelect, transaction.id]);
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
      backColor: "bg-gray-100 dark:bg-[#2a2f3a]",
      foreColor: "text-gray-600 dark:text-zinc-400",
    };
  };

  const { icon, backColor, foreColor } = getIconAndColor();

  const { sign: amountSignStr, digits: amountDigits } = formatAmountParts(
    transaction.amount,
    transaction.transaction_type ?? null,
  );
  const amountText = amountSignStr === "-" ? `-¥${amountDigits}` : `¥${amountDigits}`;

  const isCanceled = transaction.status === "取消";
  const splitsCount = transaction.splits?.length || 0;
  const childrenCount = transaction.children_ids.length;
  const isChild = !!transaction.parent_id;

  const hasLeftMarkers = !!transaction.parent_id || childrenCount > 0 || splitsCount > 0;
  const showStatusChip =
    !isChild &&
    !!transaction.status &&
    transaction.status !== "已完成" &&
    transaction.status !== "取消";
  const hasThirdRow = hasLeftMarkers || showStatusChip;

  const leftColJustify = hasThirdRow && !hasLeftMarkers ? "justify-center" : "justify-start";

  return (
    <div
      role="button"
      tabIndex={0}
      className={`
        ${isChild ? "pl-8 pr-3 lg:pr-4 py-2" : "px-3 lg:px-4 py-2.5 lg:py-3"} cursor-pointer transition-colors border-b border-gray-100 dark:border-white/[0.05]
        ${
          isSelected
            ? "bg-primary-50 dark:bg-primary-500/10 dark:border-l-2 dark:border-l-primary-400/70"
            : "hover:bg-gray-50 dark:hover:bg-white/[0.04]"
        }
      `}
      onClick={onSelect ? onClick : undefined}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && onSelect) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex items-stretch gap-3">
        {/* 子记录的引导线 */}
        {isChild && (
          <div className="flex items-center flex-shrink-0 self-center">
            <svg width="20" height="24" className="text-gray-300 dark:text-white/20">
              <path d="M 4 0 L 4 12 L 20 12" stroke="currentColor" strokeWidth="1" fill="none" />
            </svg>
          </div>
        )}

        {/* 左侧圆形图标 */}
        <div className="relative self-center">
          <div
            className={`${isChild ? "w-8 h-8 text-base" : "w-8 h-8 text-base lg:w-10 lg:h-10 lg:text-lg"} rounded-full ${backColor} ${foreColor} flex items-center justify-center flex-shrink-0`}
          >
            {icon}
          </div>
          {/* 未保存指示点 */}
          {isDirty && (
            <div
              className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-warning border-2 border-white dark:border-[#161b22]"
              title="未保存的更改"
            />
          )}
        </div>

        {/* 主内容：左列标题+时间[+图标行]，右列金额+账户+状态 */}
        <div className="flex flex-1 min-w-0 items-stretch gap-2">
          <div
            className={`flex min-h-0 min-w-0 flex-1 flex-col gap-1 ${leftColJustify} ${isChild ? "text-[10px]" : "text-xs"}`}
          >
            <span
              className={`${isChild ? "text-xs" : "text-sm"} ${isChild ? "font-normal" : "font-medium"} text-gray-900 dark:text-zinc-100 truncate`}
            >
              {formatDisplayTitle(transaction)}
            </span>
            <span className="truncate text-gray-500 dark:text-zinc-500">
              {displayTxTime(transaction.datetime, "short")}
              {transaction.merchant && ` - ${transaction.merchant}`}
            </span>
            {hasLeftMarkers && (
              <div className="flex items-center gap-1.5 text-gray-500">
                {transaction.parent_id && (
                  <LinkIcon className="w-3.5 h-3.5 shrink-0" title="附加到其他交易" />
                )}
                {childrenCount > 0 && (
                  <span
                    className="flex items-center gap-0.5"
                    title={`${childrenCount} 个交易附加到该交易`}
                  >
                    <RectangleStackIcon className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-[10px]">{childrenCount}</span>
                  </span>
                )}
                {splitsCount > 0 && (
                  <span className="flex items-center gap-0.5" title={`包含 ${splitsCount} 个拆账`}>
                    <ScissorsIcon className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-[10px]">{splitsCount}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          <div
            className={`flex min-w-0 shrink-0 flex-col items-end gap-1 ${isChild ? "text-[10px]" : "text-xs"}`}
          >
            <span
              className={`${isChild ? "text-xs" : "text-sm"} ${isChild ? "font-normal" : "font-bold"} leading-tight ${isCanceled ? "text-gray-500 dark:text-gray-400" : getAmountColorClass(transaction.transaction_type ?? null)}`}
            >
              <span className={isCanceled ? "inline-block decoration-1 line-through" : ""}>
                {amountText}
              </span>
            </span>
            <span className="max-w-[60px] truncate text-gray-500 dark:text-zinc-500 lg:max-w-[80px]">
              {transaction.account?.name || "-"}
            </span>
            {showStatusChip && transaction.status && (
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
});
