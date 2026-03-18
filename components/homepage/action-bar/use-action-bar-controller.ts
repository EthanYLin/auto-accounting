"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDisclosure } from "@heroui/react";
import { addToast } from "@heroui/react";
import {
  ArchiveBoxIcon,
  ArrowUturnLeftIcon,
  BookmarkIcon,
  CheckIcon,
  ClockIcon,
  CloudArrowUpIcon,
  ForwardIcon,
  MapPinIcon,
  PlusIcon,
  TrashIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { ALL_TRANSACTION_STATUS } from "@/constants/transaction-status";
import { useSaveButtonOverride } from "@/components/context/save-button-override-context";
import { useTransactionEditor } from "@/components/context/transaction-editor-context";
import { useTransactionStore } from "@/components/context/transaction-store-context";
import type { TransactionNavigation } from "@/lib/hooks/use-transaction-navigation";
import { getExitSplits } from "@/lib/transaction/transaction-split-merge";
import type { TransactionStatus } from "@/types";

export const QUICK_ACTION_ITEMS = [
  { key: "auto-switch", label: "保存后自动切换", section: 1, icon: CheckIcon },
  { key: "save", label: "保存交易", section: 1, icon: BookmarkIcon },
  { key: "save-cancel", label: "保存并设为取消", section: 1, icon: XCircleIcon },
  { key: "save-later", label: "保存并稍后处理", section: 1, icon: ClockIcon },
  { key: "cloud-upload", label: "保存所有未提交更改($dirtyCount)", section: 1, icon: CloudArrowUpIcon },
  { key: "new", label: "新建交易", section: 2, icon: PlusIcon },
  { key: "next-pending", label: "跳转到下一条待处理的交易", section: 2, icon: ForwardIcon },
  { key: "locate-current", label: "定位到当前交易", section: 2, icon: MapPinIcon },
  { key: "discard-current", label: "丢弃当前更改", section: 3, icon: ArrowUturnLeftIcon },
  { key: "discard-all", label: "丢弃所有未提交更改($dirtyCount)", section: 3, icon: ArchiveBoxIcon },
  { key: "delete", label: "删除交易", section: 3, icon: TrashIcon },
] as const;

export type QuickActionKey = (typeof QUICK_ACTION_ITEMS)[number]["key"];
export type QuickActionIcon = (typeof QUICK_ACTION_ITEMS)[number]["icon"];
type QuickActionSection = (typeof QUICK_ACTION_ITEMS)[number]["section"];
const DEFAULT_QUICK_ACTION: QuickActionKey = "save-cancel";
const QUICK_ACTION_SECTIONS: Record<QuickActionKey, QuickActionSection> = QUICK_ACTION_ITEMS.reduce(
  (sections, item) => {
    sections[item.key] = item.section;
    return sections;
  },
  {} as Record<QuickActionKey, QuickActionSection>,
);
const SINGLE_SAVE_DISABLED_KEYS: QuickActionKey[] = [
  "cloud-upload", "new", "discard-current", "discard-all", "delete"
];
const CHILDREN_SELECTION_DISABLED_KEYS: QuickActionKey[] = [
  "save", "save-cancel", "save-later", ...SINGLE_SAVE_DISABLED_KEYS
];

export interface DangerConfirm {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

export type SplitHint = { type: "info" | "warn"; message: string } | null;

export function useActionBarController({ navigation }: { navigation: TransactionNavigation }) {
  const store = useTransactionStore();
  const editor = useTransactionEditor();
  const { saveButtonOverride, showSaveButtonOverride, clearSaveButtonOverride } = useSaveButtonOverride();

  const [quickActionKey, setQuickActionKey] = useState<QuickActionKey>(DEFAULT_QUICK_ACTION);
  const [autoSwitch, setAutoSwitch] = useState(true);
  const [dangerConfirmConfig, setDangerConfirmConfig] = useState<
    Pick<DangerConfirm, "title" | "description" | "confirmLabel" | "onConfirm"> | null
  >(null);
  const dangerConfirmModal = useDisclosure();

  const { currentIndex, totalCount, currentTransaction, currentChildTransactions } = editor;
  const dirtyCount = store.getDirtyIds().length;
  const status = useMemo(
    () => ALL_TRANSACTION_STATUS.find(s => s.name === currentTransaction?.status) ?? null,
    [currentTransaction?.status]
  );
  const splitHint = useMemo<SplitHint>(() => {
    if (!currentTransaction || currentTransaction.parent_id) {
      return null;
    }
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
  }, [currentTransaction, currentChildTransactions]);

  useEffect(() => {
    clearSaveButtonOverride();
  }, [editor.currentId, clearSaveButtonOverride]);

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
          title: `ID为#${editor.currentId}的交易保存失败`,
          description: result.error || "未知错误",
          color: "danger",
        });
        return;
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
          navigation.goToNextPending();
        }
      }
    },
    [clearSaveButtonOverride, editor, navigation, showSaveButtonOverride],
  );

  const confirmGoToNextPending = useCallback(() => {
    clearSaveButtonOverride();
    navigation.goToNextPending();
  }, [clearSaveButtonOverride, navigation]);

  const quickActionHandlers = useMemo<Record<QuickActionKey, () => Promise<void>>>(
    () => ({
      "auto-switch": async () => setAutoSwitch((value) => !value),
      "save": async () => handleSave(undefined, false),
      "save-cancel": async () => handleSave("取消", autoSwitch),
      "save-later": async () => handleSave("稍后处理", autoSwitch),
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
      },
      "new": async () => {
        const result = await store.createEmptyTransaction();
        if (!result.success) {
          addToast({
            title: "新建记录失败",
            description: result.error || "未知错误",
            color: "danger",
          });
        }
      },
      "next-pending": async () => {
        navigation.goToNextPending();
      },
      "locate-current": async () => {
        navigation.locateCurrent();
      },
      "discard-current": async () => {
        openDangerConfirm({
          title: "确认丢弃当前更改？",
          description: "当前交易的未保存修改将被还原。",
          confirmLabel: "确认丢弃",
          onConfirm: async () => {
            await editor.discardCurrentChanges();
            addToast({ title: "已丢弃当前更改", color: "success" });
          },
        });
      },
      "discard-all": async () => {
        openDangerConfirm({
          title: "确认丢弃所有未提交更改？",
          description: `共有 ${dirtyCount} 条交易存在未保存的修改。`,
          confirmLabel: "确认全部丢弃",
          onConfirm: () => {
            store.discardAllChanges();
            addToast({ title: "已丢弃所有未提交更改", color: "success" });
          },
        });
      },
      "delete": async () => {
        openDangerConfirm({
          title: "确认要删除吗？",
          description: '若不想导出该交易，可将状态设置为"取消"。',
          confirmLabel: "确认删除",
          onConfirm: async () => {
            if (editor.currentId === null) return;
            const result = await store.deleteTransactions([editor.currentId]);
            if (!result.success) {
              addToast({
                title: "删除失败",
                description: result.error || "未知错误",
                color: "danger",
              });
            }
          },
        });
      },
    }),
    [autoSwitch, dirtyCount, editor, handleSave, navigation, openDangerConfirm, store],
  );

  const currentQuickActionItem = useMemo(
    () =>
      QUICK_ACTION_ITEMS.find((item) => item.key === quickActionKey && item.key !== "auto-switch") ??
      QUICK_ACTION_ITEMS.find((item) => item.key === DEFAULT_QUICK_ACTION)!,
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
    if (editor.currentId && !store.isDirty(editor.currentId)) {
      keys.add("discard-current");
    }
    if (editor.currentId === null) {
      keys.add("save");
      keys.add("save-cancel");
      keys.add("save-later");
      keys.add("discard-current");
      keys.add("delete");
    }
    return Array.from(keys);
  }, [dirtyCount, editor.currentId, store.saveState]);

  const handleDropdownAction = useCallback(
    (key: QuickActionKey) => {
      clearSaveButtonOverride(); // 选择任何快捷操作都清除"仍要切换到下一条"
      void quickActionHandlers[key](); // 执行对应的快捷操作
      const section = QUICK_ACTION_SECTIONS[key];
      if ((section === 1 || section === 2) && key !== "auto-switch") {
        setQuickActionKey(key); // 更新主按钮显示的快捷操作
      }
    },
    [clearSaveButtonOverride, quickActionHandlers],
  );

  const handleCurrentQuickAction = useCallback(() => {
    void quickActionHandlers[quickActionKey]();
  }, [quickActionHandlers, quickActionKey]);

  const handlePrimaryAction = useCallback(() => {
    if (saveButtonOverride) confirmGoToNextPending();
    else void handleSave("已完成", autoSwitch);
  }, [autoSwitch, confirmGoToNextPending, handleSave, saveButtonOverride]);

  const handleDangerConfirm = useCallback(async () => {
    dangerConfirmModal.onClose();
    if (!dangerConfirmConfig) return;
    await dangerConfirmConfig.onConfirm();
  }, [dangerConfirmConfig, dangerConfirmModal]);

  const dangerConfirm: DangerConfirm = useMemo(
    () => ({
      isOpen: dangerConfirmModal.isOpen,
      title: dangerConfirmConfig?.title ?? "确认操作",
      description: dangerConfirmConfig?.description ?? "该操作不可撤销。",
      confirmLabel: dangerConfirmConfig?.confirmLabel ?? "确认",
      onClose: dangerConfirmModal.onClose,
      onConfirm: handleDangerConfirm,
    }),
    [dangerConfirmConfig, dangerConfirmModal.isOpen, dangerConfirmModal.onClose, handleDangerConfirm],
  );

  return {
    // 交易切换相关
    autoSwitch,
    currentIndex,
    totalCount,
    goToIndex: navigation.goToIndex,
    goToNext: navigation.goToNext,
    goToPrevious: navigation.goToPrevious,
    // 保存并完成按钮(包括仍要切换到下一条)
    isPrimaryActionDisabled: !saveButtonOverride && store.saveState === "children-selection",
    handlePrimaryAction,
    saveButtonOverride,
    // 主操作按钮
    currentQuickActionIcon: currentQuickActionItem.icon,
    currentQuickActionLabel: currentQuickActionItem.label.replace("$dirtyCount", String(dirtyCount)),
    isCurrentQuickActionDisabled: disabledKeys.includes(currentQuickActionItem.key),
    handleCurrentQuickAction,
    // 操作按钮下拉
    disabledKeys,
    handleDropdownAction,
    // 丢弃操作确认框
    dangerConfirm,
    // 其他状态
    dirtyCount,
    splitHint,
    status
  };
}
