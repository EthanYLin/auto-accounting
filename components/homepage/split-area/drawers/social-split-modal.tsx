"use client";

import type { FourChainState } from "@/components/homepage/common/four-chain-selector";
import type { SocialSplitPayload } from "@/lib/split-actions";
import type { SplitEntryData } from "@/components/homepage/split-area/split-entry-editor";
import type { MainCategory, TransactionWithRelations } from "@/types";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@heroui/react";

import { FourChainSelector } from "@/components/homepage/common/four-chain-selector";
import { useAppData } from "@/components/context/app-data-context";
import { computeSplitCentsPerRow } from "@/lib/split-actions";
import { getAmountColorClass, getAmountSymbol } from "@/lib/transaction/transaction-display";
import { SplitDrawerShell } from "@/components/homepage/split-area/drawers/split-drawer-shell";
import { SplitNamePanel } from "@/components/homepage/split-area/drawers/split-name-panel";
import { SplitRowCountPresets } from "@/components/homepage/split-area/drawers/split-row-count-presets";
import { useSplitDrawerBase } from "@/components/homepage/split-area/drawers/use-split-drawer-base";

type PresetKey = "2" | "3" | "4" | "custom";

type SocialSplitActionKey = "social-split-2" | "social-split-3";

/**
 * 社交分账中，除第一笔外的默认四联：
 * - 支出 - 其他 - (不填写) - (不填写)
 * - 若用户未配置“支出/其他”主类，则只填“支出”。
 */
function getDefaultOtherExpenseChain(mainCategories: MainCategory[]): FourChainState {
  const other = mainCategories.find((mc) => mc.transaction_type === "支出" && mc.label === "其他");

  if (!other) return { txType: "支出" };

  return {
    txType: "支出",
    main_id: String(other.id),
    sub_id: undefined,
    budget_id: undefined,
  };
}

export interface SocialSplitModalProps {
  isOpen: boolean;
  variant: SocialSplitActionKey;
  rootTransaction: TransactionWithRelations;
  selectedEntries: SplitEntryData[];
  onConfirm: (payload: SocialSplitPayload) => void;
  onCancel: () => void;
}

export function SocialSplitModal({
  isOpen,
  variant,
  rootTransaction,
  selectedEntries,
  onConfirm,
  onCancel,
}: SocialSplitModalProps) {
  const appData = useAppData();
  const initialCount = variant === "social-split-2" ? 2 : 3;

  const {
    totalSigned,
    totalAbsCents,
    allowedTxTypes,
    baseChain,
    rootTransactionName,
    nameSuggestions,
  } = useSplitDrawerBase({ rootTransaction, selectedEntries });

  const defaultOtherExpenseChain = useMemo(
    () => getDefaultOtherExpenseChain(appData.mainCategories),
    [appData.mainCategories],
  );

  const [preset, setPreset] = useState<PresetKey>("2");
  const [customCountStr, setCustomCountStr] = useState("5");
  const [ratios, setRatios] = useState<number[]>([1, 1]);
  /** 比例输入框草稿（允许空字符串等临时非法值，失焦后再规范化） */
  const [ratioStrs, setRatioStrs] = useState<string[]>(["1", "1"]);
  const [chainStates, setChainStates] = useState<FourChainState[]>([{}, {}]);
  const [name, setName] = useState("");

  const applyRowCount = useCallback(
    (nextCount: number) => {
      const n = Math.max(2, Math.trunc(nextCount));
      setRatios((prev) => {
        if (n === prev.length) return prev;
        if (n < prev.length) return prev.slice(0, n);
        return [...prev, ...new Array(n - prev.length).fill(1)];
      });
      setRatioStrs((prev) => {
        if (n === prev.length) return prev;
        if (n < prev.length) return prev.slice(0, n);
        return [...prev, ...new Array(n - prev.length).fill("1")];
      });
      setChainStates((prev) => {
        if (n === prev.length) return prev;
        if (n < prev.length) return prev.slice(0, n);

        return [
          ...prev,
          ...Array.from({ length: n - prev.length }, (_, k) => {
            const index = prev.length + k;
            if (index === 0) return { ...baseChain };
            return { ...defaultOtherExpenseChain };
          }),
        ];
      });
    },
    [baseChain, defaultOtherExpenseChain],
  );

  useEffect(() => {
    if (!isOpen) return;

    setPreset(String(initialCount) as PresetKey);
    setCustomCountStr("5");
    setRatios(new Array(initialCount).fill(1));
    setRatioStrs(new Array(initialCount).fill("1"));
    setChainStates(
      Array.from({ length: initialCount }, (_, index) =>
        index === 0 ? { ...baseChain } : { ...defaultOtherExpenseChain },
      ),
    );
    setName(rootTransactionName);
  }, [isOpen, initialCount, baseChain, defaultOtherExpenseChain, rootTransactionName]);

  const handlePresetChange = (key: PresetKey) => {
    setPreset(key);
    if (key !== "custom") {
      applyRowCount(Number(key));
      return;
    }

    const n = parseInt(customCountStr.trim(), 10);
    applyRowCount(Number.isFinite(n) && n > 1 ? n : 5);
  };

  const setRatioDraftAt = (index: number, raw: string) => {
    setRatioStrs((prev) => {
      const next = [...prev];
      next[index] = raw;
      return next;
    });
    const parsed = parseInt(raw.trim(), 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      const v = Math.floor(parsed);
      setRatios((prev) => {
        const next = [...prev];
        next[index] = v;
        return next;
      });
    }
  };

  const normalizeRatioDraftAt = (index: number) => {
    const raw = ratioStrs[index] ?? "";
    const parsed = parseInt(String(raw).trim(), 10);
    const fallback = ratios[index] ?? 1;
    const v = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
    setRatios((prev) => {
      const next = [...prev];
      next[index] = v;
      return next;
    });
    setRatioStrs((prev) => {
      const next = [...prev];
      next[index] = String(v);
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

  const ratioDraftsValid =
    ratioStrs.length === ratios.length &&
    ratioStrs.every((s) => {
      const n = parseInt(String(s).trim(), 10);
      return Number.isFinite(n) && n > 0;
    });

  const canSave =
    ratios.length >= 2 &&
    ratios.every((r) => Number.isFinite(r) && r > 0) &&
    ratioDraftsValid &&
    totalAbsCents > 0;

  const handleSave = () => {
    if (!canSave) return;
    onConfirm({
      actionKey: variant,
      count: ratios.length,
      ratio: ratios,
      chainStates,
      name: name.trim(),
    });
  };

  const title = variant === "social-split-2" ? "社交二分账" : "社交三分账";

  const splitCents = useMemo(
    () => computeSplitCentsPerRow(totalAbsCents, ratios),
    [totalAbsCents, ratios],
  );

  return (
    <SplitDrawerShell
      isOpen={isOpen}
      title={title}
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
        {ratios.map((_, index) => {
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
                    value={ratioStrs[index] ?? "1"}
                    className="w-20"
                    classNames={{ input: "text-center tabular-nums" }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.currentTarget.blur();
                      }
                    }}
                    onValueChange={(val) => {
                      setRatioDraftAt(index, val);
                    }}
                    onBlur={() => {
                      normalizeRatioDraftAt(index);
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
