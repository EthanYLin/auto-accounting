"use client";

import { useState } from "react";
import { Input } from "@heroui/react";
import { Select, SelectItem } from "@heroui/react";
import { DatePicker } from "@heroui/react";
import { Button } from "@heroui/react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { InformationCircleIcon, EllipsisHorizontalIcon, DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import type { TransactionType } from "@/types";
import { parseDateTime } from "@internationalized/date";
import { useAppData } from "@/components/context/app-data-context";
import { useTransactionEditor } from "@/components/context/transaction-editor-context";
import { AmountInput } from "./common/amount-input";
import { TextPaintSelector } from "@/components/text-paint-selector";

interface TxFieldInputsProps {
    selectedTxType?: TransactionType;
}

export function TxFieldInputs({ selectedTxType }: TxFieldInputsProps) {
    const { accounts } = useAppData();
    const editor = useTransactionEditor();
    const tx = editor.currentTransaction;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isNamePaintSelectorOpen, setIsNamePaintSelectorOpen] = useState(false);
    const [isMerchantPaintSelectorOpen, setIsMerchantPaintSelectorOpen] = useState(false);

    if (!tx) return null;
    const rawInfo = tx.raw_info as Record<string, string> | null;
    return (
        <div className="w-full">
            <div className="grid gap-3 h-28" style={{ gridTemplateColumns: "200px 1fr" }}>
                 
                 { /* 左侧：金额输入 */}
                 <div className="row-span-2" style={{ position: 'relative' }}>
                     <AmountInput
                        value={Math.abs(tx.amount).toFixed(2)}
                        onChange={(value) => editor.updateFields({ amount: value })}
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
                        value={tx.name || ""}
                        onValueChange={(value) => editor.updateFields({ name: value })}
                        size="sm"
                        variant="underlined"
                        classNames={{ input: "font-bold" }}
                        endContent={
                            tx.title ? (
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
                        value={tx.merchant || ""}
                        onValueChange={(value) => editor.updateFields({ merchant: value })}
                        size="sm"
                        variant="underlined"
                        classNames={{ input: "font-bold" }}
                        endContent={
                            <div className="flex gap-1">
                                {/* 涂抹选择商户 */}
                                {tx.title && (
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
                        selectedKeys={tx.account ? [String(tx.account.id)] : []}
                        onSelectionChange={(keys) => {
                            const account = Array.from(keys)[0] as string;
                            editor.updateFields({ account });
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
                        value={tx.datetime ? parseDateTime(tx.datetime) : null}
                        onChange={(date) => editor.updateFields({ datetime: date ? date.toString() : null })}
                        size="sm"
                        variant="underlined"
                        classNames={{ input: "font-normal" }}
                    />

                    {/* 备注输入 */}
                    <Input
                        label="备注"
                        placeholder="无备注"
                        labelPlacement="outside"
                        value={tx.remark || ""}
                        onValueChange={(value) => editor.updateFields({ remark: value })}
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
                                <p className="text-sm">{tx.status || "无"}</p>
                            </div>

                            {/* 来源 */}
                            <div>
                                <h3 className="text-sm font-semibold text-foreground-600 mb-1">来源</h3>
                                <p className="text-sm">{tx.source || "无"}</p>
                            </div>

                            {/* 导入描述 */}
                            <div>
                                <h3 className="text-sm font-semibold text-foreground-600 mb-1">导入描述</h3>
                                <p className="text-sm">{tx.title || "无"}</p>
                            </div>

                            {/* 导入备注 */}
                            <div>
                                <h3 className="text-sm font-semibold text-foreground-600 mb-1">导入备注</h3>
                                <p className="text-sm whitespace-pre-wrap">{tx.remark || "无"}</p>
                            </div>

                            {/* 原始账单信息 */}
                            <div>
                                <h3 className="text-sm font-semibold text-foreground-600 mb-2">原始账单信息</h3>
                                {rawInfo && Object.keys(rawInfo).length > 0 ? (
                                    (() => {
                                        const filteredEntries = Object.entries(rawInfo).filter(
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
                raw={tx.title || ""}
                result={tx.name || ""}
                onComplete={(result) => {
                    editor.updateFields({ name: result });
                    setIsNamePaintSelectorOpen(false);
                }}
                onCancel={() => {
                    setIsNamePaintSelectorOpen(false);
                }}
            />

            {/* 商户文字涂抹选择器 */}
            <TextPaintSelector
                isOpen={isMerchantPaintSelectorOpen}
                raw={tx.title || ""}
                result={tx.merchant || ""}
                onComplete={(result) => {
                    editor.updateFields({ merchant: result });
                    setIsMerchantPaintSelectorOpen(false);
                }}
                onCancel={() => {
                    setIsMerchantPaintSelectorOpen(false);
                }}
            />

        </div>
    );
}
