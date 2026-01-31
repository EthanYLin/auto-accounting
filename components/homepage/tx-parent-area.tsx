"use client";

import { Button } from "@heroui/button";
import { Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/modal";
import { useDisclosure } from "@heroui/use-disclosure";
import { Chip } from "@heroui/chip";
import { PlusIcon, XMarkIcon, ArrowUpRightIcon, PencilSquareIcon, CalculatorIcon } from "@heroicons/react/24/outline";
import { TransactionListSelector } from "@/components/transaction/transaction-list-selector";
import { useTransactionCache } from "@/components/context/transaction-cache-context";
import { TRANSACTION_TYPES, TRANSACTION_STATUS_COLORS } from "@/constants/transaction-type";
import type { TransactionWithRelations } from "@/types";
import { produce } from "immer";

interface TxParentAreaProps {
  currentTransaction: TransactionWithRelations | null;
  onNavigateToTransaction: (id: number) => void;
}

export function TxParentArea({ currentTransaction, onNavigateToTransaction }: TxParentAreaProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { transactions, setTransactions } = useTransactionCache();

  // 如果没有选中交易，不显示任何内容
  if (!currentTransaction) {
    return (
      <div className="text-xs text-gray-500 dark:text-gray-500">
        请先选择一个交易
      </div>
    );
  }

  // 获取已附加的账单ID列表
  const childrenIds = currentTransaction.children.map(child => child.id);

  // 计算金额（考虑交易类型的 sign）
  const calculateAmount = (tx: TransactionWithRelations): number => {
    const txType = TRANSACTION_TYPES.find(t => t.type === tx.transaction_type);
    return tx.amount * (txType?.sign || 1);
  };

  // 获取金额颜色类名
  const getAmountColorClass = (tx: TransactionWithRelations) => {
    const txType = TRANSACTION_TYPES.find(t => t.type === tx.transaction_type);
    return txType?.amount_color || 'text-default-600';
  };

  // 获取金额符号
  const getAmountSymbol = (tx: TransactionWithRelations) => {
    const txType = TRANSACTION_TYPES.find(t => t.type === tx.transaction_type);
    return txType?.sign === 1 ? '+' : '-';
  };

  // 格式化日期时间
  const formatDateTime = (datetime: string | null): string => {
    if (!datetime) return '-';
    const date = new Date(datetime);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 格式化类别显示
  const formatCategory = (tx: TransactionWithRelations): string => {
    const parts = [];
    if (tx.transaction_type) parts.push(tx.transaction_type);
    if (tx.main_category?.label) parts.push(tx.main_category.label);
    if (tx.sub_category?.label) parts.push(tx.sub_category.label);
    return parts.join('-') || '-';
  };

  // 计算账户金额汇总
  const calculateAccountSummary = () => {
    if (!isRootTransaction || currentTransaction.children.length === 0) {
      return null;
    }

    // 收集所有交易（根账单 + 子账单）
    const allTransactions = [currentTransaction, ...currentTransaction.children];
    
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
  const handleConfirmSelection = (selectedIds: number[]) => {
    if (!currentTransaction) return;

    const nextState = produce(transactions, (draft) => {
      const root = draft.find(t => t.id === currentTransaction.id);
      if (!root) return;
      
      const selectedSet = new Set(selectedIds);
      draft.forEach(tx => {
        // A. 要移除的孩子
        if (tx.parent?.id === root.id && !selectedSet.has(tx.id)) {
          tx.parent = undefined;
        }

        // B. 要添加的孩子
        if (tx.parent?.id !== root.id && selectedSet.has(tx.id)) {
          // 从旧父节点移除
          const oldParent = draft.find(p => p.id === tx.parent?.id);
          if (oldParent) {
            oldParent.children = oldParent.children.filter(c => c.id !== tx.id);
          }
          // 添加到新父节点
          tx.parent = root; 
          // 清理孙子节点
          tx.children.forEach(c => {
            const gc = draft.find(t => t.id === c.id);
            if(gc) gc.parent = undefined; 
          });
          tx.children = [];
        }
      });

      // 重建 root.children 数组
      root.children = draft.filter(t => t.parent?.id === root.id);
    });
    setTransactions(nextState);
    onClose();
  };

  // 处理取消附加单个账单
  const handleRemoveChild = (childId: number) => {
    if (!currentTransaction) return;
    const nextState = produce(transactions, (draft) => {
      const root = draft.find(t => t.id === currentTransaction.id);
      const child = draft.find(t => t.id === childId);
      if (!root || !child) return;
      
      // 从父节点的 children 中移除
      root.children = root.children.filter(c => c.id !== childId);
      
      // 清空子节点的 parent
      child.parent = undefined;
    });
    
    setTransactions(nextState);
  };

  // 是否是根账单（没有 parent）
  const isRootTransaction = !currentTransaction.parent;

  return (
    <div className="space-y-3">
      {isRootTransaction && (
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="flat"
            startContent={
              currentTransaction.children.length > 0 
                ? <PencilSquareIcon className="w-4 h-4" />
                : <PlusIcon className="w-4 h-4" />
            }
            onPress={onOpen}
          >
            {currentTransaction.children.length > 0 ? '选择附加账单' : '添加附加账单'}
          </Button>

          {/* 账户汇总信息 */}
          {currentTransaction.children.length > 0 && (() => {
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

      {!isRootTransaction && currentTransaction.parent && (
        <div className="space-y-2">
          <div className="text-sm font-bold">
            该账单已被附加到以下账单
          </div>
          
          <div className="flex items-center gap-2 p-2 rounded-lg text-xs">
            {/* 状态 */}
            <div className="flex-shrink-0">
              {currentTransaction.parent.status && (
                <Chip
                  size="sm"
                  color={TRANSACTION_STATUS_COLORS[currentTransaction.parent.status]}
                  variant="flat"
                >
                  {currentTransaction.parent.status}
                </Chip>
              )}
            </div>

            {/* 日期时间 */}
            <div className="flex-shrink-0 w-28 truncate text-gray-500 dark:text-gray-400">
              {formatDateTime(currentTransaction.parent.datetime)}
            </div>
            
            {/* 账户 */}
            <div className="flex-shrink-0 w-18 truncate">
              {currentTransaction.parent.account?.name || '-'}
            </div>

            {/* 金额 */}
            <div className={`flex-shrink-0 w-20 font-semibold ${getAmountColorClass(currentTransaction.parent)}`}>
              ¥ {getAmountSymbol(currentTransaction.parent)}{Math.abs(calculateAmount(currentTransaction.parent)).toFixed(2)}
            </div>

            {/* 类别 */}
            <div className="flex-shrink-0 w-32 truncate text-gray-600 dark:text-gray-400">
              {formatCategory(currentTransaction.parent)}
            </div>

            {/* 名称 */}
            <div className="flex-1 truncate">
              {currentTransaction.parent.name || currentTransaction.parent.title || '-'}
            </div>

            {/* 跳转按钮 */}
            <div className="flex-shrink-0">
              <Button
                size="sm"
                variant="flat"
                color="default"
                onPress={() => onNavigateToTransaction(currentTransaction.parent!.id)}
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
      {currentTransaction.children.length > 0 && (
        <div className="space-y-2">
          {currentTransaction.children.map((child) => (
            <div
              key={child.id}
              className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800 text-xs"
            >
              {/* 账户 */}
              <div className="flex-shrink-0 w-18 truncate">
                {child.account?.name || '-'}
              </div>

              {/* 金额 */}
              <div className={`flex-shrink-0 w-20 font-semibold ${getAmountColorClass(child)}`}>
                ¥ {getAmountSymbol(child)}{Math.abs(calculateAmount(child)).toFixed(2)}
              </div>

              {/* 类别 */}
              <div className="flex-shrink-0 w-32 truncate text-gray-600 dark:text-gray-400">
                {formatCategory(child)}
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
                  onPress={() => onNavigateToTransaction(child.id)}
                  title="跳转到该账单"
                >
                  <ArrowUpRightIcon className="w-4 h-4" />
                </Button>
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  color="danger"
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
              selectedIds={childrenIds}
              currentTransactionId={currentTransaction.id}
              onConfirm={handleConfirmSelection}
            />
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  );
}
