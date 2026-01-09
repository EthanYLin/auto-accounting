'use client';

import React from 'react';
import { Chip } from '@heroui/chip';
import { LinkIcon, RectangleStackIcon, ScissorsIcon } from '@heroicons/react/24/outline';
import type { TransactionWithRelations } from '@/types';
import { TRANSACTION_TYPES, TRANSACTION_STATUS_COLORS } from '@/constants/transaction-type';

// ========== 工具函数 ==========

/**
 * 截取文本，超过长度显示省略号
 */
function short(text: string | null | undefined, maxLength: number = 5): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * 格式化金额显示
 */
function formatAmount(amount: number, sign: number): string {
  const value = amount * sign;
  const formatted = Math.abs(value).toFixed(2);
  return sign >= 0 ? `¥${formatted}` : `-¥${formatted}`;
}

/**
 * 格式化日期时间为 MM/DD HH:MM
 */
function formatDateTime(datetime: string | null): string {
  if (!datetime) return '-';
  const date = new Date(datetime);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
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
      const txType = TRANSACTION_TYPES.find(t => t.type === transaction.transaction_type);
      if (txType) {
        return {
          icon: txType.icon,
          backColor: txType.back_color,
          foreColor: txType.fore_color,
        };
      }
    }
    return {
      icon: '📝',
      backColor: 'bg-gray-100 dark:bg-gray-800',
      foreColor: 'text-gray-600 dark:text-gray-400',
    };
  };

  const { icon, backColor, foreColor } = getIconAndColor();

  // 获取第一行左侧显示的文本
  const getDisplayName = () => {
    if (transaction.name) return short(transaction.name, 8);
    if (transaction.title) return short(transaction.title, 8);
    const mainLabel = transaction.main_category?.label || '';
    const subLabel = transaction.sub_category?.label || '';
    if (mainLabel && subLabel) return short(`${mainLabel}-${subLabel}`, 8);
    if (mainLabel) return short(mainLabel);
    return '-';
  };

  // 获取金额符号
  const getAmountSign = () => {
    if (transaction.transaction_type) {
      const txType = TRANSACTION_TYPES.find(t => t.type === transaction.transaction_type);
      return txType?.sign || 1;
    }
    return 1;
  };

  const sign = getAmountSign();
  const amountColor = 
    transaction.transaction_type ?
    TRANSACTION_TYPES.find(t => t.type === transaction.transaction_type)?.fore_color || 'text-gray-600 dark:text-gray-400' :
    'text-gray-600 dark:text-gray-400';
  const splitsCount = transaction.splits?.length || 0;
  const childrenCount = transaction.children.length;
  const isChild = !!transaction.parent;

  return (
    <div
      className={`
        ${isChild ? 'pl-8 pr-4 py-2' : 'px-4 py-3'} cursor-pointer transition-colors border-b border-gray-200 dark:border-gray-700
        ${isSelected ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}
      `}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        {/* 子记录的引导线 */}
        {isChild && (
          <div className="flex items-center h-full flex-shrink-0">
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
        
        {/* 左侧圆形图标 */}
        <div className={`${isChild ? 'w-8 h-8 text-base' : 'w-10 h-10 text-lg'} rounded-full ${backColor} ${foreColor} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>

        {/* 右侧内容 */}
        <div className="flex-1 min-w-0">
          {/* 第一行：名称和金额 */}
          <div className="flex items-baseline justify-between mb-1">
            <span className={`${isChild ? 'text-xs' : 'text-sm'} ${isChild ? 'font-normal' : 'font-medium'} text-gray-900 dark:text-gray-100 truncate`}>
              {getDisplayName()}
            </span>
            <span className={`${isChild ? 'text-xs' : 'text-sm'} ${isChild ? 'font-normal' : 'font-bold'} ml-2 flex-shrink-0 ${amountColor}`}>
              {formatAmount(transaction.amount, sign)}
            </span>
          </div>

          {/* 第二行：日期时间和账户 */}
          <div className={`flex items-center justify-between ${isChild ? 'text-[10px]' : 'text-xs'} text-gray-500 dark:text-gray-400 mb-1`}>
            <span className="truncate">
              {formatDateTime(transaction.datetime)}
              {transaction.merchant && ` - ${short(transaction.merchant, 8)}`}
            </span>
            <span className="ml-2 flex-shrink-0 truncate max-w-[80px]">
              {transaction.account?.name || '-'}
            </span>
          </div>

          {/* 第三行：ID、特殊标记和状态 */}
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-1.5 ${isChild ? 'text-[10px]' : 'text-xs'}`}>
              <span className={`${isChild ? 'font-normal' : 'font-semibold'} text-gray-600 dark:text-gray-400`}>
                #{transaction.id}
              </span>
              
              {/* 特殊标记图标 */}
              {transaction.parent && (
                <LinkIcon 
                  className="w-3.5 h-3.5 text-gray-500" 
                  title="附加到其他交易"
                />
              )}
              
              {childrenCount > 0 && (
                <span className="flex items-center gap-0.5 text-gray-500" title={`${childrenCount} 个交易附加到该交易`}>
                  <RectangleStackIcon className="w-3.5 h-3.5" />
                  <span className="text-[10px]">{childrenCount}</span>
                </span>
              )}
              
              {splitsCount > 0 && (
                <span className="flex items-center gap-0.5 text-gray-500" title={`包含 ${splitsCount} 个拆账`}>
                  <ScissorsIcon className="w-3.5 h-3.5" />
                  <span className="text-[10px]">{splitsCount}</span>
                </span>
              )}
            </div>

            {/* 状态 Chip - 子记录不显示 */}
            {!isChild && transaction.status && (
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

