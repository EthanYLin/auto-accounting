'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Transaction, TransactionWithRelations, TransactionInsert, TransactionSplit, TransactionSplitInsert } from '@/types';
import { deleteAllTransactions, bulkInsertTransactions, bulkInsertTransactionSplits, insertTransaction, getAllTransactions, getAllTransactionSplits, updateTransaction, deleteTransactionSplits, bulkDeleteTransactions } from '@/app/actions/data';
import { useAppData } from './app-data-context';
import { useError } from './error-context';

interface TransactionCacheData {
  transactions: TransactionWithRelations[];
  isLoading: boolean;
  error: string | null;
  hasLoaded: boolean;
}

interface TransactionCacheContextValue extends TransactionCacheData {
  loadTransactions: () => Promise<void>;
  syncTransactions: () => Promise<void>;
  setTransactions: (transactions: TransactionWithRelations[]) => void;
  createEmptyTransaction: () => Promise<{ success: boolean; data?: TransactionWithRelations; error?: string }>;
  createTransactions: (transactions: TransactionWithRelations[]) => Promise<{ success: boolean; error?: string }>;
  saveTransaction: (transaction: TransactionWithRelations) => Promise<{ success: boolean; error?: string }>;
  deleteTransactions: (ids: number[]) => Promise<{ success: boolean; error?: string }>;
  deleteAllTransactions: () => Promise<{ success: boolean; error?: string }>;
}

const TransactionCacheContext = createContext<TransactionCacheContextValue | undefined>(undefined);

