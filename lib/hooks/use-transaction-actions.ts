import type {
  TransactionWithRelations,
  TransactionSplitWithRelations,
  TransactionStatus,
} from "@/types";
import { TRANSACTION_TYPES } from "@/constants/transaction-type";
import { useAppData } from "@/components/context/app-data-context";
import { useTransactionCache } from "@/components/context/transaction-cache-context";
import type { TxFieldInputsData } from "@/components/homepage/tx-field-inputs";
import type { FourChainState } from "@/components/homepage/common/four-chain-selector";
import type { SplitEntryData } from "@/components/homepage/split-area/split-entry-editor";

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
}

export function useTransactionActions({
  currentTransaction,
  filteredTransactions,
  currentIndex,
  totalCount,
  onSelectTransaction,
  getFormSnapshot,
}: UseTransactionActionsOptions) {
  const { accounts, mainCategories, subCategories, budgetTypes } = useAppData();
  const { saveTransaction } = useTransactionCache();

  // ==================== 内部方法 ====================

  function buildTransaction(
    formData: TxFieldInputsData,
    fourChainState: FourChainState,
    splitEntries: SplitEntryData[],
  ): TransactionWithRelations {
    if (!currentTransaction) throw new Error("没有选中的交易");

    // 交易类型 sign（收入 +1，支出 -1，转账 -1 etc.）
    const txTypeDef = fourChainState.txType
      ? TRANSACTION_TYPES.find((t) => t.type === fourChainState.txType)
      : null;
    const sign = txTypeDef?.sign ?? 1;

    // 查找关联对象
    const account = accounts.find((a) => String(a.id) === formData.account);
    if (!account) throw new Error(`找不到账户 ID: ${formData.account}`);
    const mainCategory = fourChainState.main_id
      ? mainCategories.find((m) => String(m.id) === fourChainState.main_id)
      : undefined;
    const subCategory = fourChainState.sub_id
      ? subCategories.find((s) => String(s.id) === fourChainState.sub_id)
      : undefined;
    const budgetType = fourChainState.budget_id
      ? budgetTypes.find((b) => String(b.id) === fourChainState.budget_id)
      : undefined;

    // 日期：DateValue.toString() → "YYYY-MM-DDTHH:MM:SS"，追加时区零偏移
    const datetime = formData.date ? formData.date.toString() : null;

    // 构建拆账条目
    const splits: TransactionSplitWithRelations[] = splitEntries.map((entry) => {
      const splitTxTypeDef = entry.chainState.txType
        ? TRANSACTION_TYPES.find((t) => t.type === entry.chainState.txType)
        : null;
      const splitSign = splitTxTypeDef?.sign ?? 1;
      const splitAccount = accounts.find((a) => String(a.id) === entry.accountId);
      if (!splitAccount) throw new Error(`拆账条目找不到账户 ID: ${entry.accountId}`);

      // localId 格式为 "db-{n}" 表示已存在的记录，否则为新建（id = 0）
      const splitId = entry.localId.startsWith("db-")
        ? parseInt(entry.localId.slice(3), 10)
        : 0;

      return {
        id: splitId,
        amount: splitSign * parseFloat(entry.amount || "0"),
        name: entry.name || null,
        transaction_type: entry.chainState.txType ?? null,
        user_id: currentTransaction.user_id,
        account: splitAccount,
        main_category: entry.chainState.main_id
          ? mainCategories.find((m) => String(m.id) === entry.chainState.main_id)
          : undefined,
        sub_category: entry.chainState.sub_id
          ? subCategories.find((s) => String(s.id) === entry.chainState.sub_id)
          : undefined,
        budget_type: entry.chainState.budget_id
          ? budgetTypes.find((b) => String(b.id) === entry.chainState.budget_id)
          : undefined,
        // transaction 字段填原始交易引用（context 内保存时会重新提取 ID）
        transaction: currentTransaction as any,
      };
    });

    return {
      ...currentTransaction,
      amount: sign * parseFloat(formData.amount || "0"),
      name: formData.name,
      merchant: formData.merchant || null,
      datetime,
      status: formData.status ?? null,
      source: formData.source ?? null,
      remark: formData.remark ?? null,
      title: formData.title ?? null,
      raw_info: (formData.raw_info as any) ?? null,
      transaction_type: fourChainState.txType ?? null,
      account,
      main_category: mainCategory,
      sub_category: subCategory,
      budget_type: budgetType,
      splits,
    };
  }

  // ==================== 保存方法 ====================

  /** 以指定状态保存当前交易 */
  async function saveWithStatus(status: TransactionStatus) {
    if (!currentTransaction) return { success: false, error: "没有选中的交易" };
    const { formData, chainState, splitEntries } = getFormSnapshot();
    const tx = buildTransaction(
      { ...formData, status },
      chainState,
      splitEntries,
    );
    return saveTransaction(tx);
  }

  /** 保存当前交易（保留表单中的状态）*/
  async function save() {
    if (!currentTransaction) return { success: false, error: "没有选中的交易" };
    const { formData, chainState, splitEntries } = getFormSnapshot();
    const tx = buildTransaction(formData, chainState, splitEntries);
    return saveTransaction(tx);
  }

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

  return {
    save,
    saveWithStatus,
    goToPrevious,
    goToNext,
  };
}

export type TransactionActions = ReturnType<typeof useTransactionActions>;
