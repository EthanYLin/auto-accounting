"use client";

import { Drawer, DrawerBody, DrawerContent, DrawerHeader } from "@heroui/react";
import { addToast } from "@heroui/react";

import { TransactionListSelector } from "@/components/homepage/common/transaction-list-selector";
import { useTransactionEditor } from "@/components/context/transaction-editor-context";

// --------- 添加附加账单 / 选择附加账单 -----------------------------------

export function TxPickChildrenDrawer({
  transactionId,
  childrenIds,
  isBusy,
  isOpen,
  onClose,
}: {
  transactionId: number;
  childrenIds: number[];
  isBusy: boolean;
  isOpen: boolean;
  onClose: () => void;
}) {
  const editor = useTransactionEditor();

  const handleConfirm = async (selectedIds: number[]) => {
    onClose();
    const result = await editor.updateChildrenIds(selectedIds);
    if (!result.success) {
      addToast({
        title: "附加账单失败",
        description: result.error || "未知错误",
        color: "danger",
      });
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      placement="bottom"
      size="full"
      shouldBlockScroll={false}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DrawerContent>
        <DrawerHeader className="flex-shrink-0 border-b border-divider">
          选择要附加的账单
        </DrawerHeader>
        <DrawerBody className="p-4 sm:p-6 flex-1 min-h-0">
          <TransactionListSelector
            key={`${transactionId}:${childrenIds.join(",")}`}
            selectedIds={childrenIds}
            currentTransactionId={transactionId}
            isDisabled={isBusy}
            onConfirm={handleConfirm}
          />
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

// --------- 附加到主账单 -----------------------------------

export function TxAttachToParentDrawer({
  transactionId,
  isBusy,
  isOpen,
  onClose,
}: {
  transactionId: number;
  isBusy: boolean;
  isOpen: boolean;
  onClose: () => void;
}) {
  const editor = useTransactionEditor();

  const handleConfirm = async (selectedIds: number[]) => {
    onClose();
    const parentId = selectedIds[0];
    if (parentId === undefined) return;
    const result = await editor.attachToParent(parentId);
    if (!result.success) {
      addToast({ title: "附加失败", description: result.error || "未知错误", color: "danger" });
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      placement="bottom"
      size="full"
      shouldBlockScroll={false}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DrawerContent>
        <DrawerHeader className="flex-shrink-0 border-b border-divider">
          选择要附加到的主账单
        </DrawerHeader>
        <DrawerBody className="p-4 sm:p-6 flex-1 min-h-0">
          <TransactionListSelector
            key={`attach-to:${transactionId}`}
            selectedIds={[]}
            currentTransactionId={transactionId}
            isDisabled={isBusy}
            selectionMode="single"
            allowSelectRootRowsOnly
            allowEmptyConfirm={false}
            onConfirm={handleConfirm}
          />
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
