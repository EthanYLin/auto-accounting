"use client";

import { Button } from "@heroui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import type { TransactionStatus } from "@/types";
import { ALL_TRANSACTION_STATUS } from "@/constants/transaction-status";

interface ActionBarProps {
  currentIndex: number;
  totalCount: number;
  status?: TransactionStatus;
  onPrevious?: () => void;
  onNext?: () => void;
}

export function ActionBar({
  currentIndex,
  totalCount,
  status,
  onPrevious,
  onNext,
}: ActionBarProps) {
  const statusConfig = status ? ALL_TRANSACTION_STATUS.find((item) => item.name === status) : null;

  return (
    <div className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* 左侧：导航控件 */}
          <div className="flex items-center gap-2">
            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              isDisabled={currentIndex <= 1}
              onPress={onPrevious}
              aria-label="上一条"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </Button>
            
            <div className="flex items-center gap-1 text-sm px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <span className="text-gray-900 dark:text-gray-100 font-semibold min-w-[2ch] text-center">
                {currentIndex}
              </span>
              <span className="text-gray-500 dark:text-gray-400">/</span>
              <span className="text-gray-700 dark:text-gray-300 font-medium">
                {totalCount}
              </span>
            </div>
            
            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              isDisabled={currentIndex >= totalCount}
              onPress={onNext}
              aria-label="下一条"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </Button>
          </div>

          {/* 右侧：状态显示 */}
          {statusConfig && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${statusConfig.bgColor} transition-colors`}>
              {/* 状态指示点 */}
              <div className="relative">
                <div className={`w-2 h-2 rounded-full ${statusConfig.dotColor} shadow-sm`} />
                <div className={`absolute inset-0 w-2 h-2 rounded-full ${statusConfig.dotColor} opacity-75`} />
              </div>
              {/* 状态文字 */}
              <span className={`text-sm font-medium ${statusConfig.color}`}>
                {status}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

