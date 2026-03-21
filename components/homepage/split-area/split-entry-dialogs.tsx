"use client";

import type { SplitEntryData } from "@/components/homepage/split-area/split-entry-editor";
import type { SplitActionPayload } from "@/lib/split-actions";

import { SocialSplitModal } from "@/components/homepage/split-area/social-split-modal";
import { AmountSplitModal } from "@/components/homepage/split-area/amount-split-modal";
import { RatioSplitModal } from "@/components/homepage/split-area/ratio-split-modal";
import { TransactionWithRelations } from "@/types";

export type SplitDialogKey = "ratio-split" | "amount-split" | "social-split-2" | "social-split-3";

interface SplitEntryDialogsProps {
  activeDialog: SplitDialogKey | null;
  rootTransaction: TransactionWithRelations;
  selectedEntries: SplitEntryData[];
  onSubmit: (payload: SplitActionPayload) => void;
  onClose: () => void;
}

export function SplitEntryDialogs({
  activeDialog,
  rootTransaction,
  selectedEntries,
  onSubmit,
  onClose,
}: SplitEntryDialogsProps) {
  return (
    <>
      <RatioSplitModal
        isOpen={activeDialog === "ratio-split"}
        rootTransaction={rootTransaction}
        selectedEntries={selectedEntries}
        onConfirm={onSubmit}
        onCancel={onClose}
      />

      <SocialSplitModal
        isOpen={activeDialog === "social-split-2"}
        variant="social-split-2"
        rootTransaction={rootTransaction}
        selectedEntries={selectedEntries}
        onConfirm={onSubmit}
        onCancel={onClose}
      />

      <SocialSplitModal
        isOpen={activeDialog === "social-split-3"}
        variant="social-split-3"
        rootTransaction={rootTransaction}
        selectedEntries={selectedEntries}
        onConfirm={onSubmit}
        onCancel={onClose}
      />

      <AmountSplitModal
        isOpen={activeDialog === "amount-split"}
        rootTransaction={rootTransaction}
        selectedEntries={selectedEntries}
        onConfirm={onSubmit}
        onCancel={onClose}
      />
    </>
  );
}
