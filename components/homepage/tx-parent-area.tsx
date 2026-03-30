"use client";

import { Button } from "@heroui/react";
import { Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/react";
import { useDisclosure } from "@heroui/react";
import { Chip } from "@heroui/react";
import { addToast } from "@heroui/react";
import { Select, SelectItem } from "@heroui/react";
import {
  PlusIcon,
  XMarkIcon,
  ArrowUpRightIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";

import { TransactionListSelector } from "@/components/homepage/common/transaction-list-selector";
import { AmountInput } from "@/components/homepage/common/amount-input";
import { useTransactionStore } from "@/components/context/transaction-store-context";
import { useTransactionEditor } from "@/components/context/transaction-editor-context";
import { useAppData } from "@/components/context/app-data-context";
import { TRANSACTION_STATUS_COLORS } from "@/constants/transaction-type";
import {
  calculateAmount,
  getAmountColorClass,
  getAmountSymbol,
  formatDateTime,
  formatCategoryText,
} from "@/lib/transaction/transaction-display";
export function TxParentArea() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const store = useTransactionStore();
  const editor = useTransactionEditor();
  const { accounts } = useAppData();
  const currentTransaction = editor.currentTransaction;
  const childTransactions = editor.currentChildTransactions;
  const parentTransaction = editor.currentParentTransaction;
  const isBusy = store.saveState !== "idle";
  const entranceSummary = editor.entranceSummary;

  // 如果没有选中交易，不显示任何内容
  if (!currentTransaction) {
    return <div className="text-xs text-gray-500 dark:text-gray-500">请先选择一个交易</div>;
  }

  // 获取已附加的账单ID列表
  const childrenIds = currentTransaction.children_ids;
  const selectorKey = `${currentTransaction.id}:${childrenIds.join(",")}`;

  // 处理添加附加账单
  const handleConfirmSelection = async (selectedIds: number[]) => {
    if (!currentTransaction) return;
    onClose();
    const result = await editor.updateChildrenIds(selectedIds);
    if (!result.success) {
      addToast({ title: "附加账单失败", description: result.error || "未知错误", color: "danger" });
    }
  };

  // 处理取消附加单个账单
  const handleRemoveChild = async (childId: number) => {
    if (!currentTransaction) return;
    const newIds = currentTransaction.children_ids.filter((id) => id !== childId);
    const result = await editor.updateChildrenIds(newIds);
    if (!result.success) {
      addToast({ title: "取消附加失败", description: result.error || "未知错误", color: "danger" });
    }
  };

  // 是否是根账单（没有 parent）
  const isRootTransaction = !currentTransaction.parent_id;

  return (
    <div className="space-y-3">
      {isRootTransaction && (
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="flat"
            isDisabled={isBusy}
            startContent={
              childTransactions.length > 0 ? (
                <PencilSquareIcon className="w-4 h-4" />
              ) : (
                <PlusIcon className="w-4 h-4" />
              )
            }
            onPress={() => onOpen()}
          >
            {childTransactions.length > 0 ? "选择附加账单" : "添加附加账单"}
          </Button>
        </div>
      )}

      {!isRootTransaction && parentTransaction && (
        <div className="space-y-2">
          <div className="text-sm font-bold">该账单已被附加到以下账单</div>

          <div className="flex items-center gap-2 p-2 rounded-lg text-xs">
            {/* 状态 */}
            <div className="flex-shrink-0">
              {parentTransaction.status && (
                <Chip
                  size="sm"
                  color={TRANSACTION_STATUS_COLORS[parentTransaction.status]}
                  variant="flat"
                >
                  {parentTransaction.status}
                </Chip>
              )}
            </div>

            {/* 日期时间 */}
            <div className="flex-shrink-0 w-28 truncate text-gray-500 dark:text-gray-400">
              {formatDateTime(parentTransaction.datetime)}
            </div>

            {/* 账户 */}
            <div className="flex-shrink-0 w-18 truncate">
              {parentTransaction.account?.name || "-"}
            </div>

            {/* 金额 */}
            <div
              className={`flex-shrink-0 w-20 font-semibold ${getAmountColorClass(parentTransaction.transaction_type)}`}
            >
              ¥ {getAmountSymbol(parentTransaction.transaction_type)}
              {Math.abs(calculateAmount(parentTransaction)).toFixed(2)}
            </div>

            {/* 类别 */}
            <div className="flex-shrink-0 w-32 truncate text-gray-600 dark:text-gray-400">
              {formatCategoryText(parentTransaction)}
            </div>

            {/* 名称 */}
            <div className="flex-1 truncate">
              {parentTransaction.name || parentTransaction.title || "-"}
            </div>

            {/* 跳转按钮 */}
            <div className="flex-shrink-0">
              <Button
                size="sm"
                variant="flat"
                color="default"
                onPress={() => editor.selectTransaction(parentTransaction.id)}
                title="跳转到主账单"
              >
                <ArrowUpRightIcon className="w-4 h-4" />
                跳转到主账单
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 显示已附加的账单列表 */}
      {childTransactions.length > 0 && (
        <div className="space-y-2">
          {/* 第0行：本账单信息（账户与金额可编辑） */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800 text-xs">
            {/* 账户 - 可编辑 */}
            <Select
              aria-label="账户"
              placeholder="账户"
              selectedKeys={
                currentTransaction.account?.id ? [String(currentTransaction.account.id)] : []
              }
              onSelectionChange={(keys) => {
                const key = Array.from(keys)[0] as string;
                if (key) editor.updateFields({ account: key });
              }}
              size="sm"
              variant="underlined"
              className="w-32 flex-shrink-0"
              classNames={{ value: "text-[13px]", trigger: "min-h-8" }}
            >
              {accounts.map((account) => (
                <SelectItem key={account.id.toString()}>{account.name}</SelectItem>
              ))}
            </Select>

            {/* 金额 - 可编辑 */}
            <div className="w-32 flex-shrink-0">
              <AmountInput
                value={Math.abs(currentTransaction.amount ?? 0).toFixed(2)}
                onChange={(v) => editor.updateFields({ amount: v })}
                transactionType={currentTransaction.transaction_type ?? undefined}
                textSize="text-sm"
                minHeight="min-h-[36px]"
                className="h-full"
              />
            </div>

            {/* 类别 */}
            <div className="flex-shrink-0 w-32 truncate text-gray-600 dark:text-gray-400">
              {formatCategoryText(currentTransaction)}
            </div>

            {/* 名称 */}
            <div className="flex-1 truncate">
              {currentTransaction.name || currentTransaction.title || "-"}
            </div>

            {/* 占位（与子行按钮区等宽，不显示任何按钮） */}
            <div className="flex-shrink-0 w-[68px] text-sm text-default-600 text-center">本交易</div>
          </div>

          {/* 子账单列表 */}
          {childTransactions.map((child) => (
            <div
              key={child.id}
              className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800 text-xs"
            >
              {/* 账户 */}
              <div className="flex-shrink-0 w-32 truncate">{child.account?.name || "-"}</div>

              {/* 金额 */}
              <div className="w-32 flex-shrink-0">
                <AmountInput
                  value={Math.abs(child.amount ?? 0).toFixed(2)}
                  transactionType={child.transaction_type ?? undefined}
                  textSize="text-sm"
                  minHeight="min-h-[36px]"
                  isDisabled
                  className="h-full"
                />
              </div>

              {/* 类别 */}
              <div className="flex-shrink-0 w-32 truncate text-gray-600 dark:text-gray-400">
                {formatCategoryText(child)}
              </div>

              {/* 名称 */}
              <div className="flex-1 truncate">{child.name || child.title || "-"}</div>

              {/* 操作按钮 */}
              <div className="flex-shrink-0 flex gap-1">
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  color="default"
                  onPress={() => editor.selectTransaction(child.id)}
                  title="跳转到该账单"
                >
                  <ArrowUpRightIcon className="w-4 h-4" />
                </Button>
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  color="danger"
                  isDisabled={isBusy}
                  onPress={() => handleRemoveChild(child.id)}
                  title="取消附加"
                >
                  <XMarkIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 入口汇总 */}
      {entranceSummary.length >= 2 && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-divider" />
            <span className="text-[11px] text-default-400 font-medium tracking-wide px-1">汇总</span>
            <div className="h-px flex-1 bg-divider" />
          </div>
          <div className="flex gap-2 px-1 overflow-x-auto pb-1">
            {entranceSummary.map((item) => (
              <div
                key={item.account.id}
                className="w-32 flex-shrink-0 flex flex-col items-center gap-1 px-2 py-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60"
              >
                <span className="text-xs font-semibold truncate w-full text-center text-default-600 dark:text-default-400">
                  {item.account.name}
                </span>
                <span className={`text-sm font-bold ${getAmountColorClass(item.transaction_type)}`}>
                  <span className="text-default-400 font-normal">¥ </span>
                  {getAmountSymbol(item.transaction_type)}{Math.abs(item.amount).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 账单选择器 Modal */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="5xl"
        scrollBehavior="inside"
        classNames={{
          base: "max-h-[90vh]",
          body: "p-6",
        }}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">选择要附加的账单</ModalHeader>
          <ModalBody>
            <TransactionListSelector
              key={selectorKey}
              selectedIds={childrenIds}
              currentTransactionId={currentTransaction.id}
              isDisabled={isBusy}
              onConfirm={handleConfirmSelection}
            />
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  );
}
