"use client";

import type { SplitEntryData } from "@/components/homepage/split-area/split-entry-editor";
import type { RatioSplitPayload } from "@/lib/split-actions";
import type { TransactionType } from "@/types";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  Input,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";

import {
  FourChainSelector,
  type FourChainState,
} from "@/components/homepage/common/four-chain-selector";
import { TRANSACTION_TYPES } from "@/constants/transaction-type";
import { getAmountColorClass, getAmountSymbol } from "@/lib/transaction/transaction-display";
import { sumSignedAmounts } from "@/lib/split-actions";
import { TransactionWithRelations } from "@/types";

function computeSplitCentsPerRow(totalAbsCents: number, ratios: number[]): number[] {
  const ratioSum = ratios.reduce((s, r) => s + r, 0);
  if (ratios.length === 0 || ratioSum <= 0) {
    return ratios.map(() => 0);
  }
  let assigned = 0;
  return ratios.map((ratio, index) => {
    if (index === ratios.length - 1) {
      return Math.max(0, totalAbsCents - assigned);
    } else {
      const c = Math.floor((totalAbsCents * ratio) / ratioSum);
      assigned += c;
      return c;
    }
  });
}

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
  const customCountInputRef = useRef<HTMLInputElement>(null);

  const totalSigned = useMemo(() => sumSignedAmounts(selectedEntries), [selectedEntries]);
  const totalAbsCents = useMemo(() => Math.round(Math.abs(totalSigned) * 100), [totalSigned]);

  const allowedTxTypes = useMemo((): TransactionType[] | undefined => {
    const sign = Math.sign(totalSigned);
    if (sign === 0) return undefined;
    return TRANSACTION_TYPES.filter((item) => item.sign === sign).map((item) => item.type);
  }, [totalSigned]);

  const baseChain = useMemo(() => {
    if (!allowedTxTypes?.length) return {};
    return (
      selectedEntries.find(
        (entry) => entry.chainState.txType && allowedTxTypes.includes(entry.chainState.txType),
      )?.chainState ?? { txType: allowedTxTypes[0] }
    );
  }, [selectedEntries, allowedTxTypes]);

  const rootTransactionName = useMemo(
    () => rootTransaction.name?.trim() ?? "",
    [rootTransaction.name],
  );

  const nameSuggestions = useMemo(() => {
    const names = [rootTransaction.name, ...selectedEntries.map((e) => e.name)]
      .map((name) => name?.trim())
      .filter((name): name is string => !!name);
    return Array.from(new Set(names));
  }, [rootTransaction.name, selectedEntries]);

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

  useEffect(() => {
    if (preset !== "custom") return;
    const rafId = requestAnimationFrame(() => {
      customCountInputRef.current?.focus();
      customCountInputRef.current?.select();
    });
    return () => cancelAnimationFrame(rafId);
  }, [preset]);

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
    <Drawer
      isOpen={isOpen}
      hideCloseButton
      placement="bottom"
      size="xl"
      scrollBehavior="inside"
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DrawerContent>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <DrawerHeader className="flex flex-col gap-1 border-b border-divider px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-lg font-semibold">按比例分账</span>
              <span className={`text-lg font-semibold tabular-nums`}>
                ￥{totalSigned.toFixed(2)}
              </span>
            </DrawerHeader>

            <DrawerBody className="flex-none gap-6 px-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex h-full flex-col rounded-medium border border-divider p-4">
                  <div className="mb-3 flex h-8 items-center">
                    <span className="text-sm font-medium text-default-700">分账</span>
                  </div>
                  <div className="grid flex-1 grid-cols-4 gap-1.5">
                    {(["2", "3", "4"] as const).map((key) => {
                      const isSelected = preset === key;
                      return (
                        <Button
                          key={key}
                          fullWidth
                          radius="md"
                          size="md"
                          variant={isSelected ? "solid" : "flat"}
                          color={isSelected ? "primary" : "default"}
                          className="min-w-0 font-medium"
                          onPress={() => handlePresetChange(key)}
                        >
                          {key}
                        </Button>
                      );
                    })}
                    <div className="min-w-0">
                      {preset === "custom" ? (
                        <Input
                          ref={customCountInputRef}
                          aria-label="自定义分账笔数"
                          size="md"
                          type="number"
                          min={2}
                          step={1}
                          color="primary"
                          value={customCountStr}
                          classNames={{ input: "text-center font-medium" }}
                          onValueChange={setCustomCountStr}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.currentTarget.blur();
                            }
                          }}
                          onBlur={() => {
                            const n = parseInt(customCountStr.trim(), 10);
                            if (Number.isFinite(n) && n > 1) {
                              applyRowCount(n);
                            } else {
                              setCustomCountStr(String(ratios.length));
                            }
                          }}
                        />
                      ) : (
                        <Button
                          fullWidth
                          radius="md"
                          size="md"
                          variant="flat"
                          color="default"
                          className="min-w-0 font-medium"
                          onPress={() => handlePresetChange("custom")}
                        >
                          自定义
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex h-full flex-col rounded-medium border border-divider p-4">
                  <div className="mb-3 flex h-8 items-center gap-2">
                    <span className="shrink-0 text-sm font-medium text-default-700">名称</span>
                    {nameSuggestions.length > 0 ? (
                      <div className="ml-2 min-w-0 flex-1 overflow-x-auto">
                        <div className="flex w-max items-center gap-2">
                          {nameSuggestions.map((tag) => (
                            <Button
                              key={tag}
                              size="sm"
                              variant="flat"
                              color="default"
                              className="max-w-[220px] min-w-0 flex-shrink-0"
                              onPress={() => setName(tag)}
                            >
                              <span className="truncate">{tag}</span>
                            </Button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col gap-2">
                    <Input
                      aria-label="名称"
                      placeholder="输入名称…"
                      value={name}
                      onValueChange={setName}
                      size="md"
                    />
                  </div>
                </div>
              </div>

              {/* 分账表 */}
              <div className="rounded-medium border border-divider">
                <Table
                  removeWrapper
                  aria-label="按比例分账明细"
                  classNames={{
                    th: "text-xs uppercase text-default-500 first:pl-4 last:pr-4",
                    td: "align-top first:pl-4 last:pr-4 py-3",
                  }}
                >
                  <TableHeader>
                    <TableColumn width={84}>比例</TableColumn>
                    <TableColumn width={120}>金额</TableColumn>
                    <TableColumn>类别</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {ratios.map((ratio, index) => {
                      const cents = splitCents[index] ?? 0;
                      const txType = chainStates[index]?.txType;
                      const symbol = getAmountSymbol(txType);
                      const amountStr = (cents / 100).toFixed(2);
                      return (
                        <TableRow key={index}>
                          <TableCell>
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
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-block font-medium tabular-nums ${getAmountColorClass(txType)}`}
                            >
                              ￥{symbol}
                              {amountStr}
                            </span>
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
            </DrawerBody>
          </div>

          <DrawerFooter className="shrink-0 border-t border-divider px-6 py-4">
            <Button fullWidth color="primary" size="md" isDisabled={!canSave} onPress={handleSave}>
              保存
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
