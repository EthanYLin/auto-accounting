"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@heroui/input";
import type { TransactionType } from "@/types";

interface AmountInputProps {
    value: string;
    onChange: (value: string) => void;
    transactionType?: TransactionType;
}

export function AmountInput({ value, onChange, transactionType }: AmountInputProps) {
    // 金额输入的临时状态（用于实时输入，不影响外部value）
    const [amountInput, setAmountInput] = useState(value);
    
    // 金额输入框的引用
    const amountInputRef = useRef<HTMLInputElement>(null);

    // 当外部value变化时，同步到临时状态
    useEffect(() => {
        setAmountInput(value);
    }, [value]);

    // 获取颜色类名
    const getAmountColorClass = () => {
        if (!transactionType) return 'text-default-600';
        switch (transactionType as TransactionType) {
            case '支出':
                return 'text-green-600';
            case '收入':
                return 'text-red-600';
            case '转出':
            case '转入':
                return 'text-sky-700';
            case '应收款项':
            case '应付款项':
                return 'text-amber-500';
            default:
                return 'text-default-600';
        }
    };

    // 获取金额符号
    const getAmountSymbol = () => {
        if (!transactionType) return '';
        switch (transactionType as TransactionType) {
            case '支出':
            case '应收款项':
            case '转出':
                return '-';
            case '收入':
            case '应付款项':
            case '转入':
                return '+';
            default:
                return '';
        }
    };

    // 计算表达式或解析数字
    const evaluateExpression = (input: string): number => {
        try {
            // 去掉前后的空格
            const trimmed = input.trim();
            if (!trimmed) return 0;
            // 只保留数字、运算符和小数点
            const sanitized = trimmed.replace(/[^0-9+\-*/().]/g, '');
            if (!sanitized) return 0;
            // 评估表达式结果
            const result = Function(`'use strict'; return (${sanitized})`)();
            if (isNaN(result)) return 0;
            // 保留两位小数后取绝对值
            if (typeof result === 'number' && !isNaN(result)) {
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

    // 处理回车键
    const handleAmountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            amountInputRef.current?.blur();
        }
    };

    return (
        <Input
            ref={amountInputRef}
            aria-label="交易金额"
            startContent={
                <span className="text-3xl whitespace-nowrap">
                    <span className="text-default-400">¥ </span>
                    <span className={getAmountColorClass()}>{getAmountSymbol()}</span>
                </span>
            }
            type="text"
            placeholder="0.00"
            value={amountInput}
            onValueChange={setAmountInput}
            onBlur={handleAmountBlur}
            onKeyDown={handleAmountKeyDown}
            classNames={{
                base: "h-full",
                inputWrapper: "h-full min-h-[120px] flex items-center",
                input: `text-3xl font-bold text-right pr-4 ${getAmountColorClass()}`
            }}
            size="lg"
            variant="bordered"
        />
    );
}

