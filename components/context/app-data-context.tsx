'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Account, MainCategory, SubCategory, BudgetType } from '@/types';
import { getAccounts, getMainCategories, getSubCategories, getBudgetTypes } from '@/app/actions/data';

interface AppData {
  accounts: Account[];
  mainCategories: MainCategory[];
  subCategories: SubCategory[];
  budgetTypes: BudgetType[];
  isLoading: boolean;
  error: string | null;
}

interface AppDataContextValue extends AppData {
  loadData: () => Promise<void>;
  clearData: () => void;
  getSubCategoriesByMain: (mainCategoryId: number) => SubCategory[];
}

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>({
    accounts: [],
    mainCategories: [],
    subCategories: [],
    budgetTypes: [],
    isLoading: false,
    error: null,
  });

  /**
   * 加载所有数据
   */
  const loadData = useCallback(async () => {
    setData(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // 并行获取所有数据
      const [accountsResult, mainCategoriesResult, subCategoriesResult, budgetTypesResult] = await Promise.all([
        getAccounts(),
        getMainCategories(),
        getSubCategories(),
        getBudgetTypes(),
      ]);

      // 验证返回结果的有效性
      if (!accountsResult || typeof accountsResult !== 'object') {
        throw new Error('账户数据返回格式错误');
      }
      if (!mainCategoriesResult || typeof mainCategoriesResult !== 'object') {
        throw new Error('主类别数据返回格式错误');
      }
      if (!subCategoriesResult || typeof subCategoriesResult !== 'object') {
        throw new Error('子类别数据返回格式错误');
      }
      if (!budgetTypesResult || typeof budgetTypesResult !== 'object') {
        throw new Error('预算计划数据返回格式错误');
      }

      // 检查是否有错误
      if (!accountsResult.success) {
        throw new Error(accountsResult.error || '获取账户失败');
      }
      if (!mainCategoriesResult.success) {
        throw new Error(mainCategoriesResult.error || '获取主类别失败');
      }
      if (!subCategoriesResult.success) {
        throw new Error(subCategoriesResult.error || '获取子类别失败');
      }
      if (!budgetTypesResult.success) {
        throw new Error(budgetTypesResult.error || '获取预算计划失败');
      }

      setData({
        accounts: accountsResult.data || [],
        mainCategories: mainCategoriesResult.data || [],
        subCategories: subCategoriesResult.data || [],
        budgetTypes: budgetTypesResult.data || [],
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('加载数据失败:', error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : '加载数据失败',
      }));
    }
  }, []);

  /**
   * 清空所有数据
   */
  const clearData = useCallback(() => {
    setData({
      accounts: [],
      mainCategories: [],
      subCategories: [],
      budgetTypes: [],
      isLoading: false,
      error: null,
    });
  }, []);

  /**
   * 根据主类别ID获取子类别
   */
  const getSubCategoriesByMain = useCallback((mainCategoryId: number): SubCategory[] => {
    return data.subCategories.filter(sub => sub.main_category_id === mainCategoryId);
  }, [data.subCategories]);

  const value: AppDataContextValue = {
    ...data,
    loadData,
    clearData,
    getSubCategoriesByMain,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

/**
 * Hook to use app data
 */
export function useAppData() {
  const context = useContext(AppDataContext);
  if (context === undefined) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
}

