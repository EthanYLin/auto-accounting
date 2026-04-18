"use client";

import type { TransactionType } from "@/types";

import { useState, useEffect, useRef } from "react";
import { Input } from "@heroui/react";

import { getAmountColorClass, getAmountSymbol } from "@/lib/transaction/transaction-display";

const SIZE_PRESETS = {
  lg: { textSize: "text-2xl", minHeight: "min-h-[106px]" },
  md: { textSize: "text-xl", minHeight: "min-h-[60px]" },
};

interface AmountInputProps {
  value: string;
  /** 失焦确认金额时回调；默认无操作 */
  onChange?: (value: string) => void;
  transactionType?: TransactionType;
  /** 是否禁用输入，默认 false */
  isDisabled?: boolean;
  /** 预设尺寸: "md" 紧凑 / "lg" 默认 */
  size?: "md" | "lg";
  /** 金额数字与符号的字体大小（覆盖 size 预设） */
  textSize?: string;
  /** inputWrapper 的最小高度（覆盖 size 预设） */
  minHeight?: string;
  /** 组件根元素额外的 className（如宽度），默认 "h-full" */
  className?: string;
}

export function AmountInput({
  value,
  onChange = () => {},
  transactionType,
  isDisabled = false,
  size,
  textSize: textSizeProp,
  minHeight: minHeightProp,
  className = "h-full",
}: AmountInputProps) {
  const preset = SIZE_PRESETS[size ?? "lg"];
  const textSize = textSizeProp ?? preset.textSize;
  const minHeight = minHeightProp ?? preset.minHeight;
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
        return Math.abs(Math.round(result * 100) / 100);
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

  const colorClass = getAmountColorClass(transactionType);

  if (isDisabled) {
    return (
      <div className={`${className} ${minHeight} flex items-center px-3`}>
        <span className={`${textSize} whitespace-nowrap`}>
          <span className="text-default-400">¥ </span>
          <span className={colorClass}>{getAmountSymbol(transactionType)}</span>
        </span>
        <span className={`flex-1 ${textSize} font-bold text-right pr-1 ${colorClass}`}>
          {value}
        </span>
      </div>
    );
  }

  return (
    <Input
      ref={amountInputRef}
      aria-label="交易金额"
      startContent={
        <span className={`${textSize} whitespace-nowrap`}>
          <span className="text-default-400">¥ </span>
          <span className={colorClass}>{getAmountSymbol(transactionType)}</span>
        </span>
      }
      type="text"
      placeholder="0.00"
      value={amountInput}
      onValueChange={setAmountInput}
      onFocus={handleAmountFocus}
      onBlur={handleAmountBlur}
      onKeyDown={handleAmountKeyDown}
      classNames={{
        base: "h-full",
        inputWrapper: `!h-full ${minHeight} flex items-center dark:border-white/[0.12] dark:bg-white/[0.03]`,
        input: `${textSize} font-bold text-right pr-1 ${colorClass}`,
      }}
      size="sm"
      variant="bordered"
    />
  );
}
