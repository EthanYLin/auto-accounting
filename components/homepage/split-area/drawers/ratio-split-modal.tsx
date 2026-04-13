"use client";

import type { SplitEntryData } from "@/components/homepage/split-area/split-entry-editor";
import type { RatioSplitPayload } from "@/lib/split-actions";
import type { FourChainState } from "@/components/homepage/common/four-chain-selector";
import type { TransactionWithRelations } from "@/types";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@heroui/react";

import { FourChainSelector } from "@/components/homepage/common/four-chain-selector";
import { getAmountColorClass, getAmountSymbol } from "@/lib/transaction/transaction-display";
import { computeSplitCentsPerRow } from "@/lib/split-actions";
import { SplitDrawerShell } from "@/components/homepage/split-area/drawers/split-drawer-shell";
import { SplitNamePanel } from "@/components/homepage/split-area/drawers/split-name-panel";
import { SplitRowCountPresets } from "@/components/homepage/split-area/drawers/split-row-count-presets";
import { useSplitDrawerBase } from "@/components/homepage/split-area/drawers/use-split-drawer-base";

type PresetKey = "2" | "3" | "4" | "custom";

export interface RatioSplitModalProps {
  isOpen: boolean;
  rootTransaction: TransactionWithRelations;
  selectedEntries: SplitEntryData[];
  onConfirm: (payload: RatioSplitPayload) => void;
  onCancel: () => void;
}

export function RatioSplitModal({
  isOpen,
  rootTransaction,
  selectedEntries,
  onConfirm,
  onCancel,
}: RatioSplitModalProps) {
  const [preset, setPreset] = useState<PresetKey>("2");
  const [customCountStr, setCustomCountStr] = useState("5");
  const [ratios, setRatios] = useState<number[]>([1, 1]);
  const [chainStates, setChainStates] = useState<FourChainState[]>([{}, {}]);
  const [name, setName] = useState("");

  const {
    totalSigned,
    totalAbsCents,
    allowedTxTypes,
    baseChain,
    rootTransactionName,
    nameSuggestions,
  } = useSplitDrawerBase({ rootTransaction, selectedEntries });

  const splitCents = useMemo(
    () => computeSplitCentsPerRow(totalAbsCents, ratios),
    [totalAbsCents, ratios],
  );

  const applyRowCount = useCallback(
    (nextCount: number) => {
      const n = Math.max(2, Math.trunc(nextCount));
      setRatios((prev) => {
        if (n === prev.length) return prev;
        if (n < prev.length) return prev.slice(0, n);
        else return [...prev, ...new Array(n - prev.length).fill(1)];
      });
      setChainStates((prev) => {
        if (n === prev.length) return prev;
        if (n < prev.length) return prev.slice(0, n);
        else return [...prev, ...Array.from({ length: n - prev.length }, () => ({ ...baseChain }))];
      });
    },
    [baseChain],
  );

  useEffect(() => {
    if (!isOpen) return;
    setPreset("2");
    setCustomCountStr("5");
    setRatios(new Array(2).fill(1));
    setChainStates(Array.from({ length: 2 }, () => ({ ...baseChain })));
    setName(rootTransactionName);
  }, [isOpen, baseChain, rootTransactionName]);

  const setRatioAt = (index: number, value: number) => {
    const v = Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
    setRatios((prev) => {
      const next = [...prev];
      next[index] = v;
      return next;
    });
  };

  const setChainAt = (index: number, next: FourChainState) => {
    setChainStates((prev) => {
      const copy = [...prev];
      copy[index] = next;
      return copy;
    });
  };

  const handlePresetChange = (key: PresetKey) => {
    setPreset(key);
    if (key !== "custom") {
      applyRowCount(Number(key));
    } else {
      const n = parseInt(customCountStr.trim(), 10);
      applyRowCount(Number.isFinite(n) && n > 1 ? n : 5);
    }
  };

  const handleSave = () => {
    const count = ratios.length;
    if (count < 2) return;
    if (ratios.some((r) => !Number.isFinite(r) || r <= 0)) return;
    onConfirm({
      actionKey: "ratio-split",
      count,
      ratio: ratios,
      chainStates,
      name: name.trim(),
    });
  };

  const canSave =
    ratios.length >= 2 && ratios.every((r) => Number.isFinite(r) && r > 0) && totalAbsCents > 0;

  return (
    <SplitDrawerShell
      isOpen={isOpen}
      title="按比例分账"
      totalSigned={totalSigned}
      canSave={canSave}
      onSave={handleSave}
      onCancel={onCancel}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              setCustomCountStr(String(ratios.length));
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

      <div className="divide-y divide-divider rounded-medium border border-divider">
        <div className="hidden md:grid md:grid-cols-[84px_120px_1fr] md:gap-3 px-4 py-2">
          <span className="text-xs uppercase text-default-500">比例</span>
          <span className="text-xs uppercase text-default-500">金额</span>
          <span className="text-xs uppercase text-default-500">类别</span>
        </div>
        {ratios.map((ratio, index) => {
          const cents = splitCents[index] ?? 0;
          const txType = chainStates[index]?.txType;
          const symbol = getAmountSymbol(txType);
          const amountStr = (cents / 100).toFixed(2);
          return (
            <div
              key={index}
              className="flex flex-col gap-2 px-4 py-3 md:grid md:grid-cols-[84px_120px_1fr] md:items-center md:gap-3"
            >
              <div className="flex items-center gap-3 md:contents">
                <span className="md:hidden inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-default-100 text-xs font-medium text-default-400">
                  {index + 1}
                </span>
                <div className="flex items-center gap-1.5 md:contents">
                  <span className="text-xs text-default-500 md:hidden">比例</span>
                  <Input
                    size="sm"
                    type="number"
                    min={1}
                    step={1}
                    value={String(ratio)}
                    className="w-20"
                    classNames={{ input: "text-center tabular-nums" }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.currentTarget.blur();
                      }
                    }}
                    onValueChange={(val) => {
                      setRatioAt(index, parseInt(val, 10));
                    }}
                  />
                </div>
                <div className="flex items-center gap-1.5 md:contents">
                  <span className="text-xs text-default-500 md:hidden">金额</span>
                  <span className={`font-medium tabular-nums ${getAmountColorClass(txType)}`}>
                    ￥{symbol}
                    {amountStr}
                  </span>
                </div>
              </div>
              <div className="min-w-0">
                <FourChainSelector
                  value={chainStates[index]}
                  onChange={(next) => setChainAt(index, next)}
                  allowedTxTypes={allowedTxTypes}
                  mode="select"
                  selectModeOptions={{ size: "sm", textSize: "sm" }}
                  className="min-w-0 [&>div]:gap-2"
                />
              </div>
            </div>
          );
        })}
      </div>
    </SplitDrawerShell>
  );
}
