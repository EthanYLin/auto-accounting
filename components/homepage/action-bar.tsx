"use client";

import { useState } from "react";
import { Button, ButtonGroup } from "@heroui/button";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, useDisclosure } from "@heroui/modal";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, DropdownSection } from "@heroui/dropdown";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  BookmarkIcon,
  ClockIcon,
  TrashIcon,
  PlusIcon,
  ForwardIcon,
  MapPinIcon,
  CloudArrowUpIcon,
  ChevronDownIcon,
  CheckIcon,
  XMarkIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import type { TransactionStatus } from "@/types";
import { ALL_TRANSACTION_STATUS } from "@/constants/transaction-status";
import type { TransactionActions } from "@/lib/hooks/use-transaction-actions";

// ==================== 分账提示类型 ====================

export type SplitHint = { type: 'info' | 'warn'; message: string } | null;

// ==================== 下拉菜单动作定义 ====================

type QuickActionKey =
  | "save" | "save-cancel" | "save-later" | "delete" | "new"
  | "next-pending" | "locate-current"
  | "cloud-upload";

const DEFAULT_QUICK_ACTION: QuickActionKey = "save-cancel";

interface QuickAction {
  key: QuickActionKey;
  label: string;
  icon: React.ReactNode;
  section: 1 | 2 | 3;
  onClick: () => void;
}

// ==================== 组件 ====================

interface ActionBarProps {
  currentIndex: number;
  totalCount: number;
  status?: TransactionStatus;
  actions: TransactionActions;
  splitHint?: SplitHint;
}

// ==================== 组件 ====================

