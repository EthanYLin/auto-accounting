"use client";

import { useState } from "react";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { DateInput, TimeInput } from "@heroui/date-input";
import { DatePicker } from "@heroui/date-picker";
import { Account } from "@/types/account";
import { TransactionStatus } from "@/types/transaction-status";
import { CalendarDate, parseDate, today, getLocalTimeZone } from "@internationalized/date";
import { I18NProvider } from "next/dist/server/lib/i18n-provider";
import { I18nProvider } from "@react-aria/i18n";
import { CATEGORY_TREE, type TxType } from "@/types/category";
import { TransactionType } from "@/types/transaction-type";

interface TransactionInputProps {
    selectedTxType?: TxType;
}

export function TransactionInput({ selectedTxType }: TransactionInputProps) {
    const [formData, setFormData] = useState({
        amount: "",
        account: "",
        date: today(getLocalTimeZone()),
        time: "",
        name: "",
        merchant: ""
    });

    const [rawAmountInput, setRawAmountInput] = useState("");
    const [parsedAmount, setParsedAmount] = useState(0);

    // 获取当前TxType的配置
    const getTxTypeConfig = () => {
        if (!selectedTxType) return null;
        return CATEGORY_TREE[selectedTxType];
    };

    // 获取符号显示逻辑
    const getAmountSymbol = () => {
        if (!selectedTxType) return '';
        
        switch (selectedTxType) {
            case 'EXPENSE':
            case 'RECEIVABLE':
                return '-';
            case 'INCOME':
            case 'PAYABLE':
                return '+';
            case 'TRANSFER':
                return '';
            default:
                return '';
        }
    };

    // 获取颜色类名
    const getAmountColorClass = () => {
        const config = getTxTypeConfig();
        if (!config) return 'text-default-600';
        return config.foreColor;
    };

    // 解析输入为正数
    const parsePositiveNumber = (input: string): number => {
        try {
            // 移除所有非数字和小数点的字符
            const cleanInput = input.replace(/[^\d.]/g, '');
            const result = parseFloat(cleanInput) || 0;
            return Math.abs(result); // 确保是正数
        } catch {
            return 0;
        }
    };

    // 格式化金额显示
    const formatAmount = (amount: number): string => {
        const abs = Math.abs(amount);
        return abs.toFixed(2);
    };

    // 处理金额输入失焦
    const handleAmountBlur = () => {
        if (rawAmountInput.trim()) {
            const parsed = parsePositiveNumber(rawAmountInput);
            setParsedAmount(parsed);
            setRawAmountInput(formatAmount(parsed));
            handleInputChange("amount", parsed.toString());
        }
    };

    // 获取当前时间
    const getCurrentTime = () => {
        const now = new Date();
        const time = now.toTimeString().split(' ')[0].slice(0, 5); // HH:MM
        return time;
    };

    // 初始化当前时间
    const initializeTime = () => {
        const time = getCurrentTime();
        setFormData(prev => ({
            ...prev,
            time
        }));
    };

    // 如果时间为空，则初始化
    if (!formData.time) {
        initializeTime();
    }

    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    return (
        <div className="w-full">
            <div className="grid gap-4 h-32" style={{ gridTemplateColumns: "3fr 7fr" }}>
                 <div className="row-span-2">
                     <Input
                         type="text"
                         placeholder="0.00"
                         value={rawAmountInput}
                         onValueChange={setRawAmountInput}
                         onBlur={handleAmountBlur}
                         startContent={
                             <div className="pointer-events-none flex items-center">
                                 <span className="text-default-400 text-xl">¥</span>
                             </div>
                         }
                         classNames={{
                             base: "h-full",
                             inputWrapper: "h-full min-h-[120px] flex items-center",
                             input: `text-3xl font-bold text-center ${getAmountColorClass()}`
                         }}
                         size="lg"
                         variant="bordered"
                     />
                 </div>

                {/* 右侧第一行：账户、日期、时间、状态 */}
                <div className="grid grid-cols-3 gap-2" style={{ gridTemplateColumns: "2fr 3fr 2fr" }}>
                    {/* 账户选择 */}
                    <Select
                        label="账户"
                        selectedKeys={formData.account ? [formData.account] : []}
                        onSelectionChange={(keys) => {
                            const account = Array.from(keys)[0] as string;
                            handleInputChange("account", account);
                        }}
                        size="md"
                        variant="bordered"
                        classNames={{ value: "font-bold" }}
                    >
                        {Object.entries(Account).map(([key, value]) => (
                            <SelectItem key={value}>
                                {value}
                            </SelectItem>
                        ))}
                    </Select>

                    <DatePicker
                        label="日期时间"
                        granularity="minute"
                        hourCycle={24}
                        onChange={(date) => handleInputChange("date", date)}
                        size="md"
                        variant="bordered"
                        classNames={{ input: "font-bold" }}
                    />

                    {/* 状态（只读） */}
                    <Input
                        label="状态"
                        value={TransactionStatus.PROCESSED_CANCELLED}
                        isReadOnly
                        size="md"
                        variant="bordered"
                        classNames={{ input: "font-bold" }}
                    />
                </div>

                {/* 右侧第二行：名称输入和商户输入 */}
                <div className="grid grid-cols-2 gap-2">
                    {/* 名称输入 */}
                    <Input
                        label="名称"
                        value={formData.name}
                        onValueChange={(value) => handleInputChange("name", value)}
                        size="lg"
                        variant="bordered"
                        classNames={{ input: "font-bold" }}
                    />

                    {/* 商户输入 */}
                    <Input
                        label="商户"
                        value={formData.merchant}
                        onValueChange={(value) => handleInputChange("merchant", value)}
                        size="lg"
                        variant="bordered"
                        classNames={{ input: "font-bold" }}
                    />
                </div>
            </div>

        </div>
    );
}
