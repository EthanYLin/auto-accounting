"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@heroui/react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

import { dispatchCommand, useCommandListener } from "@/lib/commands";
import { useTransactionEditor } from "@/components/context/transaction-editor-context";

export function NavigationControls() {
  const { currentIndex, totalCount } = useTransactionEditor();
  const [indexInput, setIndexInput] = useState("");
  const [isEditingIndex, setIsEditingIndex] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsEditingIndex(false);
  }, [currentIndex, totalCount]);

  useEffect(() => {
    if (isEditingIndex) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditingIndex]);

  const commitIndex = useCallback(() => {
    const index = parseInt(indexInput, 10);
    if (!Number.isNaN(index)) {
      dispatchCommand("go-to-index", { index });
      setTimeout(() => dispatchCommand("locate-current"), 0);
    }
    setIsEditingIndex(false);
  }, [indexInput]);

  const startEditing = useCallback(() => {
    setIndexInput(String(currentIndex));
    setIsEditingIndex(true);
  }, [currentIndex]);

  useCommandListener("edit-index", startEditing);

  return (
    <div className="flex items-center gap-2">
      <Button
        isIconOnly
        variant="ghost"
        size="sm"
        disabled={currentIndex <= 1}
        onPress={() => dispatchCommand("go-previous")}
        aria-label="上一条"
      >
        <ChevronLeftIcon className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-2 text-sm dark:bg-gray-800">
        {isEditingIndex ? (
          <input
            className="w-[4ch] bg-transparent text-center font-semibold text-gray-900 outline-none [appearance:textfield] dark:text-gray-100 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            max={totalCount}
            min={1}
            ref={inputRef}
            type="number"
            value={indexInput}
            onBlur={commitIndex}
            onChange={(event) => setIndexInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                commitIndex();
              } else if (event.key === "Escape") {
                setIsEditingIndex(false);
              }
            }}
          />
        ) : (
          <button
            aria-label="输入序号跳转"
            className="min-w-[2ch] cursor-pointer text-center font-semibold text-gray-900 hover:underline dark:text-gray-100"
            title="点击输入序号跳转"
            type="button"
            onClick={startEditing}
          >
            {currentIndex}
          </button>
        )}
        <span className="text-gray-500 dark:text-gray-400">/</span>
        <span className="font-medium text-gray-700 dark:text-gray-300">{totalCount}</span>
      </div>

      <Button
        isIconOnly
        variant="ghost"
        size="sm"
        disabled={currentIndex >= totalCount}
        onPress={() => dispatchCommand("go-next")}
        aria-label="下一条"
      >
        <ChevronRightIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}
