"use client";

import { Button } from "@heroui/react";
import { Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/react";
import { useDisclosure } from "@heroui/react";
import { Chip } from "@heroui/react";
import { addToast } from "@heroui/react";
import { PlusIcon, XMarkIcon, ArrowUpRightIcon, PencilSquareIcon, CalculatorIcon } from "@heroicons/react/24/outline";
import { TransactionListSelector } from "@/components/homepage/common/transaction-list-selector";
import { useTransactionStore } from "@/components/context/transaction-store-context";
import { useTransactionEditor } from "@/components/context/transaction-editor-context";
import { TRANSACTION_STATUS_COLORS } from '@/constants/transaction-type';
import { calculateAmount, getAmountColorClass, getAmountSymbol, formatDateTime, formatCategoryText } from '@/lib/transaction/transaction-display';

export function TxParentArea() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const store = useTransactionStore();
  const editor = useTransactionEditor();
  const currentTransaction = editor.currentTransaction;
  const childTransactions = editor.currentChildTransactions;
  const parentTransaction = editor.currentParentTransaction;
  const isBusy = store.saveState !== 'idle';

  // 如果没有选中交易，不显示任何内容
  if (!currentTransaction) {
    return (
      <div className="text-xs text-gray-500 dark:text-gray-500">
        请先选择一个交易
      </div>
    );
  }

  // 获取已附加的账单ID列表
  const childrenIds = currentTransaction.children_ids;
  const selectorKey = `${currentTransaction.id}:${childrenIds.join(',')}`;

  // 计算账户金额汇总
  const calculateAccountSummary = () => {
    if (!isRootTransaction || childTransactions.length === 0) {
      return null;
    }

    // 收集所有交易（根账单 + 子账单）
    const allTransactions = [currentTransaction, ...childTransactions];
    
    // 按账户分组求和
    const accountMap = new Map<string, { name: string; amount: number }>();
    allTransactions.forEach(tx => {
      const accountName = tx.account?.name || '未知账户';
      const amount = calculateAmount(tx);
      if (accountMap.has(accountName)) {
        accountMap.get(accountName)!.amount += amount;
      } else {
        accountMap.set(accountName, { name: accountName, amount });
      }
    });

    // 转换为数组并按金额绝对值降序排序
    const accounts = Array.from(accountMap.values()).sort((a, b) => 
      Math.abs(b.amount) - Math.abs(a.amount)
    );
    return accounts;
  };

  // 处理添加附加账单
  const handleConfirmSelection = async (selectedIds: number[]) => {
    if (!currentTransaction) return;
    onClose();
    const result = await editor.updateChildrenIds(selectedIds);
    if (!result.success) {
      addToast({ title: '附加账单失败', description: result.error || '未知错误', color: 'danger' });
    }
  };

  // 处理取消附加单个账单
  const handleRemoveChild = async (childId: number) => {
    if (!currentTransaction) return;
    const newIds = currentTransaction.children_ids.filter(id => id !== childId);
    const result = await editor.updateChildrenIds(newIds);
    if (!result.success) {
      addToast({ title: '取消附加失败', description: result.error || '未知错误', color: 'danger' });
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
              childTransactions.length > 0 
                ? <PencilSquareIcon className="w-4 h-4" />
                : <PlusIcon className="w-4 h-4" />
            }
            onPress={() => onOpen()}
          >
            {childTransactions.length > 0 ? '选择附加账单' : '添加附加账单'}
          </Button>

          {/* 账户汇总信息 */}
          {childTransactions.length > 0 && (() => {
            const accountSummary = calculateAccountSummary();
            if (!accountSummary || accountSummary.length === 0) return null;

            const displayAccounts = accountSummary.slice(0, 2);
            const remainingCount = accountSummary.length - 2;

            return (
              <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800">
                <CalculatorIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300 font-bold">汇总</span>
                {displayAccounts.map((account, index) => (
                  <div key={index} className="flex items-center gap-1">
                    <span className="text-gray-700 dark:text-gray-300">{account.name}</span>
                    <span className="font-semibold">
                      {account.amount > 0 ? '+' : ''}{account.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
                {remainingCount > 0 && (
                  <span className="text-gray-500 dark:text-gray-400">
                    （还有{remainingCount}个账户）
                  </span>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {!isRootTransaction && parentTransaction && (
        <div className="space-y-2">
          <div className="text-sm font-bold">
            该账单已被附加到以下账单
          </div>
          
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
              {parentTransaction.account?.name || '-'}
            </div>

            {/* 金额 */}
            <div className={`flex-shrink-0 w-20 font-semibold ${getAmountColorClass(parentTransaction.transaction_type)}`}>
              ¥ {getAmountSymbol(parentTransaction.transaction_type)}{Math.abs(calculateAmount(parentTransaction)).toFixed(2)}
            </div>

            {/* 类别 */}
            <div className="flex-shrink-0 w-32 truncate text-gray-600 dark:text-gray-400">
              {formatCategoryText(parentTransaction)}
            </div>

            {/* 名称 */}
            <div className="flex-1 truncate">
              {parentTransaction.name || parentTransaction.title || '-'}
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
          {childTransactions.map((child) => (
            <div
              key={child.id}
              className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800 text-xs"
            >
              {/* 账户 */}
              <div className="flex-shrink-0 w-18 truncate">
                {child.account?.name || '-'}
              </div>

              {/* 金额 */}
              <div className={`flex-shrink-0 w-20 font-semibold ${getAmountColorClass(child.transaction_type)}`}>
                ¥ {getAmountSymbol(child.transaction_type)}{Math.abs(calculateAmount(child)).toFixed(2)}
              </div>

              {/* 类别 */}
              <div className="flex-shrink-0 w-32 truncate text-gray-600 dark:text-gray-400">
                {formatCategoryText(child)}
              </div>

              {/* 名称 */}
              <div className="flex-1 truncate">
                {child.name || child.title || '-'}
              </div>

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
          <ModalHeader className="flex flex-col gap-1">
            选择要附加的账单
          </ModalHeader>
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
