"use client";

import type { TransactionStatus } from "@/types";
import type { DangerConfirm, QuickActionKey, SplitHint } from "./action-bar-config";

import { useCallback, useEffect, useMemo, useState } from "react";
import { addToast, useDisclosure } from "@heroui/react";

import { NavigationControls } from "./navigation-controls";
import { PrimarySaveButton } from "./primary-save-button";
import { QuickActionsDropdownButton } from "./quick-actions-dropdown-button";
import { SplitHintBadge } from "./split-hint-badge";
import { TransactionStatusBadge } from "./transaction-status-badge";
import { QUICK_ACTION_ITEMS } from "./action-bar-config";

import { dispatchCommand, useCommandListener } from "@/lib/commands";
import { ALL_TRANSACTION_STATUS } from "@/constants/transaction-status";
import { useSaveButtonOverride } from "@/components/context/save-button-override-context";
import { useTransactionEditor } from "@/components/context/transaction-editor-context";
import { useTransactionStore } from "@/components/context/transaction-store-context";
import { getExitSplits } from "@/lib/transaction/transaction-split-merge";

const DEFAULT_QUICK_ACTION: QuickActionKey = "save-cancel";

const QUICK_ACTION_SECTIONS = QUICK_ACTION_ITEMS.reduce(
  (sections, item) => {
    sections[item.key] = item.section;
    return sections;
  },
  {} as Record<QuickActionKey, (typeof QUICK_ACTION_ITEMS)[number]["section"]>,
);

const SINGLE_SAVE_DISABLED_KEYS: QuickActionKey[] = [
  "cloud-upload",
  "new",
  "discard-current",
  "discard-all",
  "delete",
];
const CHILDREN_SELECTION_DISABLED_KEYS: QuickActionKey[] = [
  "save",
  "save-cancel",
  "save-later",
  ...SINGLE_SAVE_DISABLED_KEYS,
];

