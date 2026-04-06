"use client";

import type { TransactionType } from "@/types";

import { useState } from "react";
import { Input } from "@heroui/react";
import { Select, SelectItem } from "@heroui/react";
import { DatePicker } from "@heroui/react";
import { Button } from "@heroui/react";
import { EllipsisHorizontalIcon } from "@heroicons/react/24/outline";
import { parseDateTime } from "@internationalized/date";

import { AmountInput } from "./common/amount-input";

import { useAppData } from "@/components/context/app-data-context";
import { useTransactionEditor } from "@/components/context/transaction-editor-context";
import { TextPaintSelector } from "@/components/text-paint-selector";
import { getAmountColorClass } from "@/lib/transaction/transaction-display";

interface TxFieldInputsProps {
  selectedTxType?: TransactionType;
}

export function TxFieldInputs({ selectedTxType }: TxFieldInputsProps) {
  const { accounts } = useAppData();
  const editor = useTransactionEditor();
  const tx = editor.currentTransaction;
  const children = editor.currentChildTransactions;
  const entranceSummary = editor.entranceSummary;
  const [isNamePaintSelectorOpen, setIsNamePaintSelectorOpen] = useState(false);
  const [isMerchantPaintSelectorOpen, setIsMerchantPaintSelectorOpen] = useState(false);

  if (!tx) return null;

  const isMultiEntranceCompact = entranceSummary.length >= 2;

  const amountInput =
    entranceSummary.length === 1 && children.length > 0 ? (
      <>
        <span
          className={`text-xs font-bold ${getAmountColorClass(entranceSummary[0]!.transaction_type)} shrink-0`}
        >
          {entranceSummary[0]!.amount === 0 ? "该账单正负相抵" : "汇总后"}
        </span>
        <div className="flex-1 min-h-0">
          <AmountInput
            value={Math.abs(entranceSummary[0]!.amount).toFixed(2)}
            transactionType={entranceSummary[0]!.transaction_type}
            isDisabled
          />
        </div>
      </>
    ) : (
      <div className="flex-1 min-h-0">
        <AmountInput
          value={Math.abs(tx.amount).toFixed(2)}
          onChange={(value) => editor.updateFields({ amount: value })}
          transactionType={selectedTxType}
        />
      </div>
    );

  const nameInput = (
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
            <EllipsisHorizontalIcon
              className="w-4 h-4 text-gray-500 dark:text-gray-400"
              strokeWidth={2}
            />
          </Button>
        ) : null
      }
    />
  );

  const merchantInput = (
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
          {tx.title && (
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onPress={() => setIsMerchantPaintSelectorOpen(true)}
              className="min-w-unit-6 w-6 h-6"
              aria-label="涂抹选择文字"
            >
              <EllipsisHorizontalIcon
                className="w-4 h-4 text-gray-500 dark:text-gray-400"
                strokeWidth={2}
              />
            </Button>
          )}
        </div>
      }
    />
  );

  const accountSelect = (
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
        <SelectItem key={account.id.toString()}>{account.name}</SelectItem>
      ))}
    </Select>
  );

  const dateField = (
    <DatePicker
      label="日期时间"
      labelPlacement="outside"
      granularity="second"
      hourCycle={24}
      value={(() => {
        if (!tx.datetime) return null;
        try {
          return parseDateTime(tx.datetime);
        } catch {
          return null;
        }
      })()}
      onChange={(date) =>
        editor.updateFields({
          datetime: date ? date.toString() : null,
        })
      }
      size="sm"
      variant="underlined"
      classNames={{ input: "font-normal" }}
    />
  );

  const remarkInput = (
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
  );

  return (
    <div className="w-full min-w-0">
      {isMultiEntranceCompact ? (
        <div
          className="grid gap-3 min-w-0 items-end"
          style={{
            gridTemplateColumns:
              "minmax(0,1.1fr) minmax(0,1.1fr) minmax(0,1.35fr) minmax(0,1.35fr)",
          }}
        >
          <div className="min-w-0">{nameInput}</div>
          <div className="min-w-0">{merchantInput}</div>
          <div className="min-w-0">{dateField}</div>
          <div className="min-w-0">{remarkInput}</div>
        </div>
      ) : (
        <div className="grid gap-3 min-h-28 min-w-0" style={{ gridTemplateColumns: "200px 1fr" }}>
          {/* 左侧：金额输入 */}
          <div className="row-span-2 flex flex-col gap-1 min-h-0" style={{ position: "relative" }}>
            {amountInput}
          </div>

          {/* 右侧第一行：名称、商户、账户 */}
          <div className="grid gap-3" style={{ gridTemplateColumns: "7fr 7fr 5fr" }}>
            {nameInput}
            {merchantInput}
            {accountSelect}
          </div>

          {/* 右侧第二行：日期时间、备注 */}
          <div className="grid gap-3 items-end" style={{ gridTemplateColumns: "2fr 3fr" }}>
            {dateField}
            {remarkInput}
          </div>
        </div>
      )}

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
