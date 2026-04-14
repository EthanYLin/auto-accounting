"use client";

import type { AppDataValue, BudgetType, MainCategory, SubCategory, TransactionType } from "@/types";

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { addToast } from "@heroui/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getAccounts,
  getMainCategories,
  getSubCategories,
  getBudgetTypes,
  getMatchingRules,
} from "@/app/actions/data";
import { createClient } from "@/lib/supabase/client";

// ==================== 数据获取函数 ====================

export const appDataQueryKey = ["appData"] as const;
const emptyAppData: AppDataValue = {
  accounts: [],
  mainCategories: [],
  subCategories: [],
  budgetTypes: [],
  matchingRules: [],
};

async function fetchAllAppData(): Promise<AppDataValue> {
  const [
    accountsResult,
    mainCategoriesResult,
    subCategoriesResult,
    budgetTypesResult,
    matchingRulesResult,
  ] = await Promise.all([
    getAccounts(),
    getMainCategories(),
    getSubCategories(),
    getBudgetTypes(),
    getMatchingRules(),
  ]);

  if (!accountsResult.success) throw new Error(accountsResult.error || "获取账户失败");
  if (!mainCategoriesResult.success)
    throw new Error(mainCategoriesResult.error || "获取主类别失败");
  if (!subCategoriesResult.success) throw new Error(subCategoriesResult.error || "获取子类别失败");
  if (!budgetTypesResult.success) throw new Error(budgetTypesResult.error || "获取预算计划失败");
  if (!matchingRulesResult.success)
    throw new Error(matchingRulesResult.error || "获取匹配规则失败");

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
  /** 派生数据及函数 */
  mainCategoryMap: Map<number, MainCategory>;
  subCategoryMap: Map<number, SubCategory>;
  budgetTypeMap: Map<number, BudgetType>;
  getMainCategoriesByType: (transactionType: TransactionType | "") => MainCategory[];
  getSubCategoriesByMain: (mainCategoryId: number | null | "") => SubCategory[];
}

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

// ==================== Provider ====================

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
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

  const syncUser = useCallback(
    (nextUserId: string | null) => {
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
    },
    [clearData, loadData],
  );

  useEffect(() => {
    let isActive = true;
    const supabase = createClient();

    // 订阅认证状态变化事件，仅在真正登录/登出/token 刷新时触发
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isActive) syncUser(session?.user?.id ?? null);
    });

    // 初始化：读取当前 session（读取本地缓存，无需网络往返）
    void supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!isActive) return;
      if (error) {
        addToast({
          title: "用户状态同步失败",
          description: error.message,
          color: "danger",
        });
        return;
      }
      syncUser(session?.user?.id ?? null);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [syncUser]);

  const appData = query.data ?? emptyAppData;
  const { accounts, mainCategories, subCategories, budgetTypes, matchingRules } = appData;

  const lookups = useMemo(() => {
    const mainCategoryMap = new Map(mainCategories.map((item) => [item.id, item]));
    const subCategoryMap = new Map(subCategories.map((item) => [item.id, item]));
    const budgetTypeMap = new Map(budgetTypes.map((item) => [item.id, item]));

    const mainCategoriesByType = new Map<TransactionType, MainCategory[]>();

    for (const item of mainCategories) {
      const group = mainCategoriesByType.get(item.transaction_type) ?? [];

      group.push(item);
      mainCategoriesByType.set(item.transaction_type, group);
    }

    const subCategoriesByMain = new Map<number, SubCategory[]>();

    for (const item of subCategories) {
      const group = subCategoriesByMain.get(item.main_category_id) ?? [];

      group.push(item);
      subCategoriesByMain.set(item.main_category_id, group);
    }

    return {
      mainCategoryMap,
      subCategoryMap,
      budgetTypeMap,
      getMainCategoriesByType(transactionType: TransactionType | "") {
        if (!transactionType) return [];

        return mainCategoriesByType.get(transactionType) ?? [];
      },
      getSubCategoriesByMain(mainCategoryId: number | null | "") {
        if (!mainCategoryId) return [];

        return subCategoriesByMain.get(mainCategoryId) ?? [];
      },
    };
  }, [budgetTypes, mainCategories, subCategories]);

  const value: AppDataContextValue = useMemo(
    () => ({
      currentUserId,
      accounts,
      mainCategories,
      subCategories,
      budgetTypes,
      matchingRules,
      isLoading: query.isLoading && query.fetchStatus !== "idle",
      error: query.error
        ? query.error instanceof Error
          ? query.error.message
          : "加载数据失败"
        : null,
      hasLoaded: query.isSuccess,
      loadData,
      clearData,
      refetchData,
      ...lookups,
    }),
    [
      accounts,
      budgetTypes,
      clearData,
      currentUserId,
      loadData,
      lookups,
      mainCategories,
      matchingRules,
      query.error,
      query.fetchStatus,
      query.isLoading,
      query.isSuccess,
      refetchData,
      subCategories,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

// ==================== Hook ====================

export function useAppData() {
  const context = useContext(AppDataContext);

  if (context === undefined) {
    throw new Error("useAppData must be used within an AppDataProvider");
  }

  return context;
}
