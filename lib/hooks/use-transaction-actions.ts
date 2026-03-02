import { useState, useEffect } from "react";
import type {
  TransactionWithRelations,
  TransactionSplitWithRelations,
  TransactionStatus,
} from "@/types";
import { useAppData } from "@/components/context/app-data-context";
import { useTransactionCache } from "@/components/context/transaction-cache-context";
import { useTransactionValidation } from "@/lib/hooks/use-transaction-validation";
import type { TxFieldInputsData } from "@/components/homepage/tx-field-inputs";
import type { FourChainState } from "@/components/homepage/common/four-chain-selector";
import type { SplitEntryData } from "@/components/homepage/split-area/split-entry-editor";
import { addToast } from "@heroui/toast";

// ==================== 保存后提示类型 ====================

export type ValidationAlert = {
  type: 'danger' | 'warning';
  title: string;
  hints: string[];
} | null;

interface UseTransactionActionsOptions {
  currentTransaction: TransactionWithRelations | null;
  filteredTransactions: TransactionWithRelations[];
  currentIndex: number;
  totalCount: number;
  onSelectTransaction: (id: number | null) => void;
  getFormSnapshot: () => {
    formData: TxFieldInputsData;
    chainState: FourChainState;
    splitEntries: SplitEntryData[];
  };
  onLocateCurrent?: () => void;
}