export function TransactionCacheProvider({ children }: { children: React.ReactNode }) {
  const { accounts, mainCategories, subCategories, budgetTypes } = useAppData();
  const { showError } = useError();
  const [data, setData] = useState<TransactionCacheData>({
    transactions: [],
    isLoading: false,
    error: null,
    hasLoaded: false,
  });

  /**
   * 将数据库的 Tx 及 TxSplit 转换为带有关联数据的 TxWithRelations 对象
   */
  const buildTransactionsWithRelations = useCallback((allTransactions: Transaction[], allSplits: TransactionSplit[] = []): TransactionWithRelations[] => {
    // 第一遍：添加账户、类别、预算等关联数据，以及 splits
    const txWithRelations: TransactionWithRelations[] = allTransactions.map(tx => {
      // 添加账户、类别、预算等关联数据
      const account = accounts.find(a => a.id === tx.account_id);
      const mainCategory = mainCategories.find(mc => mc.id === tx.main_category_id);
      const subCategory = subCategories.find(sc => sc.id === tx.sub_category_id);
      const budgetType = budgetTypes.find(bt => bt.id === tx.budget_type_id);
      
      // 构造 SplitWithRelations 数组
      const txSplitsWithRelations = allSplits
        .filter(split => split.transaction_id === tx.id)
        .map(split => {
          // 添加账户、类别、预算等关联数据
          const splitAccount = accounts.find(a => a.id === split.account_id);
          const splitMainCategory = mainCategories.find(mc => mc.id === split.main_category_id);
          const splitSubCategory = subCategories.find(sc => sc.id === split.sub_category_id);
          const splitBudgetType = budgetTypes.find(bt => bt.id === split.budget_type_id);
          
          // 排除 ID 字段
          const { account_id, main_category_id, sub_category_id, budget_type_id, transaction_id, ...splitWithoutIds } = split;
          return {
            ...splitWithoutIds,
            account: splitAccount!,
            main_category: splitMainCategory,
            sub_category: splitSubCategory,
            budget_type: splitBudgetType,
            transaction: tx,
          };
        });

      // 排除 ID 字段，构造 TransactionWithRelations
      const { account_id, main_category_id, sub_category_id, budget_type_id, parent_id, ...txWithoutIds } = tx;
      return {
        ...txWithoutIds,
        account: account!,
        main_category: mainCategory,
        sub_category: subCategory,
        budget_type: budgetType,
        parent: undefined, // 初始化为 undefined，稍后更新
        children: [], // 初始化为空数组，稍后更新
        splits: txSplitsWithRelations,
      };
    });

    // 第二遍：为有 parent_id 的记录添加 parent 引用，并维护 children 关系
    // 使用原始的 flatTransactions 来获取 parent_id
    allTransactions.forEach((tx, index) => {
      if (tx.parent_id) {
        const parentIndex = allTransactions.findIndex(p => p.id === tx.parent_id);
        if (parentIndex !== -1) {
          txWithRelations[index].parent = txWithRelations[parentIndex];
          txWithRelations[parentIndex].children.push(txWithRelations[index]);
        }
      }
    });

    return txWithRelations;
  }, [accounts, mainCategories, subCategories, budgetTypes]);

  /**
   * 将 TransactionWithRelations 还原为 Transaction 和 TransactionSplit[]
   * 该方法只还原根账单及其拆账记录，不包含 parent 和 children 记录，但会添加 parent_id 字段
   * 用于将数据保存到数据库
   */
  const buildTransactionAndSplits = useCallback((txWithRelations: TransactionWithRelations): {
    transaction: Transaction;
    splits: TransactionSplit[];
  } => {
    // 排除关系对象字段，提取原始数据
    const { account, main_category, sub_category, budget_type, parent, children, splits: txSplits, ...txData } = txWithRelations;
    
    // 从关系对象中提取 ID，重新构造 Transaction
    const transaction: Transaction = {
      ...txData,
      account_id: account.id,
      main_category_id: main_category?.id ?? null,
      sub_category_id: sub_category?.id ?? null,
      budget_type_id: budget_type?.id ?? null,
      parent_id: parent?.id ?? null,
    };

    // 从 TransactionSplitWithRelations 数组中提取 ID，重新构造 TransactionSplit[]
    const splits: TransactionSplit[] = (txSplits ?? []).map(splitWithRelations => {
      // 排除关系对象字段
      const { account, main_category, sub_category, budget_type, transaction, ...splitData } = splitWithRelations;
      return {
        ...splitData,
        account_id: account.id,
        main_category_id: main_category?.id ?? null,
        sub_category_id: sub_category?.id ?? null,
        budget_type_id: budget_type?.id ?? null,
        transaction_id: transaction.id,
      };
    });

    return { transaction, splits };
  }, []);

  /**
   * 从云端加载交易数据（覆盖本地缓存）
   */
  const loadTransactions = useCallback(async () => {
    setData(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const [transactionsResult, splitsResult] = await Promise.all([
        getAllTransactions(),
        getAllTransactionSplits()
      ]);
      if (!transactionsResult.success || !splitsResult.success) {
        throw new Error(transactionsResult.error || splitsResult.error || '获取交易数据失败');
      }

      const txWithRelations = buildTransactionsWithRelations(transactionsResult.data || [], splitsResult.data || []);

      setData({
        transactions: txWithRelations,
        isLoading: false,
        error: null,
        hasLoaded: true,
      });
    } catch (error) {
      console.error('加载交易数据失败:', error);
      const errorMessage = error instanceof Error ? error.message : '加载交易数据失败';
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        hasLoaded: true,
      }));
      showError('加载数据失败', errorMessage);
    }
  }, [buildTransactionsWithRelations, showError]);

  /**
   * 同步本地数据到云端（先删除所有，再批量插入）
   */
  const syncTransactions = useCallback(async () => {
    setData(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // 步骤1：删除所有现有交易记录（相关的 splits 会被数据库级联删除）
      const deleteResult = await deleteAllTransactions();
      if (!deleteResult.success) {
        throw new Error(deleteResult.error || '删除现有交易记录失败');
      }

      // 步骤2：将所有本地交易数据 TxWithRelations 转换为 Transaction 和 TransactionSplit[]
      // 首先处理根记录，将根记录及其拆账记录插入到数据库中，确保子记录的 parent_id 存在
      const rootTxWithRelations = data.transactions.filter(tx => !tx.parent);
      const rootTxAndSplits = rootTxWithRelations.map(txWithRelations => buildTransactionAndSplits(txWithRelations));
      const rootTx = rootTxAndSplits.map(result => result.transaction);
      const rootSplits = rootTxAndSplits.flatMap(result => result.splits);
      const rootInsertResult = await bulkInsertTransactions(rootTx);
      if (!rootInsertResult.success) {
        throw new Error(rootInsertResult.error || '批量插入根交易记录失败');
      }
      const rootSplitsResult = await bulkInsertTransactionSplits(rootSplits);
      if (!rootSplitsResult.success) {
        throw new Error(rootSplitsResult.error || '批量插入根拆账记录失败');
      }

      // 然后处理子记录，将子记录插入到数据库中，子记录不允许有拆账记录
      const childTxWithRelations = data.transactions.filter(tx => tx.parent);
      const childTx = childTxWithRelations.map(txWithRelations => buildTransactionAndSplits(txWithRelations).transaction);
      const childInsertResult = await bulkInsertTransactions(childTx);
      if (!childInsertResult.success) {
        throw new Error(childInsertResult.error || '批量插入子交易记录失败');
      }

      // 步骤4：同步完成后，从服务器重新加载数据
      await loadTransactions();

    } catch (error) {
      console.error('同步交易数据失败:', error);
      const errorMessage = error instanceof Error ? error.message : '同步交易数据失败';
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      showError('同步数据失败', errorMessage);
    }
  }, [data.transactions, buildTransactionAndSplits, loadTransactions, showError]);

  /**
   * 直接设置交易数据
   */
  const setTransactions = useCallback((transactions: TransactionWithRelations[]) => {
    setData(prev => ({
      ...prev,
      transactions,
    }));
  }, []);

  /**
   * 创建一条空交易记录
   */
  const createEmptyTransaction = useCallback(async () => {
    if (accounts.length === 0) {
      return { success: false, error: '暂无账户，无法新建记录' } as const;
    }

    try {
      const now = new Date().toISOString();
      const result = await insertTransaction({
        account_id: accounts[0].id,
        amount: 0,
        datetime: now,
        source: '手动新建',
        status: '待处理'
      });
      if (!result.success || !result.data) {
        return { success: false, error: result.error || '新建记录失败' } as const;
      }
      
      const createdTx = buildTransactionsWithRelations([result.data])[0];
      setData(prev => ({
        ...prev,
        transactions: [createdTx, ...prev.transactions],
      }));

      return { success: true, data: createdTx } as const;

    } catch (error) {
      console.error('新建交易记录异常:', error);
      const errorMessage = error instanceof Error ? error.message : '新建记录失败';
      showError('新建记录失败', errorMessage);
      return { success: false, error: errorMessage } as const;
    }
  }, [accounts, buildTransactionsWithRelations, showError]);

  /**
   * 创建多条交易记录
   * 这些交易记录一般来自于导入或批量创建，皆为没有ID的新数据。
   * 1. 创建交易记录时会忽略记录的 ID, parent 关系。
   * 2. 若要创建拆账，只需在交易记录的 splits 中添加拆账记录即可，拆账记录的 ID 可留空。
   * 3. 若要创建子记录，只需在交易记录的 children 中添加子记录即可，子记录的 ID 及 parent 字段可留空，子记录的 splits 以及 children 字段会被忽略。
   */
  const createTransactions = useCallback(async (transactions: TransactionWithRelations[]) => {
    try {
      for (let i = 0; i < transactions.length; i++) {
        const txWithRelations = transactions[i];
        const { transaction, splits } = buildTransactionAndSplits(txWithRelations);
        
        // 1. 清空 tx 的 id, parent 关系，插入数据库
        const { id, parent_id, ...txToInsert } = transaction;
        const insertTxResult = await insertTransaction(txToInsert);
        if (!insertTxResult.success || !insertTxResult.data) {
          return { success: false, error: insertTxResult.error || '插入交易记录失败' } as const;
        }
        const createdTxId = insertTxResult.data.id;

        // 2. 清空 splits 的 id, 填写所属 tx_id，插入数据库
        const splitsToInsert = splits.map(split => {
          const { id, transaction_id, ...splitToInsert } = split;
          return {
            ...splitToInsert,
            transaction_id: createdTxId,
          };
        });
        if (splitsToInsert.length > 0) {
          const insertSplitsResult = await bulkInsertTransactionSplits(splitsToInsert);
          if (!insertSplitsResult.success) {
            return { success: false, error: insertSplitsResult.error || '插入拆账记录失败' } as const;
          }
        }

        // 3. 清空 children 的 id, 填写 parent_id，插入数据库
        const childrenToInsert = txWithRelations.children.map(child => {
          const { id, parent_id, ...childToInsert } = buildTransactionAndSplits(child).transaction;
          return {
            ...childToInsert,
            parent_id: createdTxId,
          };
        });
        if (childrenToInsert.length > 0) {
          const insertChildrenResult = await bulkInsertTransactions(childrenToInsert);
          if (!insertChildrenResult.success) {
            return { success: false, error: insertChildrenResult.error || '插入子交易记录失败' } as const;
          }
        }
      }
      
      // 重新加载数据
      await loadTransactions();
      
      return { success: true } as const;
    } catch (error) {
      console.error('创建交易记录异常:', error);
      const errorMessage = error instanceof Error ? error.message : '创建交易记录失败';
      showError('创建交易记录失败', errorMessage);
      return { success: false, error: errorMessage } as const;
    }
  }, [buildTransactionAndSplits, loadTransactions, showError]);


  /**
   * 更新交易记录，该交易记录必须拥有 id 字段。
   * 1. 更新该记录的信息
   * 2. 删除该记录的所有拆账记录，并重新添加。
   * 3. 更新该记录的所有 children 记录的信息，children 记录的 parent_id 字段会被设置为根记录的 id，children 记录的 splits 以及 children 字段会被忽略。
   */
  const saveTransaction = useCallback(async (transaction: TransactionWithRelations) => {
    if (!transaction.id) {
      return { success: false, error: '交易记录必须拥有 id 字段' } as const;
    }
    const txId = transaction.id;
    
    // 1. 更新该记录的信息
    const { transaction: tx, splits } = buildTransactionAndSplits(transaction);
    const updateTxResult = await updateTransaction(txId, tx);
    if (!updateTxResult.success) {
      return { success: false, error: updateTxResult.error || '更新交易记录失败' } as const;
    }
    
    // 2. 重新添加该记录的所有拆账记录
    const deleteSplitsResult = await deleteTransactionSplits(txId);
    if (!deleteSplitsResult.success) {
      return { success: false, error: deleteSplitsResult.error || '删除拆账记录失败' } as const;
    }
    const insertSplitsResult = await bulkInsertTransactionSplits(splits);
    if (!insertSplitsResult.success) {
      return { success: false, error: insertSplitsResult.error || '插入拆账记录失败' } as const;
    }

    // 3. 更新该记录的所有 children 记录的信息
    for (const child of transaction.children) {
      const childToUpdate = buildTransactionAndSplits(child).transaction;
      childToUpdate.parent_id = txId;
      const updateChildResult = await updateTransaction(childToUpdate.id, childToUpdate);
      if (!updateChildResult.success) {
        return { success: false, error: updateChildResult.error || '更新子交易记录失败' } as const;
      }
    }

    return { success: true } as const;

  }, [buildTransactionAndSplits, loadTransactions, updateTransaction, deleteTransactionSplits]);

  /**
   * 删除交易记录
   */
  const deleteTransactions = useCallback(async (ids: number[]) => {
    try {
      if (ids.length === 0) {
        return { success: true } as const;
      }

      // 更新本地 cache
      const idsToDelete = new Set(ids);
      const updatedTransactions = data.transactions
        .map(tx => {
          // 如果这个交易的 children 中有要删除的记录，将它们移除
          if (tx.children.length > 0) {
            const filteredChildren = tx.children.filter(child => !idsToDelete.has(child.id));
            if (filteredChildren.length !== tx.children.length) {
              return { ...tx, children: filteredChildren };
            }
          }
          return tx;
        })
        .map(tx => {
          // 如果这个交易的 parent 要被删除，将 parent 设置为 undefined
          if (tx.parent && idsToDelete.has(tx.parent.id)) {
            return { ...tx, parent: undefined };
          }
          return tx;
        })
        .filter(tx => !idsToDelete.has(tx.id)); // 移除要删除的记录

      // 更新本地状态
      setData(prev => ({
        ...prev,
        transactions: updatedTransactions,
      }));

      // 数据库删除
      const deleteResult = await bulkDeleteTransactions(ids);
      if (!deleteResult.success) {
        await loadTransactions();  // 删除失败，重新加载数据以恢复一致性
        return { success: false, error: deleteResult.error || '删除交易记录失败' } as const;
      }

      return { success: true } as const;
    } catch (error) {
      console.error('删除交易记录异常:', error);
      await loadTransactions();  // 发生异常，重新加载数据以恢复一致性
      const errorMessage = error instanceof Error ? error.message : '删除交易记录失败';
      showError('删除交易记录失败', errorMessage);
      return { success: false, error: errorMessage } as const;
    }
  }, [data.transactions, loadTransactions, showError]);

  /**
   * 删除所有交易记录
   */
  const deleteAllTransactionsFunc = useCallback(async () => {
    try {
      // 清空本地 cache
      setData(prev => ({
        ...prev,
        transactions: [],
      }));

      // 调用数据库删除所有记录
      const deleteResult = await deleteAllTransactions();
      if (!deleteResult.success) {
        await loadTransactions();  // 删除失败，重新加载数据以恢复一致性
        return { success: false, error: deleteResult.error || '删除所有交易记录失败' } as const;
      }

      return { success: true } as const;
    } catch (error) {
      console.error('删除所有交易记录异常:', error);
      await loadTransactions();  // 发生异常，重新加载数据以恢复一致性
      const errorMessage = error instanceof Error ? error.message : '删除所有交易记录失败';
      showError('删除所有交易记录失败', errorMessage);
      return { success: false, error: errorMessage } as const;
    }
  }, [loadTransactions, showError]);


  const value: TransactionCacheContextValue = {
    ...data,
    loadTransactions,
    syncTransactions,
    setTransactions,
    createEmptyTransaction,
    createTransactions,
    saveTransaction,
    deleteTransactions,
    deleteAllTransactions: deleteAllTransactionsFunc,
  };

  return <TransactionCacheContext.Provider value={value}>{children}</TransactionCacheContext.Provider>;
}

/**
 * Hook to use transaction cache
 */
export function useTransactionCache() {
  const context = useContext(TransactionCacheContext);
  if (context === undefined) {
    throw new Error('useTransactionCache must be used within a TransactionCacheProvider');
  }
  return context;
}


