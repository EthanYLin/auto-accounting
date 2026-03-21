"use client";

import type { SplitEntryData } from "@/components/homepage/split-area/split-entry-editor";
import type { SplitActionPayload } from "@/lib/split-actions";

import { SocialSplitModal } from "@/components/homepage/split-area/drawers/social-split-modal";
import { AmountSplitModal } from "@/components/homepage/split-area/drawers/amount-split-modal";
import { RatioSplitModal } from "@/components/homepage/split-area/drawers/ratio-split-modal";
import { AccountTargetModal } from "@/components/homepage/split-area/drawers/account-target-modal";
import { TransactionWithRelations } from "@/types";
import { useAppData } from "@/components/context/app-data-context";

export type SplitDialogKey =
  | "ratio-split"
  | "amount-split"
  | "social-split-2"
  | "social-split-3"
  | "transfer-to"
  | "transfer-from"
  | "recharge-to"
  | "recharge-from";

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
  const { accounts, mainCategories, subCategories } = useAppData();
  const isAccountAction =
    activeDialog === "transfer-to" ||
    activeDialog === "transfer-from" ||
    activeDialog === "recharge-to" ||
    activeDialog === "recharge-from";

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

      <AccountTargetModal
        isOpen={isAccountAction}
        actionKey={isAccountAction ? activeDialog : null}
        sourceAccountId={selectedEntries[0]?.accountId}
        accounts={accounts}
        mainCategories={mainCategories}
        subCategories={subCategories}
        onConfirm={onSubmit}
        onCancel={onClose}
      />
    </>
  );
}