export function useTransactionActions({
  currentTransaction,
  filteredTransactions,
  currentIndex,
  totalCount,
  onSelectTransaction,
  getFormSnapshot,
  onLocateCurrent,
}: UseTransactionActionsOptions) {
  const { accounts, mainCategories, subCategories, budgetTypes } = useAppData();
  const { transactions, setTransactions, syncTransactions, deleteTransactions, createEmptyTransaction, saveTransaction } = useTransactionCache();
  const { isValidTransaction, isWarningTransaction } = useTransactionValidation();

  // ==================== 保存后状态 ====================

  const [validationAlert, setValidationAlert] = useState<ValidationAlert>(null);
  const [saveButtonOverride, setSaveButtonOverride] = useState(false);

  // 切换交易时清除状态
  useEffect(() => {
    setValidationAlert(null);
    setSaveButtonOverride(false);
  }, [currentTransaction?.id]);

  // ==================== 构建更新后的交易对象 ====================

  /**
   * 从当前表单数据构建更新后的交易对象（不写入缓存）
   * @param status 可选的新状态，不传则保持当前交易的原有状态
   */
  const buildUpdatedTransaction = (status?: TransactionStatus): TransactionWithRelations | null => {
    if (!currentTransaction) return null;

    const { formData, chainState, splitEntries } = getFormSnapshot();

    const account = accounts.find(a => String(a.id) === formData.account);
    if (!account) return null; // 账户为必填项

    const mainCategory = chainState.main_id
      ? mainCategories.find(mc => String(mc.id) === chainState.main_id)
      : undefined;
    const subCategory = chainState.sub_id
      ? subCategories.find(sc => String(sc.id) === chainState.sub_id)
      : undefined;
    const budgetType = chainState.budget_id
      ? budgetTypes.find(bt => String(bt.id) === chainState.budget_id)
      : undefined;

    const amount = parseFloat(formData.amount) || 0;
    const datetime = formData.date ? formData.date.toString() : currentTransaction.datetime;
    const resolvedStatus = status ?? currentTransaction.status;

    // 构建 splits
    const splits: TransactionSplitWithRelations[] = splitEntries.map((entry, i) => {
      const splitAccount = accounts.find(a => String(a.id) === entry.accountId)!;
      const splitMainCat = entry.chainState.main_id
        ? mainCategories.find(mc => String(mc.id) === entry.chainState.main_id)
        : undefined;
      const splitSubCat = entry.chainState.sub_id
        ? subCategories.find(sc => String(sc.id) === entry.chainState.sub_id)
        : undefined;
      const splitBudget = entry.chainState.budget_id
        ? budgetTypes.find(bt => String(bt.id) === entry.chainState.budget_id)
        : undefined;

      return {
        id: i,
        amount: parseFloat(entry.amount) || 0,
        name: entry.name || null,
        transaction_type: entry.chainState.txType ?? null,
        user_id: currentTransaction.user_id,
        account: splitAccount,
        main_category: splitMainCat,
        sub_category: splitSubCat,
        budget_type: splitBudget,
      };
    });

    return {
      ...currentTransaction,
      amount,
      account,
      datetime,
      name: formData.name || null,
      merchant: formData.merchant || null,
      status: resolvedStatus,
      source: formData.source ?? null,
      remark: formData.remark ?? null,
      transaction_type: chainState.txType ?? null,
      main_category: mainCategory,
      sub_category: subCategory,
      budget_type: budgetType,
      splits,
    };
  };

  // ==================== 保存并校验方法 ====================

  /**
   * 更新缓存、校验、保存到数据库，并处理后续提示和导航
   * @param status 可选的目标状态
   * @param autoSwitch 是否在保存成功后自动切换到下一条待处理交易
   */
  const updateAndSaveCurrentTransaction = async (status?: TransactionStatus, autoSwitch: boolean = false) => {
    if (!currentTransaction) return;

    try {
      // 1. 构建更新后的交易对象
      let updatedTx = buildUpdatedTransaction(status);
      if (!updatedTx) return;

      // 2. 校验
      const validResult = isValidTransaction(updatedTx);
      const warnResult = isWarningTransaction(updatedTx);

      // 3. 若无效且用户欲保存为"已完成"或不更改状态，降级为"稍后处理"
      if (!validResult.valid && (status === '已完成' || status === undefined)) {
        updatedTx = { ...updatedTx, status: '稍后处理' };
      }

      // 4. 更新缓存并异步保存到数据库
      setTransactions(transactions.map(tx =>
        tx.id === currentTransaction.id ? updatedTx! : tx
      ));
      const txId = currentTransaction.id;
      saveTransaction(updatedTx).then(saveResult => {
        if (!saveResult.success) {
          addToast({ title: `ID为#${txId}的交易保存失败`, description: saveResult.error || '未知错误', color: 'danger' });
        }
        if (saveResult.success && !autoSwitch) {
          addToast({ title: `ID为#${txId}的交易已保存`, color: 'success' });
        }
      });

      // 5. 显示校验提示
      if (!validResult.valid && status === '已完成') {
        // (1) 无效且用户欲保存为"已完成"：Danger 提示
        setValidationAlert({
          type: 'danger',
          title: '该交易已被设置为稍后处理',
          hints: validResult.hint,
        });
      } else if (!warnResult.valid) {
        // (2) 存在警告：Warning 提示
        setValidationAlert({
          type: 'warning',
          title: '请留意以下信息',
          hints: warnResult.hint,
        });
      } else {
        setValidationAlert(null);
      }

      // 6. 按钮状态和自动切换
      const hasIssues = !validResult.valid || !warnResult.valid;
      if (hasIssues && status === '已完成' && autoSwitch) {
        // (1) 存在问题且用户欲保存为"已完成"且自动切换开：按钮变为"仍切换到下一条"
        setSaveButtonOverride(true);
      } else if (autoSwitch) {
        // (2) 自动切换开且无问题：直接切换到下一条
        goToNextPending();
      }
    } catch (error) {
      console.error('保存交易失败:', error);
      addToast({ title: '保存失败', description: error instanceof Error ? error.message : '未知错误', color: 'danger' });
    }
  };

  /**
   * 确认跳转到下一条待处理交易（在按钮覆盖模式下使用）
   */
  const confirmGoToNextPending = () => {
    setSaveButtonOverride(false);
    setValidationAlert(null);
    goToNextPending();
  };

  /**
   * 重置保存按钮覆盖状态（任何用户交互时调用）
   */
  const resetSaveButtonOverride = () => {
    setSaveButtonOverride(false);
  };

  // ==================== 导航方法 ====================

  const goToPrevious = () => {
    if (currentIndex > 1) {
      const prevTx = filteredTransactions[currentIndex - 2];
      if (prevTx) onSelectTransaction(prevTx.id);
    }
  };

  const goToNext = () => {
    if (currentIndex > 0 && currentIndex < totalCount) {
      const nextTx = filteredTransactions[currentIndex];
      if (nextTx) onSelectTransaction(nextTx.id);
    }
  };

  const goToNextPending = () => {
    // 从当前交易之后开始查找下一个待处理的交易
    const startIndex = currentIndex; // currentIndex 是 1-based，filteredTransactions[currentIndex] 即为下一条
    for (let i = startIndex; i < filteredTransactions.length; i++) {
      if (filteredTransactions[i].status === "待处理") {
        onSelectTransaction(filteredTransactions[i].id);
        return;
      }
    }
    // 若没有的话，再从头开始查找，直到当前交易的位置
    for (let i = 0; i < startIndex; i++) {
      if (filteredTransactions[i].status === "待处理") {
        onSelectTransaction(filteredTransactions[i].id);
        return;
      }
    }
    // 如果全都没有，展示提示
    addToast({
      title: "无更多待处理的交易",
      description: "当前列表中没有更多待处理的交易。",
      color: "primary"
    });
  };

  // ==================== 云端同步方法 ====================
  const uploadToServer = syncTransactions;

  // ==================== 交易操作方法 ====================
  const deleteTransaction = () => {
    if (!currentTransaction) return;
    const idToDelete = currentTransaction.id;
    deleteTransactions([idToDelete]);
    // currentIndex 是 1-based，filteredTransactions[currentIndex] 即为下一条交易（0-based）
    const nextTx = filteredTransactions[currentIndex];
    if (nextTx) {
      onSelectTransaction(nextTx.id);
    } else {
      // 没有下一条时，尝试选择前一条
      const prevTx = filteredTransactions[currentIndex - 2];
      onSelectTransaction(prevTx ? prevTx.id : null);
    }
  }

  const createNewTransaction = createEmptyTransaction;

  const locateCurrent = () => onLocateCurrent?.();

  return {
    updateAndSaveCurrentTransaction,
    confirmGoToNextPending,
    validationAlert,
    saveButtonOverride,
    resetSaveButtonOverride,
    goToPrevious,
    goToNext,
    goToNextPending,
    uploadToServer,
    deleteTransaction,
    createNewTransaction,
    locateCurrent,
  };
}

export type TransactionActions = ReturnType<typeof useTransactionActions>;
