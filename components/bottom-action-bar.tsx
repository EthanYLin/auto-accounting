"use client";

import React, { useState } from "react";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

interface BottomActionBarProps {
  currentId?: number;
  totalCount?: number;
  onPrevious?: () => void;
  onNext?: () => void;
  onIdChange?: (id: number) => void;
  onComplete?: () => void;
  onLater?: () => void;
  onCancel?: () => void;
  onSave?: () => void;
}

export function BottomActionBar({
  currentId = 1,
  totalCount = 10,
  onPrevious,
  onNext,
  onIdChange,
  onComplete,
  onLater,
  onCancel,
  onSave
}: BottomActionBarProps) {
  const [inputId, setInputId] = useState(currentId.toString());

  const handleIdInputChange = (value: string) => {
    setInputId(value);
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= totalCount) {
      onIdChange?.(numValue);
    }
  };

  const handleIdInputBlur = () => {
    const numValue = parseInt(inputId);
    if (isNaN(numValue) || numValue < 1 || numValue > totalCount) {
      setInputId(currentId.toString());
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          
          {/* 左侧：导航控件 */}
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              isDisabled={currentId <= 1}
              onPress={onPrevious}
              className="text-gray-600 dark:text-gray-400"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </Button>
            
            <div className="flex items-center gap-1 text-sm">
              <Input
                value={inputId}
                onValueChange={handleIdInputChange}
                onBlur={handleIdInputBlur}
                className="w-12 sm:w-16"
                size="sm"
                variant="bordered"
                classNames={{
                  input: "text-center text-sm",
                  inputWrapper: "h-8 min-h-8"
                }}
              />
              <span className="text-gray-500 dark:text-gray-400 mx-1">/</span>
              <span className="text-gray-700 dark:text-gray-300 font-medium min-w-[2ch]">
                {totalCount}
              </span>
            </div>
            
            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              isDisabled={currentId >= totalCount}
              onPress={onNext}
              className="text-gray-600 dark:text-gray-400"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </Button>
          </div>

          {/* 右侧：操作按钮 */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* 在小屏幕上隐藏取消按钮 */}
            <Button
              variant="ghost"
              size="sm"
              onPress={onCancel}
              className="hidden sm:flex text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
            >
              取消
            </Button>
            
            <Button
              variant="flat"
              size="sm"
              onPress={onSave}
              className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 px-2 sm:px-3"
            >
              <span className="hidden sm:inline">保存</span>
              <span className="sm:hidden">存</span>
            </Button>
            
            <Button
              variant="flat"
              size="sm"
              onPress={onLater}
              className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 px-2 sm:px-3"
            >
              <span className="hidden sm:inline">稍后处理</span>
              <span className="sm:hidden">稍后</span>
            </Button>
            
            <Button
              variant="solid"
              size="sm"
              onPress={onComplete}
              className="bg-green-600 dark:bg-green-500 text-white hover:bg-green-700 dark:hover:bg-green-600 font-medium px-2 sm:px-3"
            >
              完成
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
