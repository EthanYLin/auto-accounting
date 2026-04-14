"use client";

import type { TransactionType } from "@/types";

import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@heroui/react";
import { Select, SelectItem } from "@heroui/react";
import { DatePicker } from "@heroui/react";
import { Button } from "@heroui/react";
import { EllipsisHorizontalIcon } from "@heroicons/react/24/outline";
import { parseDateTime } from "@internationalized/date";
import { useTheme } from "next-themes";

import { AmountInput } from "./common/amount-input";

import { useAppData } from "@/components/context/app-data-context";
import { useTransactionEditor } from "@/components/context/transaction-editor-context";
import { TextPaintSelector } from "@/components/text-paint-selector";
import { amountToCents, getAmountColorClass } from "@/lib/transaction/transaction-display";

/**
 * 带 debounce 的文本输入 hook。
 * 本地 state 保证输入流畅，延迟后才同步到 store。
 * 外部值变化时（如切换交易、涂抹选择器回填）自动同步。
 *
 * @param registerFlush 可选的 flush 注册函数（来自 editor context），
 *   保存前会调用已注册的 flush 回调，确保未提交的 debounce 值被同步写入 store。
 */
function useDebouncedField(
  externalValue: string,
  onChange: (value: string) => void,
  delay = 300,
  registerFlush?: (callback: () => void) => () => void,
) {
  const [localValue, setLocalValue] = useState(externalValue);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const localValueRef = useRef(localValue);

  // 外部值变化时同步到本地（切换交易、涂抹选择等）
  useEffect(() => {
    setLocalValue(externalValue);
    localValueRef.current = externalValue;
  }, [externalValue]);

  const handleChange = useCallback(
    (value: string) => {
      setLocalValue(value);
      localValueRef.current = value;
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onChangeRef.current(value), delay);
    },
    [delay],
  );

  // 注册 flush 回调，保存前会被调用以立即提交待处理的 debounce 值
  useEffect(() => {
    if (!registerFlush) return;
    const flush = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = undefined;
        onChangeRef.current(localValueRef.current);
      }
    };
    return registerFlush(flush);
  }, [registerFlush]);

  // 卸载时 flush 尚未提交的值，防止切换交易时丢失输入
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        onChangeRef.current(localValueRef.current);
      }
    };
  }, []);

  return [localValue, handleChange] as const;
}

interface TxFieldInputsProps {
  selectedTxType?: TransactionType;
}

