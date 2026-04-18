"use client";

import type { FourChainState } from "@/components/homepage/common/four-chain-selector";
import type { SplitEntryData } from "@/components/homepage/split-area/split-entry-editor";
import type { TransactionType } from "@/types";

import { useMemo } from "react";

import { TRANSACTION_TYPES } from "@/constants/transaction-type";
import { sumSignedAmounts } from "@/lib/split-actions";
import { amountToCents } from "@/lib/transaction/transaction-display";

export function useSplitDrawerBase({
  rootTransaction,
  selectedEntries,
}: {
  rootTransaction: { name?: string | null };
  selectedEntries: SplitEntryData[];
}): {
  totalSigned: number;
  totalAbsCents: number;
  allowedTxTypes: TransactionType[] | undefined;
  baseChain: FourChainState;
  rootTransactionName: string;
  nameSuggestions: string[];
} {
  const totalSigned = useMemo(() => sumSignedAmounts(selectedEntries), [selectedEntries]);
  const totalAbsCents = useMemo(() => {
    const c = amountToCents(Math.abs(totalSigned));
    return Number.isFinite(c) ? c : 0;
  }, [totalSigned]);

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

  return {
    totalSigned,
    totalAbsCents,
    allowedTxTypes,
    baseChain,
    rootTransactionName,
    nameSuggestions,
  };
}
