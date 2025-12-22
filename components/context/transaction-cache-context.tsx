'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Transaction, TransactionWithRelations, TransactionInsert } from '@/types';
import { getTransactions, deleteAllTransactions, bulkInsertTransactions } from '@/app/actions/data';
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
  getChildren: (parentId: number) => TransactionWithRelations[];
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
   * 将扁平的交易数据添加关联数据（账户、类别对象、父记录等）
   */
  const enrichTransactionData = useCallback((flatTransactions: Transaction[]): TransactionWithRelations[] => {
    // 第一遍：添加账户、类别、预算等关联数据
    const enrichedTransactions: TransactionWithRelations[] = flatTransactions.map(tx => {
      const account = accounts.find(a => a.id === tx.account_id);
      const mainCategory = mainCategories.find(mc => mc.id === tx.main_category_id);
      const subCategory = subCategories.find(sc => sc.id === tx.sub_category_id);
      const budgetType = budgetTypes.find(bt => bt.id === tx.budget_type_id);

      return {
        ...tx,
        account,
        main_category: mainCategory,
        sub_category: subCategory,
        budget_type: budgetType,
        parent: undefined, // 初始化为 undefined，稍后更新
      };
    });

    // 第二遍：为有 parent_id 的记录添加 parent 引用
    enrichedTransactions.forEach(tx => {
      if (tx.parent_id) {
        const parent = enrichedTransactions.find(p => p.id === tx.parent_id);
        if (parent) {
          tx.parent = parent;
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

      const enrichedData = enrichTransactionData(result.data || []);

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
   */
  const syncTransactions = useCallback(async () => {
    setData(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // 步骤1：删除所有现有交易记录
      const deleteResult = await deleteAllTransactions();
      if (!deleteResult.success) {
        throw new Error(deleteResult.error || '删除现有交易记录失败');
      }

      // 步骤2：批量插入新的交易记录
      const insertData: Array<Omit<TransactionInsert, 'user_id'>> = data.transactions.map(tx => {
        // 移除关联对象字段，保留原始 Transaction 字段
        const { account, main_category, sub_category, budget_type, parent, ...rawTx } = tx;
        return {
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

      setData(prev => ({
        ...prev,
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      console.error('同步交易数据失败:', error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : '同步交易数据失败',
      }));
    }
  }, [data.transactions]);

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

  /**
   * 获取指定父记录的所有子记录
   */
  const getChildren = useCallback((parentId: number): TransactionWithRelations[] => {
    return data.transactions.filter(tx => tx.parent_id === parentId);
  }, [data.transactions]);

  const value: TransactionCacheContextValue = {
    ...data,
    loadTransactions,
    syncTransactions,
    setTransactions,
    getTransactionById,
    getChildren,
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


