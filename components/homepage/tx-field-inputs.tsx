"use client";

import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { DatePicker } from "@heroui/date-picker";
import type { TransactionType, TransactionStatus } from "@/types";
import type { DateValue } from "@internationalized/date";
import { useAppData } from "@/components/context/app-data-context";
import { AmountInput } from "./amount-input";

export interface TxFieldInputsData {
    amount: string;
    account: string;
    date: DateValue | null;
    name: string;
    merchant: string;
    status?: TransactionStatus;
}

interface TxFieldInputsProps {
    selectedTxType?: TransactionType;
    formData: TxFieldInputsData;
    onChange: (field: keyof TxFieldInputsData, value: any) => void;
}

export function TxFieldInputs({ selectedTxType, formData, onChange }: TxFieldInputsProps) {
    const { accounts } = useAppData();

    return (
        <div className="w-full">
            <div className="grid gap-3 h-28" style={{ gridTemplateColumns: "3fr 7fr" }}>
                 
                 { /* 左侧：金额输入 */}
                 <div className="row-span-2" style={{ position: 'relative' }}>
                     <AmountInput
                        value={formData.amount}
                        onChange={(value) => onChange("amount", value)}
                        transactionType={selectedTxType}
                    />
                 </div>

                {/* 右侧第一行：名称输入和商户输入 */}
                <div className="grid grid-cols-2 gap-3">
                    {/* 名称输入 */}
                    <Input
                        label="名称"
                        labelPlacement="outside"
                        placeholder="请输入名称"
                        value={formData.name}
                        onValueChange={(value) => onChange("name", value)}
                        size="sm"
                        variant="underlined"
                        classNames={{ input: "font-bold" }}
                    />

                    {/* 商户输入 */}
                    <Input
                        label="商户"
                        labelPlacement="outside"
                        placeholder="请输入商户名称"
                        value={formData.merchant}
                        onValueChange={(value) => onChange("merchant", value)}
                        size="sm"
                        variant="underlined"
                        classNames={{ input: "font-bold" }}
                    />
                </div>

                {/* 右侧第二行：账户、日期、时间、状态 */}
                <div className="grid grid-cols-3 gap-3" style={{ gridTemplateColumns: "2fr 3fr 2fr" }}>
                    {/* 账户选择 */}
                    <Select
                        label="账户"
                        labelPlacement="outside"
                        placeholder="请选择账户"
                        selectedKeys={formData.account ? [formData.account] : []}
                        onSelectionChange={(keys) => {
                            const account = Array.from(keys)[0] as string;
                            onChange("account", account);
                        }}
                        size="sm"
                        variant="underlined"
                        classNames={{ value: "font-normal" }}
                    >
                        {accounts.map((account) => (
                            <SelectItem key={account.id.toString()}>
                                {account.name}
                            </SelectItem>
                        ))}
                    </Select>

                    <DatePicker
                        label="日期时间"
                        labelPlacement="outside"
                        granularity="minute"
                        hourCycle={24}
                        value={formData.date}
                        onChange={(date) => onChange("date", date)}
                        size="sm"
                        variant="underlined"
                        classNames={{ input: "font-normal" }}
                    />

                    {/* 状态（只读） */}
                    <Input
                        label="状态"
                        labelPlacement="outside"
                        value={formData.status || ""}
                        isReadOnly
                        size="sm"
                        variant="underlined"
                        classNames={{ input: "font-normal" }}
                    />
                </div>

                
            </div>

        </div>
    );
}
