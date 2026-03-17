"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@heroui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

interface NavigationControlsProps {
  currentIndex: number;
  totalCount: number;
  onPrev: () => void;
  onNext: () => void;
  onGoToIndex: (index: number) => void;
  onLocateCurrent: () => void;
}

export function NavigationControls({
  currentIndex,
  totalCount,
  onPrev,
  onNext,
  onGoToIndex,
  onLocateCurrent,
}: NavigationControlsProps) {
  const [indexInput, setIndexInput] = useState("");
  const [isEditingIndex, setIsEditingIndex] = useState(false);

  useEffect(() => {
    setIsEditingIndex(false);
  }, [currentIndex, totalCount]);

  const commitIndex = useCallback(() => {
    const index = parseInt(indexInput, 10);
    if (!Number.isNaN(index)) {
      onGoToIndex(index);
      setTimeout(onLocateCurrent, 0);
    }
    setIsEditingIndex(false);
  }, [indexInput, onGoToIndex]);

  const startEditing = useCallback(() => {
    setIndexInput(String(currentIndex));
    setIsEditingIndex(true);
  }, [currentIndex]);

  return (
    <div className="flex items-center gap-2">
      <Button
        isIconOnly
        variant="ghost"
        size="sm"
        disabled={currentIndex <= 1}
        onPress={onPrev}
        aria-label="上一条"
      >
        <ChevronLeftIcon className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-2 text-sm dark:bg-gray-800">
        {isEditingIndex ? (
          <input
            type="number"
            className="w-[4ch] bg-transparent text-center font-semibold text-gray-900 outline-none [appearance:textfield] dark:text-gray-100 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            value={indexInput}
            autoFocus
            min={1}
            max={totalCount}
            onChange={(event) => setIndexInput(event.target.value)}
            onBlur={commitIndex}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                commitIndex();
              } else if (event.key === "Escape") {
                setIsEditingIndex(false);
              }
            }}
          />
        ) : (
          <span
            className="min-w-[2ch] cursor-pointer text-center font-semibold text-gray-900 hover:underline dark:text-gray-100"
            title="点击输入序号跳转"
            onClick={startEditing}
          >
            {currentIndex}
          </span>
        )}
        <span className="text-gray-500 dark:text-gray-400">/</span>
        <span className="font-medium text-gray-700 dark:text-gray-300">{totalCount}</span>
      </div>

      <Button
        isIconOnly
        variant="ghost"
        size="sm"
        disabled={currentIndex >= totalCount}
        onPress={onNext}
        aria-label="下一条"
      >
        <ChevronRightIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}
