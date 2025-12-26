"use client";

import { Button } from "@heroui/button";
import { Checkbox } from "@heroui/checkbox";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

interface ActionBarProps {
  currentIndex: number;
  totalCount: number;
  autoSwitch?: boolean;
  onAutoSwitchChange?: (value: boolean) => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onComplete?: () => void;
  onLater?: () => void;
  onCancel?: () => void;
  onSave?: () => void;
}

export function ActionBar({
  currentIndex,
  totalCount,
  autoSwitch = false,
  onAutoSwitchChange,
  onPrevious,
  onNext,
  onComplete,
  onLater,
  onCancel,
  onSave
}: ActionBarProps) {

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

            <div className="ml-4">
              <Checkbox
                size="sm"
                isSelected={autoSwitch}
                onValueChange={onAutoSwitchChange}
              >
                <span className="text-sm text-gray-600 dark:text-gray-400">自动切换</span>
              </Checkbox>
            </div>
          </div>

          {/* 右侧：操作按钮 */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onPress={onSave}
            >
              保存
            </Button>
            
            <Button
              variant="flat"
              size="sm"
              color="success"
              onPress={onComplete}
            >
              保存并完成
            </Button>
            
            <Button
              variant="flat"
              size="sm"
              color="warning"
              onPress={onLater}
            >
              保存并取消
            </Button>
            
            <Button
              variant="flat"
              size="sm"
              color="default"
              onPress={onCancel}
            >
              保存并稍后处理
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

