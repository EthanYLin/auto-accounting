'use client';

import React, { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { AppDataValue, SubCategory } from '@/types';
import { getAccounts, getMainCategories, getSubCategories, getBudgetTypes, getMatchingRules } from '@/app/actions/data';
import { getUser } from '@/app/actions/auth';


// ==================== 数据获取函数 ====================

const appDataQueryKey = ['appData'] as const;
async function fetchAllAppData(): Promise<AppDataValue> {
  const [accountsResult, mainCategoriesResult, subCategoriesResult, budgetTypesResult, matchingRulesResult] = await Promise.all([
    getAccounts(),
    getMainCategories(),
    getSubCategories(),
    getBudgetTypes(),
    getMatchingRules(),
  ]);

  if (!accountsResult.success) throw new Error(accountsResult.error || '获取账户失败');
  if (!mainCategoriesResult.success) throw new Error(mainCategoriesResult.error || '获取主类别失败');
  if (!subCategoriesResult.success) throw new Error(subCategoriesResult.error || '获取子类别失败');
  if (!budgetTypesResult.success) throw new Error(budgetTypesResult.error || '获取预算计划失败');
  if (!matchingRulesResult.success) throw new Error(matchingRulesResult.error || '获取匹配规则失败');

  return {
    accounts: accountsResult.data || [],
    mainCategories: mainCategoriesResult.data || [],
    subCategories: subCategoriesResult.data || [],
    budgetTypes: budgetTypesResult.data || [],
    matchingRules: matchingRulesResult.data || [],
  };
}

// ==================== 类型 ====================

interface AppDataContextValue extends AppDataValue {
  currentUserId: string | null;
  isLoading: boolean;
  error: string | null;
  hasLoaded: boolean;
  /** 触发数据加载（设置 enabled = true） */
  loadData: () => void;
  /** 清空数据并重置 */
  clearData: () => void;
  /** 使缓存失效并重新获取 */
  refetchData: () => Promise<void>;
  getSubCategoriesByMain: (mainCategoryId: number) => SubCategory[];
}

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

// ==================== Provider ====================

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const syncedUserRef = useRef<string | null>(null);

  const query = useQuery({
    queryKey: appDataQueryKey,
    queryFn: fetchAllAppData,
    enabled,
  });

  const loadData = useCallback(() => {
    setEnabled(true);
  }, []);

  const clearData = useCallback(() => {
    setEnabled(false);
    queryClient.removeQueries({ queryKey: appDataQueryKey });
  }, [queryClient]);

  const refetchData = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: appDataQueryKey });
  }, [queryClient]);

  useEffect(() => {
    let isActive = true;

    const checkUserAndSyncData = async () => {
      try {
        const user = await getUser();
        if (!isActive) return;
        const nextUserId = user?.id || null;
        const previousUserId = syncedUserRef.current;
        if (nextUserId === previousUserId) return;

        syncedUserRef.current = nextUserId;
        setCurrentUserId(nextUserId);
        if (!nextUserId) {
          clearData();
          return;
        }
        if (previousUserId !== null && previousUserId !== nextUserId) {
          clearData();
        }
        loadData();
      } catch (error) {
        console.error('检查用户状态时出错:', error);
      }
    };

    void checkUserAndSyncData();

    return () => { isActive = false; };
  }, [pathname, loadData, clearData]);

  const data = query.data;

  const getSubCategoriesByMain = useCallback((mainCategoryId: number): SubCategory[] => {
    return (data?.subCategories ?? []).filter(sub => sub.main_category_id === mainCategoryId);
  }, [data?.subCategories]);

  const value: AppDataContextValue = useMemo(() => ({
    currentUserId,
    accounts: data?.accounts ?? [],
    mainCategories: data?.mainCategories ?? [],
    subCategories: data?.subCategories ?? [],
    budgetTypes: data?.budgetTypes ?? [],
    matchingRules: data?.matchingRules ?? [],
    isLoading: query.isLoading && query.fetchStatus !== 'idle',
    error: query.error ? (query.error instanceof Error ? query.error.message : '加载数据失败') : null,
    hasLoaded: query.isSuccess,
    loadData,
    clearData,
    refetchData,
    getSubCategoriesByMain,
  }), [currentUserId, data, query.isLoading, query.fetchStatus, query.error, query.isSuccess, loadData, clearData, refetchData, getSubCategoriesByMain]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

// ==================== Hook ====================

export function useAppData() {
  const context = useContext(AppDataContext);
  if (context === undefined) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
}
