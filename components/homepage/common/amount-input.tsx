"use client";

import type { TransactionType } from "@/types";

import { useState, useEffect, useRef } from "react";
import { Input } from "@heroui/react";

import { getAmountColorClass, getAmountSymbol } from "@/lib/transaction/transaction-display";

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  transactionType?: TransactionType;
  /** 是否禁用输入，默认 false */
  isDisabled?: boolean;
  /** 金额数字与符号的字体大小，默认 "text-2xl" */
  textSize?: string;
  /** inputWrapper 的最小高度，默认 "min-h-[106px]" */
  minHeight?: string;
  /** 组件根元素额外的 className（如宽度），默认 "h-full" */
  className?: string;
}

export function AmountInput({
  value,
  onChange,
  transactionType,
  isDisabled = false,
  textSize = "text-2xl",
  minHeight = "min-h-[106px]",
  className = "h-full",
}: AmountInputProps) {
  // 金额输入的临时状态（用于实时输入，不影响外部value）
  const [amountInput, setAmountInput] = useState(value);

  // 金额输入框的引用
  const amountInputRef = useRef<HTMLInputElement>(null);

  // 当外部value变化时，同步到临时状态
  useEffect(() => {
    setAmountInput(value);
  }, [value]);

  // 计算表达式或解析数字
  const evaluateExpression = (input: string): number => {
    try {
      // 去掉前后的空格
      const trimmed = input.trim();
      if (!trimmed) return 0;
      // 只保留数字、运算符和小数点
      const sanitized = trimmed.replace(/[^0-9+\-*/().]/g, "");
      if (!sanitized) return 0;
      // 评估表达式结果
      const result = Function(`'use strict'; return (${sanitized})`)();
      if (isNaN(result)) return 0;
      // 保留两位小数后取绝对值
      if (typeof result === "number" && !isNaN(result)) {
        return Math.abs(Math.floor(result * 100) / 100);
      }
      return 0;
    } catch {
      return 0;
    }
  };

  // 处理金额输入失焦
  const handleAmountBlur = () => {
    const calculated = evaluateExpression(amountInput);
    const formatted = calculated.toFixed(2);
    setAmountInput(formatted);
    onChange(formatted);
  };

  // 聚焦时若为 0.00 则全选，方便直接输入覆盖
  const handleAmountFocus = () => {
    if (amountInput === "0.00") {
      // 使用 setTimeout 确保 select 在浏览器默认点击行为之后触发
      setTimeout(() => {
        amountInputRef.current?.select();
      }, 0);
    }
  };

  // 处理回车键
  const handleAmountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      amountInputRef.current?.blur();
    }
  };

  return (
    <Input
      ref={amountInputRef}
      aria-label="交易金额"
      startContent={
        <span className={`${textSize} whitespace-nowrap`}>
          <span className="text-default-400">¥ </span>
          <span className={getAmountColorClass(transactionType)}>
            {getAmountSymbol(transactionType)}
          </span>
        </span>
      }
      type="text"
      placeholder="0.00"
      value={amountInput}
      isDisabled={isDisabled}
      onValueChange={setAmountInput}
      onFocus={handleAmountFocus}
      onBlur={handleAmountBlur}
      onKeyDown={handleAmountKeyDown}
      classNames={{
        base: className,
        inputWrapper: `h-full ${minHeight} flex items-center`,
        input: `${textSize} font-bold text-right pr-3 ${getAmountColorClass(transactionType)}`,
      }}
      size="sm"
      variant="bordered"
    />
  );
}
