"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Checkbox } from "@heroui/checkbox";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

interface ActionBarProps {
  currentId?: number;
  totalCount?: number;
  autoSwitch?: boolean;
  onAutoSwitchChange?: (value: boolean) => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onIdChange?: (id: number) => void;
  onComplete?: () => void;
  onLater?: () => void;
  onCancel?: () => void;
  onSave?: () => void;
}

export function ActionBar({
  currentId = 1,
  totalCount = 10,
  autoSwitch = false,
  onAutoSwitchChange,
  onPrevious,
  onNext,
  onIdChange,
  onComplete,
  onLater,
  onCancel,
  onSave
}: ActionBarProps) {
  const [inputId, setInputId] = useState(currentId.toString());

  // 同步 currentId 变化到 inputId
  useEffect(() => {
    setInputId(currentId.toString());
  }, [currentId]);

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
    <div className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          
          {/* 左侧：导航控件 */}
          <div className="flex items-center gap-2">
            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              isDisabled={currentId <= 1}
              onPress={onPrevious}
              aria-label="上一条"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </Button>
            
            <div className="flex items-center gap-1 text-sm">
              <Input
                value={inputId}
                onValueChange={handleIdInputChange}
                onBlur={handleIdInputBlur}
                className="w-16"
                size="sm"
                variant="bordered"
                aria-label="当前记录编号"
                classNames={{
                  input: "text-center text-sm",
                  inputWrapper: "h-8 min-h-8"
                }}
              />
              <span className="text-gray-500 dark:text-gray-400 mx-1">/</span>
              <span className="text-gray-700 dark:text-gray-300 font-medium">
                {totalCount}
              </span>
            </div>
            
            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              isDisabled={currentId >= totalCount}
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

