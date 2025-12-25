'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Transaction, TransactionWithRelations, TransactionInsert, TransactionSplit, TransactionSplitInsert } from '@/types';
import { getTransactions, deleteAllTransactions, bulkInsertTransactions, bulkInsertTransactionSplits } from '@/app/actions/data';
import { useAppData } from './app-data-context';

interface TransactionCacheData {
  transactions: TransactionWithRelations[];
  isLoading: boolean;
  error: string | null;
}

interface TransactionCacheContextValue extends TransactionCacheData {
  loadTransactions: () => Promise<void>;
  syncTransactions: () => Promise<void>;
  setTransactions: (transactions: TransactionWithRelations[]) => void;
  getTransactionById: (id: number) => TransactionWithRelations | undefined;
}

const TransactionCacheContext = createContext<TransactionCacheContextValue | undefined>(undefined);

export function TransactionCacheProvider({ children }: { children: React.ReactNode }) {
  const { accounts, mainCategories, subCategories, budgetTypes } = useAppData();
  const [data, setData] = useState<TransactionCacheData>({
    transactions: [],
    isLoading: false,
    error: null,
  });

  /**
   * 将扁平的交易数据添加关联数据（账户、类别对象、父记录、拆账等）
   */
  const enrichTransactionData = useCallback((flatTransactions: Transaction[], flatSplits: TransactionSplit[] = []): TransactionWithRelations[] => {
    // 第一遍：添加账户、类别、预算等关联数据，以及 splits
    const enrichedTransactions: TransactionWithRelations[] = flatTransactions.map(tx => {
      const account = accounts.find(a => a.id === tx.account_id);
      const mainCategory = mainCategories.find(mc => mc.id === tx.main_category_id);
      const subCategory = subCategories.find(sc => sc.id === tx.sub_category_id);
      const budgetType = budgetTypes.find(bt => bt.id === tx.budget_type_id);
      const splits = flatSplits.filter(split => split.transaction_id === tx.id);

      return {
        ...tx,
        account,
        main_category: mainCategory,
        sub_category: subCategory,
        budget_type: budgetType,
        parent: undefined, // 初始化为 undefined，稍后更新
        children: [], // 初始化为空数组，稍后更新
        splits: splits.length > 0 ? splits : [],
      };
    });

    // 第二遍：为有 parent_id 的记录添加 parent 引用，并维护 children 关系
    enrichedTransactions.forEach(tx => {
      if (tx.parent_id) {
        const parent = enrichedTransactions.find(p => p.id === tx.parent_id);
        if (parent) {
          tx.parent = parent;
          // 将当前交易添加到父交易的 children 数组中
          parent.children.push(tx);
        }
      }
    });

    return enrichedTransactions;
  }, [accounts, mainCategories, subCategories, budgetTypes]);

  /**
   * 从云端加载交易数据（覆盖本地缓存）
   */
  const loadTransactions = useCallback(async () => {
    setData(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await getTransactions();

      if (!result.success) {
        throw new Error(result.error || '获取交易数据失败');
      }

      const enrichedData = enrichTransactionData(result.data || [], result.splits || []);

      setData({
        transactions: enrichedData,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('加载交易数据失败:', error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : '加载交易数据失败',
      }));
    }
  }, [enrichTransactionData]);

  /**
   * 同步本地数据到云端（先删除所有，再批量插入）
   * 注意：此操作会重新生成所有交易的 ID，因此同步后需要从服务器重新加载数据
   */
  const syncTransactions = useCallback(async () => {
    setData(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // 步骤1：删除所有现有交易记录（相关的 splits 会被数据库级联删除）
      const deleteResult = await deleteAllTransactions();
      if (!deleteResult.success) {
        throw new Error(deleteResult.error || '删除现有交易记录失败');
      }

      // 步骤2：批量插入新的交易记录
      const insertData: Array<Omit<TransactionInsert, 'user_id'>> = data.transactions.map(tx => {
        // 移除关联对象字段和 splits，保留原始 Transaction 字段（包括 id）
        const { account, main_category, sub_category, budget_type, parent, splits, ...rawTx } = tx;
        return {
          // 注意：包含 id 字段，这样数据库会尝试使用原始 ID
          // 如果该 ID 已存在或不存在冲突，PostgreSQL 会使用它
          id: rawTx.id,
          account_id: rawTx.account_id,
          amount: rawTx.amount,
          budget_type_id: rawTx.budget_type_id,
          datetime: rawTx.datetime,
          main_category_id: rawTx.main_category_id,
          merchant: rawTx.merchant,
          name: rawTx.name,
          original_amount: rawTx.original_amount,
          parent_id: rawTx.parent_id,
          raw_info: rawTx.raw_info,
          remark: rawTx.remark,
          source: rawTx.source,
          status: rawTx.status,
          sub_category_id: rawTx.sub_category_id,
          title: rawTx.title,
          transaction_type: rawTx.transaction_type,
        };
      });

      const insertResult = await bulkInsertTransactions(insertData);
      if (!insertResult.success) {
        throw new Error(insertResult.error || '批量插入交易记录失败');
      }

      // 步骤3：批量插入 splits 数据
      const allSplits: Array<Omit<TransactionSplitInsert, 'user_id'>> = [];
      data.transactions.forEach(tx => {
        if (tx.splits && tx.splits.length > 0) {
          // 找到新插入的交易ID（根据原始ID匹配）
          const newTransaction = insertResult.data?.find(newTx => newTx.id === tx.id);
          if (newTransaction) {
            tx.splits.forEach(split => {
              allSplits.push({
                transaction_id: newTransaction.id,
                account_id: split.account_id,
                amount: split.amount,
                budget_type_id: split.budget_type_id,
                main_category_id: split.main_category_id,
                sub_category_id: split.sub_category_id,
                transaction_type: split.transaction_type,
                name: split.name,
              });
            });
          }
        }
      });

      if (allSplits.length > 0) {
        const splitsResult = await bulkInsertTransactionSplits(allSplits);
        if (!splitsResult.success) {
          throw new Error(splitsResult.error || '批量插入拆账记录失败');
        }
      }

      // 步骤4：同步完成后，从服务器重新加载数据以确保 ID 一致
      // 这样可以获取数据库实际生成的 ID（如果有新记录的话）
      const enrichedData = enrichTransactionData(insertResult.data || [], allSplits.length > 0 ? [] : []);

      setData({
        transactions: enrichedData,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('同步交易数据失败:', error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : '同步交易数据失败',
      }));
    }
  }, [data.transactions, enrichTransactionData]);

  /**
   * 直接设置交易数据（用于测试）
   */
  const setTransactions = useCallback((transactions: TransactionWithRelations[]) => {
    setData(prev => ({
      ...prev,
      transactions,
    }));
  }, []);

  /**
   * 根据 ID 获取交易记录
   */
  const getTransactionById = useCallback((id: number): TransactionWithRelations | undefined => {
    return data.transactions.find(tx => tx.id === id);
  }, [data.transactions]);

  const value: TransactionCacheContextValue = {
    ...data,
    loadTransactions,
    syncTransactions,
    setTransactions,
    getTransactionById,
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