export function TxFieldInputs({ selectedTxType }: TxFieldInputsProps) {
  const { accounts } = useAppData();
  const editor = useTransactionEditor();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const labelPlacement = "outside";
  const inputVariant = isDark ? "bordered" : "underlined";
  const tx = editor.currentTransaction;
  const children = editor.currentChildTransactions;
  const entranceSummary = editor.entranceSummary;
  const [isNamePaintSelectorOpen, setIsNamePaintSelectorOpen] = useState(false);
  const [isMerchantPaintSelectorOpen, setIsMerchantPaintSelectorOpen] = useState(false);

  const [localName, setLocalName] = useDebouncedField(
    tx?.name || "",
    (v) => editor.updateFields({ name: v }),
    300,
    editor.registerPendingFlush,
  );
  const [localMerchant, setLocalMerchant] = useDebouncedField(
    tx?.merchant || "",
    (v) => editor.updateFields({ merchant: v }),
    300,
    editor.registerPendingFlush,
  );
  const [localRemark, setLocalRemark] = useDebouncedField(
    tx?.remark || "",
    (v) => editor.updateFields({ remark: v }),
    300,
    editor.registerPendingFlush,
  );

  if (!tx) return null;

  const multiAccount = entranceSummary.length >= 2;
  const sameAccountMerge = entranceSummary.length === 1 && children.length > 0;

  /* 普通金额输入框 (lg) */
  const amountInputLg = sameAccountMerge ? (
    <>
      <span
        className={`text-xs font-bold ${getAmountColorClass(entranceSummary[0]!.transaction_type)} shrink-0`}
      >
        {amountToCents(entranceSummary[0]!.amount) === 0 ? "该账单正负相抵" : "汇总后"}
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

  /* 单行金额输入 (xs,sm,md) */
  const amountInputSm = sameAccountMerge ? (
    <div className="flex min-h-0 flex-col gap-1">
      <span
        className={`text-xs font-bold ${getAmountColorClass(entranceSummary[0]!.transaction_type)} shrink-0`}
      >
        {amountToCents(entranceSummary[0]!.amount) === 0 ? "该账单正负相抵" : "汇总后"}
      </span>
      <div className="min-h-0 flex-1">
        <AmountInput
          value={Math.abs(entranceSummary[0]!.amount).toFixed(2)}
          transactionType={entranceSummary[0]!.transaction_type}
          isDisabled
          size="md"
        />
      </div>
    </div>
  ) : (
    <AmountInput
      value={Math.abs(tx.amount).toFixed(2)}
      onChange={(value) => editor.updateFields({ amount: value })}
      transactionType={selectedTxType}
      size="md"
    />
  );

  const nameInput = (
    <Input
      label="名称"
      labelPlacement={labelPlacement}
      placeholder="请输入名称"
      value={localName}
      onValueChange={setLocalName}
      size={isDark ? "md" : "sm"}
      variant={inputVariant}
      classNames={{ input: "font-bold text-base sm:text-small" }}
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
              className="w-4 h-4 text-gray-500 dark:text-zinc-500"
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
      labelPlacement={labelPlacement}
      placeholder="请输入商户名称"
      value={localMerchant}
      onValueChange={setLocalMerchant}
      size={isDark ? "md" : "sm"}
      variant={inputVariant}
      classNames={{ input: "font-bold text-base sm:text-small" }}
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
                className="w-4 h-4 text-gray-500 dark:text-zinc-500"
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
      labelPlacement={labelPlacement}
      placeholder="请选择账户"
      selectedKeys={tx.account ? [String(tx.account.id)] : []}
      onSelectionChange={(keys) => {
        const account = Array.from(keys)[0] as string;
        editor.updateFields({ account });
      }}
      size={isDark ? "md" : "sm"}
      variant={inputVariant}
      classNames={{ value: "font-normal text-base sm:text-small" }}
    >
      {accounts.map((account) => (
        <SelectItem key={account.id.toString()}>{account.name}</SelectItem>
      ))}
    </Select>
  );

  const dateField = (
    <DatePicker
      label="日期时间"
      labelPlacement={labelPlacement}
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
      size={isDark ? "md" : "sm"}
      variant={inputVariant}
      classNames={{ input: "font-normal text-small" }}
    />
  );

  const remarkInput = (
    <Input
      label="备注"
      placeholder="无备注"
      labelPlacement={labelPlacement}
      value={localRemark}
      onValueChange={setLocalRemark}
      size={isDark ? "md" : "sm"}
      variant={inputVariant}
      classNames={{ input: "font-normal text-base sm:text-small" }}
    />
  );

  return (
    <div className="w-full min-w-0">
      {multiAccount ? (
        /* 多账户布局 */
        <div className="grid min-w-0 items-end gap-3 grid-cols-2 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.1fr)_minmax(0,1.35fr)_minmax(0,1.35fr)]">
          <div className="min-w-0">{nameInput}</div>
          <div className="min-w-0">{merchantInput}</div>
          <div className="min-w-0 col-span-2 lg:col-span-1">{dateField}</div>
          <div className="min-w-0 col-span-2 lg:col-span-1">{remarkInput}</div>
        </div>
      ) : (
        <>
          {/* ── lg+ ── 两列布局：左金额 + 右字段 (第一行：名称、商家、账户；第二行：日期、备注) */}
          <div
            className="hidden lg:grid gap-3 min-h-28 min-w-0"
            style={{ gridTemplateColumns: "200px 1fr" }}
          >
            <div className="row-span-2 flex flex-col gap-1 h-full" style={{ position: "relative" }}>
              {amountInputLg}
            </div>
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: "minmax(0,7fr) minmax(0,7fr) minmax(0,5fr)" }}
            >
              {nameInput}
              {merchantInput}
              {accountSelect}
            </div>
            <div
              className="grid gap-3 items-end"
              style={{ gridTemplateColumns: "minmax(0,2fr) minmax(0,3fr)" }}
            >
              {dateField}
              {remarkInput}
            </div>
          </div>

          {/* ── sm~md ── 两行布局：金额+名称+商家 / 账户+日期+备注 */}
          <div className="hidden sm:grid lg:hidden gap-3 min-w-0">
            <div className="grid gap-3 items-end" style={{ gridTemplateColumns: "auto 1fr 1fr" }}>
              <div className="min-h-0 w-[150px]">{amountInputSm}</div>
              {nameInput}
              {merchantInput}
            </div>
            <div
              className="grid gap-3 items-end"
              style={{ gridTemplateColumns: "minmax(0,5fr) minmax(0,7fr) minmax(0,7fr)" }}
            >
              {accountSelect}
              {dateField}
              {remarkInput}
            </div>
          </div>

          {/* ── <sm ── 四行：金额 / 名称+商家 / 账户+备注/ 日期 */}
          <div className="grid sm:hidden gap-3 min-w-0">
            <div className="min-h-0">{amountInputSm}</div>
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" }}
            >
              {nameInput}
              {merchantInput}
            </div>
            <div
              className="grid gap-3 items-end"
              style={{ gridTemplateColumns: "minmax(0,4fr) minmax(0,6fr)" }}
            >
              {accountSelect}
              {dateField}
            </div>
            <div className="min-h-0">{remarkInput}</div>
          </div>
        </>
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
