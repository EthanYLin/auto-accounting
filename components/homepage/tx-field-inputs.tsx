"use client";

import { useState } from "react";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { DatePicker } from "@heroui/date-picker";
import { Button } from "@heroui/button";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { InformationCircleIcon, EllipsisHorizontalIcon, DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import type { TransactionType, TransactionStatus } from "@/types";
import type { DateValue } from "@internationalized/date";
import { useAppData } from "@/components/context/app-data-context";
import { AmountInput } from "./amount-input";
import { TextPaintSelector } from "@/components/text-paint-selector";

export interface TxFieldInputsData {
    amount: string;
    account: string;
    date: DateValue | null;
    name: string;
    merchant: string;
    status?: TransactionStatus;
    source?: string | null;
    remark?: string | null;
    title?: string | null;
    raw_info?: Record<string, string> | null;
}

interface TxFieldInputsProps {
    selectedTxType?: TransactionType;
    formData: TxFieldInputsData;
    onChange: (field: keyof TxFieldInputsData, value: any) => void;
}

export function TxFieldInputs({ selectedTxType, formData, onChange }: TxFieldInputsProps) {
    const { accounts } = useAppData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isNamePaintSelectorOpen, setIsNamePaintSelectorOpen] = useState(false);
    const [isMerchantPaintSelectorOpen, setIsMerchantPaintSelectorOpen] = useState(false);

    return (
        <div className="w-full">
            <div className="grid gap-3 h-28" style={{ gridTemplateColumns: "200px 1fr" }}>
                 
                 { /* 左侧：金额输入 */}
                 <div className="row-span-2" style={{ position: 'relative' }}>
                     <AmountInput
                        value={formData.amount}
                        onChange={(value) => onChange("amount", value)}
                        transactionType={selectedTxType}
                    />
                 </div>

                {/* 右侧第一行：名称、商户、账户 */}
                <div className="grid gap-3" style={{ gridTemplateColumns: "7fr 7fr 5fr" }}>
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
                        endContent={
                            formData.title ? (
                                <Button
                                    isIconOnly
                                    size="sm"
                                    variant="light"
                                    onPress={() => setIsNamePaintSelectorOpen(true)}
                                    className="min-w-unit-6 w-6 h-6"
                                    aria-label="涂抹选择文字"
                                >
                                    <EllipsisHorizontalIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" strokeWidth={2} />
                                </Button>
                            ) : null
                        }
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
                        endContent={
                            <div className="flex gap-1">
                                {/* 涂抹选择商户 */}
                                {formData.title && (
                                    <Button
                                        isIconOnly
                                        size="sm"
                                        variant="light"
                                        onPress={() => setIsMerchantPaintSelectorOpen(true)}
                                        className="min-w-unit-6 w-6 h-6"
                                        aria-label="涂抹选择文字"
                                    >
                                        <EllipsisHorizontalIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" strokeWidth={2} />
                                    </Button>
                                )}
                            </div>
                        }
                    />

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
                </div>

                {/* 右侧第二行：日期时间、备注、更多信息按钮 */}
                <div className="grid gap-3 items-end" style={{ gridTemplateColumns: "2fr 3fr auto" }}>
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

                    {/* 备注输入 */}
                    <Input
                        label="备注"
                        placeholder="无备注"
                        labelPlacement="outside"
                        value={formData.remark || ""}
                        onValueChange={(value) => onChange("remark", value)}
                        size="sm"
                        variant="underlined"
                        classNames={{ input: "font-normal" }}
                    />

                    {/* 更多信息按钮 - 只显示图标 */}
                    <Button
                        isIconOnly
                        size="sm"
                        variant="flat"
                        onPress={() => setIsModalOpen(true)}
                        className="mb-1"
                        aria-label="更多信息"
                    >
                        <InformationCircleIcon className="w-5 h-5" />
                    </Button>
                </div>

                
            </div>

            {/* 更多信息Modal */}
            <Modal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)}
                size="2xl"
                scrollBehavior="inside"
            >
                <ModalContent>
                    <ModalHeader className="flex flex-col gap-1">
                        账单详细信息
                    </ModalHeader>
                    <ModalBody>
                        <div className="space-y-4">
                            {/* 状态 */}
                            <div>
                                <h3 className="text-sm font-semibold text-foreground-600 mb-1">状态</h3>
                                <p className="text-sm">{formData.status || "无"}</p>
                            </div>

                            {/* 来源 */}
                            <div>
                                <h3 className="text-sm font-semibold text-foreground-600 mb-1">来源</h3>
                                <p className="text-sm">{formData.source || "无"}</p>
                            </div>

                            {/* 导入描述 */}
                            <div>
                                <h3 className="text-sm font-semibold text-foreground-600 mb-1">导入描述</h3>
                                <p className="text-sm">{formData.title || "无"}</p>
                            </div>

                            {/* 导入备注 */}
                            <div>
                                <h3 className="text-sm font-semibold text-foreground-600 mb-1">导入备注</h3>
                                <p className="text-sm whitespace-pre-wrap">{formData.remark || "无"}</p>
                            </div>

                            {/* 原始账单信息 */}
                            <div>
                                <h3 className="text-sm font-semibold text-foreground-600 mb-2">原始账单信息</h3>
                                {formData.raw_info && Object.keys(formData.raw_info).length > 0 ? (
                                    (() => {
                                        const filteredEntries = Object.entries(formData.raw_info).filter(
                                            ([_, value]) => value !== null && value !== undefined && value !== ""
                                        );
                                        return filteredEntries.length > 0 ? (
                                            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 space-y-2">
                                                {filteredEntries.map(([key, value]) => (
                                                    <div key={key} className="flex gap-2">
                                                        <span className="text-xs font-medium text-foreground-600 min-w-[100px]">
                                                            {key}:
                                                        </span>
                                                        <span className="text-xs text-foreground flex-1 break-all">
                                                            {value}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500">无原始信息</p>
                                        );
                                    })()
                                ) : (
                                    <p className="text-sm text-gray-500">无原始信息</p>
                                )}
                            </div>
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button 
                            color="primary" 
                            variant="light" 
                            onPress={() => setIsModalOpen(false)}
                        >
                            关闭
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* 名称文字涂抹选择器 */}
            <TextPaintSelector
                isOpen={isNamePaintSelectorOpen}
                raw={formData.title || ""}
                result={formData.name}
                onComplete={(result) => {
                    onChange("name", result);
                    setIsNamePaintSelectorOpen(false);
                }}
                onCancel={() => {
                    setIsNamePaintSelectorOpen(false);
                }}
            />

            {/* 商户文字涂抹选择器 */}
            <TextPaintSelector
                isOpen={isMerchantPaintSelectorOpen}
                raw={formData.title || ""}
                result={formData.merchant}
                onComplete={(result) => {
                    onChange("merchant", result);
                    setIsMerchantPaintSelectorOpen(false);
                }}
                onCancel={() => {
                    setIsMerchantPaintSelectorOpen(false);
                }}
            />

        </div>
    );
}