export function ActionBar() {
  const editor = useTransactionEditor();
  const store = useTransactionStore();
  const { saveButtonOverride, showSaveButtonOverride, clearSaveButtonOverride } =
    useSaveButtonOverride();

  const { currentTransaction, currentChildTransactions, currentId } = editor;
  const dirtyCount = store.getDirtyIds().length;

  const [quickActionKey, setQuickActionKey] = useState<QuickActionKey>(DEFAULT_QUICK_ACTION);
  const [autoSwitch, setAutoSwitch] = useState(true);
  const [dangerConfirmConfig, setDangerConfirmConfig] = useState<Pick<
    DangerConfirm,
    "title" | "description" | "confirmLabel" | "onConfirm"
  > | null>(null);
  const dangerConfirmModal = useDisclosure();

  const status = useMemo(
    () => ALL_TRANSACTION_STATUS.find((item) => item.name === currentTransaction?.status) ?? null,
    [currentTransaction?.status],
  );

  const splitHint = useMemo<SplitHint>(() => {
    if (!currentTransaction || currentTransaction.parent_id) return null;
    const exitCount = currentTransaction.splits?.length ?? 0;
    const entryCount = currentChildTransactions.length + 1;
    if (exitCount > 1) {
      return { type: "info", message: `该账单会拆分为${exitCount}条记录` };
    }
    if (exitCount === 1 && entryCount > 1) {
      return { type: "info", message: "该账单会合并为1条记录" };
    }
    if (exitCount === 1 && entryCount === 1) {
      return { type: "warn", message: "该账单经过分账修改" };
    }
    if (exitCount === 0 && entryCount > 1) {
      if (getExitSplits(currentTransaction, currentChildTransactions).length === 0) {
        return { type: "info", message: "该账单正负相抵不会被导出" };
      }
      return { type: "warn", message: "该账单会默认按账户进行合并" };
    }
    return null;
  }, [currentChildTransactions, currentTransaction]);

  useEffect(() => {
    clearSaveButtonOverride();
  }, [currentId, clearSaveButtonOverride]);

  const openDangerConfirm = useCallback(
    (config: Pick<DangerConfirm, "title" | "description" | "confirmLabel" | "onConfirm">) => {
      setDangerConfirmConfig(config);
      dangerConfirmModal.onOpen();
    },
    [dangerConfirmModal],
  );

  const handleSave = useCallback(
    async (targetStatus?: TransactionStatus, shouldAutoSwitch = false) => {
      clearSaveButtonOverride();
      const result = await editor.saveCurrentTransaction(targetStatus);
      if (!result.success) {
        addToast({
          title: `ID为#${currentId}的交易保存失败`,
          description: result.error || "未知错误",
          color: "danger",
        });
        return false;
      }

      if (result.saveTask && result.txId !== undefined) {
        const txId = result.txId;
        result.saveTask
          .then((saveResult) => {
            if (!saveResult.success) {
              addToast({
                title: `ID为#${txId}的交易保存失败`,
                description: saveResult.error || "未知错误",
                color: "danger",
              });
              return;
            }
            if (!shouldAutoSwitch) {
              addToast({ title: `ID为#${txId}的交易已保存`, color: "success" });
            }
          })
          .catch((error) => {
            addToast({
              title: `ID为#${txId}的交易保存失败`,
              description: error instanceof Error ? error.message : "未知错误",
              color: "danger",
            });
          });
      }

      if (shouldAutoSwitch) {
        if (result.blockAutoSwitch) {
          showSaveButtonOverride();
        } else {
          dispatchCommand("next-pending");
        }
      }

      return true;
    },
    [clearSaveButtonOverride, currentId, editor, showSaveButtonOverride],
  );

  const handleDangerConfirm = useCallback(async () => {
    dangerConfirmModal.onClose();
    if (!dangerConfirmConfig) return;
    await dangerConfirmConfig.onConfirm();
  }, [dangerConfirmConfig, dangerConfirmModal]);

  const dangerConfirm = useMemo<DangerConfirm>(
    () => ({
      isOpen: dangerConfirmModal.isOpen,
      title: dangerConfirmConfig?.title ?? "确认操作",
      description: dangerConfirmConfig?.description ?? "该操作不可撤销。",
      confirmLabel: dangerConfirmConfig?.confirmLabel ?? "确认",
      onClose: dangerConfirmModal.onClose,
      onConfirm: handleDangerConfirm,
    }),
    [
      dangerConfirmConfig,
      dangerConfirmModal.isOpen,
      dangerConfirmModal.onClose,
      handleDangerConfirm,
    ],
  );

  const quickActionHandlers = useMemo<Record<QuickActionKey, () => Promise<boolean> | boolean>>(
    () => ({
      "auto-switch": () => {
        setAutoSwitch((value) => !value);
        return true;
      },
      save: () => handleSave(undefined, false),
      "save-cancel": () => handleSave("取消", autoSwitch),
      "save-later": () => handleSave("稍后处理", autoSwitch),
      "cloud-upload": async () => {
        const result = await editor.saveAllDirtyToServer();
        if (result.success) {
          addToast({ title: "保存成功", color: "success" });
        } else {
          addToast({
            title: "保存失败",
            description: result.error || "未知错误",
            color: "danger",
          });
        }
        return result.success;
      },
      new: () => {
        dispatchCommand("create");
        return true;
      },
      "next-pending": () => {
        dispatchCommand("next-pending");
        return true;
      },
      "locate-current": () => {
        dispatchCommand("locate-current");
        return true;
      },
      "discard-current": () => {
        openDangerConfirm({
          title: "确认丢弃当前更改？",
          description: "当前交易的未保存修改将被还原。",
          confirmLabel: "确认丢弃",
          onConfirm: async () => {
            await editor.discardCurrentChanges();
            addToast({ title: "已丢弃当前更改", color: "success" });
          },
        });
        return true;
      },
      "discard-all": () => {
        openDangerConfirm({
          title: "确认丢弃所有未提交更改？",
          description: `共有 ${dirtyCount} 条交易存在未保存的修改。`,
          confirmLabel: "确认全部丢弃",
          onConfirm: () => {
            store.discardAllChanges();
            addToast({ title: "已丢弃所有未提交更改", color: "success" });
          },
        });
        return true;
      },
      delete: () => {
        openDangerConfirm({
          title: "确认要删除吗？",
          description: '若不想导出该交易，可将状态设置为"取消"。',
          confirmLabel: "确认删除",
          onConfirm: async () => {
            if (currentId === null) return;
            const result = await store.deleteTransactions([currentId]);
            if (!result.success) {
              addToast({
                title: "删除失败",
                description: result.error || "未知错误",
                color: "danger",
              });
            }
          },
        });
        return true;
      },
    }),
    [autoSwitch, currentId, dirtyCount, editor, handleSave, openDangerConfirm, store],
  );

  const currentQuickActionItem = useMemo(
    () =>
      QUICK_ACTION_ITEMS.find(
        (item) => item.key === quickActionKey && item.key !== "auto-switch",
      ) ?? QUICK_ACTION_ITEMS.find((item) => item.key === DEFAULT_QUICK_ACTION)!,
    [quickActionKey],
  );

  const disabledKeys = useMemo(() => {
    const keys = new Set<QuickActionKey>();
    if (store.saveState === "single-save") {
      SINGLE_SAVE_DISABLED_KEYS.forEach((key) => keys.add(key));
    }
    if (store.saveState === "children-selection") {
      CHILDREN_SELECTION_DISABLED_KEYS.forEach((key) => keys.add(key));
    }
    if (dirtyCount === 0) {
      keys.add("cloud-upload");
      keys.add("discard-all");
    }
    if (currentId && !store.isDirty(currentId)) {
      keys.add("discard-current");
    }
    if (currentId === null) {
      keys.add("save");
      keys.add("save-cancel");
      keys.add("save-later");
      keys.add("discard-current");
      keys.add("delete");
    }
    return Array.from(keys);
  }, [dirtyCount, currentId, store]);

  const executeQuickAction = useCallback(
    (key: QuickActionKey) => {
      if (disabledKeys.includes(key)) return false;
      clearSaveButtonOverride();
      void quickActionHandlers[key]();
      const section = QUICK_ACTION_SECTIONS[key];
      if ((section === 1 || section === 2) && key !== "auto-switch") {
        setQuickActionKey(key);
      }
      return true;
    },
    [clearSaveButtonOverride, disabledKeys, quickActionHandlers],
  );

  const handleCurrentQuickAction = useCallback(() => {
    if (disabledKeys.includes(currentQuickActionItem.key)) return false;
    void quickActionHandlers[quickActionKey]();
    return true;
  }, [currentQuickActionItem.key, disabledKeys, quickActionHandlers, quickActionKey]);

  const handlePrimaryAction = useCallback(() => {
    if (!saveButtonOverride && store.saveState === "children-selection") return false;
    if (saveButtonOverride) {
      clearSaveButtonOverride();
      dispatchCommand("next-pending");
      return true;
    }
    void handleSave("已完成", autoSwitch);
    return true;
  }, [autoSwitch, clearSaveButtonOverride, handleSave, saveButtonOverride, store.saveState]);

  useCommandListener("save", () => executeQuickAction("save"));
  useCommandListener("save-cancel", () => executeQuickAction("save-cancel"));
  useCommandListener("save-later", () => executeQuickAction("save-later"));
  useCommandListener("save-and-complete", () => handlePrimaryAction());
  useCommandListener("delete-current", () => executeQuickAction("delete"));
  useCommandListener("discard-current", () => executeQuickAction("discard-current"));

  return (
    <div className="sticky top-0 z-30 border-b border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <NavigationControls />

            <PrimarySaveButton
              saveButtonOverride={saveButtonOverride}
              disabled={!saveButtonOverride && store.saveState === "children-selection"}
              onPress={handlePrimaryAction}
            />

            <QuickActionsDropdownButton
              currentQuickActionIcon={currentQuickActionItem.icon}
              currentQuickActionLabel={currentQuickActionItem.label.replace(
                "$dirtyCount",
                String(dirtyCount),
              )}
              autoSwitch={autoSwitch}
              dirtyCount={dirtyCount}
              disabledKeys={disabledKeys}
              isCurrentQuickActionDisabled={disabledKeys.includes(currentQuickActionItem.key)}
              dangerConfirm={dangerConfirm}
              onCurrentQuickAction={handleCurrentQuickAction}
              onDropdownAction={executeQuickAction}
            />

            <SplitHintBadge splitHint={splitHint} />
          </div>

          <TransactionStatusBadge status={status} />
        </div>
      </div>
    </div>
  );
}
