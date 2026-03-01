import type {
  TransactionWithRelations,
  TransactionSplitWithRelations,
  TransactionStatus,
} from "@/types";
import { useAppData } from "@/components/context/app-data-context";
import { useTransactionCache } from "@/components/context/transaction-cache-context";
import type { TxFieldInputsData } from "@/components/homepage/tx-field-inputs";
import type { FourChainState } from "@/components/homepage/common/four-chain-selector";
import type { SplitEntryData } from "@/components/homepage/split-area/split-entry-editor";
import { addToast } from "@heroui/toast";

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
  const { transactions, setTransactions, syncTransactions, deleteTransactions, createEmptyTransaction } = useTransactionCache();

  // ==================== 缓存更新方法 ====================

  /**
   * 将当前页面表单数据写回缓存中的当前交易
   * @param status 可选的新状态，不传则保持当前交易的原有状态
   */
  const updateCurrentTransactionInCache = (status?: TransactionStatus) => {
    if (!currentTransaction) return;

    const { formData, chainState, splitEntries } = getFormSnapshot();

    const account = accounts.find(a => String(a.id) === formData.account);
    if (!account) return; // 账户为必填项

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

    const updatedTx: TransactionWithRelations = {
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

    setTransactions(transactions.map(tx =>
      tx.id === currentTransaction.id ? updatedTx : tx
    ));
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
    updateCurrentTransactionInCache,
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
