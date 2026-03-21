"use client";

import type { FourChainState } from "@/components/homepage/common/four-chain-selector";
import type { AmountSplitPayload } from "@/lib/split-actions";
import type { SplitEntryData } from "@/components/homepage/split-area/split-entry-editor";
import type { TransactionWithRelations } from "@/types";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/react";

import { AmountInput } from "@/components/homepage/common/amount-input";
import { FourChainSelector } from "@/components/homepage/common/four-chain-selector";
import { computeSplitCentsPerRow } from "@/lib/split-actions";
import { SplitDrawerShell } from "@/components/homepage/split-area/drawers/split-drawer-shell";
import { SplitNamePanel } from "@/components/homepage/split-area/drawers/split-name-panel";
import { SplitRowCountPresets } from "@/components/homepage/split-area/drawers/split-row-count-presets";
import { useSplitDrawerBase } from "@/components/homepage/split-area/drawers/use-split-drawer-base";

type PresetKey = "2" | "3" | "4" | "custom";

export interface AmountSplitModalProps {
  isOpen: boolean;
  rootTransaction: TransactionWithRelations;
  selectedEntries: SplitEntryData[];
  onConfirm: (payload: AmountSplitPayload) => void;
  onCancel: () => void;
}

export function AmountSplitModal({
  isOpen,
  rootTransaction,
  selectedEntries,
  onConfirm,
  onCancel,
}: AmountSplitModalProps) {
  const {
    totalSigned,
    totalAbsCents,
    allowedTxTypes,
    baseChain,
    rootTransactionName,
    nameSuggestions,
  } = useSplitDrawerBase({ rootTransaction, selectedEntries });

  const [preset, setPreset] = useState<PresetKey>("2");
  const [customCountStr, setCustomCountStr] = useState("5");

  const [partialAbsCents, setPartialAbsCents] = useState<number[]>([0]);
  const [chainStates, setChainStates] = useState<FourChainState[]>([{}, {}]);
  const [name, setName] = useState("");

  const count = chainStates.length;

  const applyRowCount = useCallback(
    (nextCount: number) => {
      const n = Math.max(2, Math.trunc(nextCount));

      setChainStates((prev) => {
        if (n === prev.length) return prev;
        if (n < prev.length) return prev.slice(0, n);
        return [...prev, ...Array.from({ length: n - prev.length }, () => ({ ...baseChain }))];
      });

      setPartialAbsCents((prev) => {
        const nextLen = n - 1;
        if (nextLen === prev.length) return prev;
        if (nextLen < prev.length) return prev.slice(0, nextLen);
        return [...prev, ...new Array(nextLen - prev.length).fill(0)];
      });
    },
    [baseChain],
  );

  useEffect(() => {
    if (!isOpen) return;
    setPreset("2");
    setCustomCountStr("5");

    const nextCount = 2;
    setChainStates(Array.from({ length: nextCount }, () => ({ ...baseChain })));

    // 默认按“等分”预填前 count-1 笔，让最后一笔由系统计算出来。
    const centsPerRow = computeSplitCentsPerRow(totalAbsCents, new Array(nextCount).fill(1));
    setPartialAbsCents(centsPerRow.slice(0, nextCount - 1));

    setName(rootTransactionName);
  }, [isOpen, baseChain, rootTransactionName, totalAbsCents]);

  const handlePresetChange = (key: PresetKey) => {
    setPreset(key);
    if (key !== "custom") {
      applyRowCount(Number(key));
      return;
    }

    const n = parseInt(customCountStr.trim(), 10);
    applyRowCount(Number.isFinite(n) && n > 1 ? n : 5);
  };

  const canSave = useMemo(() => {
    if (count < 2) return false;
    if (!Number.isFinite(totalAbsCents) || totalAbsCents <= 0) return false;
    if (partialAbsCents.length !== count - 1) return false;
    if (partialAbsCents.some((c) => !Number.isFinite(c) || c < 0)) return false;

    const assigned = partialAbsCents.reduce((s, v) => s + v, 0);
    return assigned <= totalAbsCents;
  }, [count, partialAbsCents, totalAbsCents]);

  const splitCents = useMemo(() => {
    const assigned = partialAbsCents.reduce((s, v) => s + v, 0);
    const lastAbsCents = totalAbsCents - assigned;
    return [...partialAbsCents, lastAbsCents];
  }, [partialAbsCents, totalAbsCents]);

  const setPartialCentsAt = (index: number, nextAbsCents: number) => {
    setPartialAbsCents((prev) => {
      const copy = [...prev];
      copy[index] = nextAbsCents;
      return copy;
    });
  };

  const setChainAt = (index: number, next: FourChainState) => {
    setChainStates((prev) => {
      const copy = [...prev];
      copy[index] = next;
      return copy;
    });
  };

  const handleSave = () => {
    if (!canSave) return;
    onConfirm({
      actionKey: "amount-split",
      count,
      partialAbsCents,
      chainStates,
      name: name.trim(),
    });
  };

  return (
    <SplitDrawerShell
      isOpen={isOpen}
      title="按金额分账"
      totalSigned={totalSigned}
      canSave={canSave}
      onSave={handleSave}
      onCancel={onCancel}
    >
      <div className="grid grid-cols-2 gap-4">
        <SplitRowCountPresets
          preset={preset}
          customCountStr={customCountStr}
          onPresetChange={handlePresetChange}
          onCustomCountStrChange={setCustomCountStr}
          onCustomCountBlur={(raw) => {
            const n = parseInt(raw.trim(), 10);
            if (Number.isFinite(n) && n > 1) {
              applyRowCount(n);
            } else {
              setCustomCountStr(String(count));
            }
          }}
        />

        <SplitNamePanel
          nameSuggestions={nameSuggestions}
          name={name}
          onChangeName={setName}
          onPickSuggestion={(tag) => setName(tag)}
        />
      </div>

      <div className="rounded-medium border border-divider">
        <Table
          removeWrapper
          aria-label="按金额分账明细"
          classNames={{
            th: "text-xs uppercase text-default-500 first:pl-4 last:pr-4",
            td: "align-middle first:pl-4 last:pr-4 py-3",
          }}
        >
          <TableHeader>
            <TableColumn width={140}>金额</TableColumn>
            <TableColumn>类别</TableColumn>
          </TableHeader>
          <TableBody>
            {splitCents.map((cents, index) => {
              const txType = chainStates[index]?.txType;
              const isLast = index === splitCents.length - 1;
              return (
                <TableRow key={index}>
                  <TableCell>
                    <div className="w-28">
                      <AmountInput
                        value={((isLast ? cents : partialAbsCents[index]) / 100).toFixed(2)}
                        onChange={(v) => {
                          if (isLast) return;
                          const parsed = parseFloat(v);
                          const next = Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
                          setPartialCentsAt(index, next);
                        }}
                        transactionType={txType}
                        isDisabled={isLast}
                        textSize="text-sm"
                        minHeight="min-h-[36px]"
                        className="h-full"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <FourChainSelector
                      value={chainStates[index]}
                      onChange={(next) => setChainAt(index, next)}
                      allowedTxTypes={allowedTxTypes}
                      mode="select"
                      selectModeOptions={{ size: "sm", textSize: "sm" }}
                      className="min-w-0 [&>div]:!grid-cols-2 [&>div]:gap-2 sm:[&>div]:!grid-cols-4"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </SplitDrawerShell>
  );
}