export function ActionBar({
  currentIndex,
  totalCount,
  status,
  actions,
  splitHint,
}: ActionBarProps) {
  const statusConfig = status ? ALL_TRANSACTION_STATUS.find((item) => item.name === status) : null;

  // 记住上次点击的快捷动作
  const [quickActionKey, setQuickActionKey] = useState<QuickActionKey>(DEFAULT_QUICK_ACTION);
  // 保存后自动切换 checkbox
  const [autoSwitch, setAutoSwitch] = useState(true);
  // 删除确认 modal
  const deleteConfirmModal = useDisclosure();

  const QUICK_ACTIONS: QuickAction[] = [
  {
    key: "save",
    label: "保存交易",
    icon: <BookmarkIcon className="w-4 h-4" />,
    section: 1,
    onClick: () => actions.updateAndSaveCurrentTransaction(undefined, false),
  },
  {
    key: "save-cancel",
    label: "保存并设为取消",
    icon: <XCircleIcon className="w-4 h-4" />,
    section: 1,
    onClick: () => actions.updateAndSaveCurrentTransaction('取消', autoSwitch),
  },
  {
    key: "save-later",
    label: "保存并稍后处理",
    icon: <ClockIcon className="w-4 h-4" />,
    section: 1,
    onClick: () => actions.updateAndSaveCurrentTransaction('稍后处理', autoSwitch),
  },
  {
    key: "delete",
    label: "删除交易",
    icon: <TrashIcon className="w-4 h-4" />,
    section: 1,
    onClick: deleteConfirmModal.onOpen,
  },
  {
    key: "new",
    label: "新建交易",
    icon: <PlusIcon className="w-4 h-4" />,
    section: 1,
    onClick: actions.createNewTransaction,
  },
  {
    key: "next-pending",
    label: "跳转到下一条待处理的交易",
    icon: <ForwardIcon className="w-4 h-4" />,
    section: 2,
    onClick: actions.goToNextPending,
  },
  {
    key: "locate-current",
    label: "定位到当前交易",
    icon: <MapPinIcon className="w-4 h-4" />,
    section: 2,
    onClick: actions.locateCurrent,
  },
  {
    key: "cloud-upload",
    label: "上传到云端",
    icon: <CloudArrowUpIcon className="w-4 h-4" />,
    section: 3,
    onClick: actions.uploadToServer,
  },
];

  const currentQuickAction = QUICK_ACTIONS.find((a) => a.key === quickActionKey)!;

  const handleDropdownAction = (key: React.Key) => {
    if (key === "auto-switch") {
      setAutoSwitch((v) => !v);
      return;
    }
    actions.resetSaveButtonOverride();
    const action = QUICK_ACTIONS.find((a) => a.key === key);
    if (action) {
      action.onClick();
    }
    if (action?.section === 1 || action?.section === 2) {
      setQuickActionKey(action.key);
    }
  };

  return (
    <div className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* 左侧：导航 + 操作按钮 */}
          <div className="flex items-center gap-3">
            {/* 导航控件 */}
            <div className="flex items-center gap-2">
              <Button
                isIconOnly
                variant="ghost"
                size="sm"
                isDisabled={currentIndex <= 1}
                onPress={actions.goToPrevious}
                aria-label="上一条"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </Button>

              <div className="flex items-center gap-1 text-sm px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <span className="text-gray-900 dark:text-gray-100 font-semibold min-w-[2ch] text-center">
                  {currentIndex}
                </span>
                <span className="text-gray-500 dark:text-gray-400">/</span>
                <span className="text-gray-700 dark:text-gray-300 font-medium">
                  {totalCount}
                </span>
              </div>

              <Button
                isIconOnly
                variant="ghost"
                size="sm"
                isDisabled={currentIndex >= totalCount}
                onPress={actions.goToNext}
                aria-label="下一条"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </Button>
            </div>

            {/* 主操作按钮：保存并完成 / 仍切换到下一条 */}
            <Button
              color={actions.saveButtonOverride ? "danger" : "primary"}
              variant="shadow"
              size="sm"
              startContent={actions.saveButtonOverride
                ? <ForwardIcon className="w-4 h-4" />
                : <CheckCircleIcon className="w-4 h-4" />}
              className="font-medium"
              onPress={() => actions.saveButtonOverride
                ? actions.confirmGoToNextPending()
                : actions.updateAndSaveCurrentTransaction('已完成', autoSwitch)}
            >
              {actions.saveButtonOverride ? "仍切换到下一条" : "保存并完成"}
            </Button>

            {/* 快捷操作 Split Button */}
            <ButtonGroup size="sm" variant="flat">
              <Button
                startContent={currentQuickAction.icon}
                onPress={() => currentQuickAction.onClick()}
              >
                {currentQuickAction.label}
              </Button>

              <Dropdown placement="bottom-end">
                <DropdownTrigger>
                  <Button isIconOnly aria-label="更多操作">
                    <ChevronDownIcon className="w-3.5 h-3.5" />
                  </Button>
                </DropdownTrigger>
                <DropdownMenu
                  aria-label="快捷操作"
                  onAction={handleDropdownAction}
                  disallowEmptySelection
                  itemClasses={{ base: "py-2", title: "text-xs font-medium" }}
                >
                  <DropdownSection showDivider title="交易操作">
                    <DropdownItem
                      key="auto-switch"
                      startContent={
                        autoSwitch ? 
                        <CheckIcon className="w-4 h-4" /> :
                        <XMarkIcon className="w-4 h-4" />
                      }
                    >
                      已{autoSwitch ? '开启' : '关闭'} 保存后自动切换
                    </DropdownItem>
                    <DropdownItem
                      key="save"
                      startContent={<BookmarkIcon className="w-4 h-4" />}
                    >
                      保存交易
                    </DropdownItem>
                    <DropdownItem
                      key="save-cancel"
                      startContent={<XCircleIcon className="w-4 h-4" />}
                    >
                      保存并设为取消
                    </DropdownItem>
                    <DropdownItem
                      key="save-later"
                      startContent={<ClockIcon className="w-4 h-4" />}
                    >
                      保存并稍后处理
                    </DropdownItem>
                    <DropdownItem
                      key="delete"
                      className="text-danger"
                      color="danger"
                      startContent={<TrashIcon className="w-4 h-4" />}
                    >
                      删除交易
                    </DropdownItem>
                  </DropdownSection>

                  <DropdownSection showDivider title="导航操作">
                    <DropdownItem
                      key="new"
                      startContent={<PlusIcon className="w-4 h-4" />}
                    >
                      新建交易
                    </DropdownItem>
                    <DropdownItem
                      key="next-pending"
                      startContent={<ForwardIcon className="w-4 h-4" />}
                    >
                      跳转到下一条待处理的交易
                    </DropdownItem>
                    <DropdownItem
                      key="locate-current"
                      startContent={<MapPinIcon className="w-4 h-4" />}
                    >
                      定位到当前交易
                    </DropdownItem>
                  </DropdownSection>

                  <DropdownSection title="同步操作">
                    <DropdownItem
                      key="cloud-upload"
                      startContent={<CloudArrowUpIcon className="w-4 h-4" />}
                    >
                      上传到云端
                    </DropdownItem>
                  </DropdownSection>
                </DropdownMenu>
              </Dropdown>
            </ButtonGroup>

            {/* 分账提示 */}
            {splitHint && (
              <div className={`flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium ${
                splitHint.type === 'warn'
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              }`}>
                {splitHint.type === 'warn' ? (
                  <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <InformationCircleIcon className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{splitHint.message}</span>
              </div>
            )}
          </div>

          {/* 右侧：状态显示 */}
          {statusConfig && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${statusConfig.bgColor} transition-colors`}>
              {/* 状态指示点 */}
              <div className="relative">
                <div className={`w-2 h-2 rounded-full ${statusConfig.dotColor} shadow-sm`} />
                <div className={`absolute inset-0 w-2 h-2 rounded-full ${statusConfig.dotColor} opacity-75`} />
              </div>
              {/* 状态文字 */}
              <span className={`text-sm font-medium ${statusConfig.color}`}>
                {status}
              </span>
            </div>
          )}
        </div>
      </div>


      {/* 删除确认 Modal */}
      <Modal isOpen={deleteConfirmModal.isOpen} onClose={deleteConfirmModal.onClose} size="sm">
        <ModalContent>
          <ModalHeader>确认要删除吗？</ModalHeader>
          <ModalBody>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              若不想导出该交易，可将状态设置为&ldquo;取消&rdquo;。
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={deleteConfirmModal.onClose}>
              取消
            </Button>
            <Button
              color="danger"
              onPress={() => {
                deleteConfirmModal.onClose();
                actions.deleteTransaction();
              }}
            >
              确认删除
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

