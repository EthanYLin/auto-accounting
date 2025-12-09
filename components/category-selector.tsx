"use client";

import { useReducer, useMemo, useEffect } from "react";
import { GenericListbox, type GenericOption } from "@/components/generic-listbox";
import { 
  categoryReducer,
  type CategoryState,
} from "@/types/category";
import type { TransactionType } from "@/types";
import { TRANSACTION_TYPES } from "@/constants/transaction";

// 类别选择器组件
interface CategorySelectorProps {
  onTxTypeChange?: (txType: TransactionType | undefined) => void;
}

export function CategorySelector({ onTxTypeChange }: CategorySelectorProps = {}) {
  // 使用 useReducer 管理级联选择状态
  const [state, dispatch] = useReducer(categoryReducer, {});

  // 自动选择逻辑 - 组件初始化时执行一次
  useEffect(() => {
    dispatch({ type: "AUTO" });
  }, []);

  // 当 TxType 改变时通知父组件
  useEffect(() => {
    onTxTypeChange?.(state.txType);
  }, [state.txType, onTxTypeChange]);

  // TODO: 从数据库获取交易类型选项
  const txTypeOptions = useMemo((): GenericOption[] => {
    return TRANSACTION_TYPES.map((txType) => ({
      key: txType,
      label: txType,
      icon: txType === "支出" ? "💸" : txType === "收入" ? "💰" : "🔄",
      backColor: "bg-gray-100 dark:bg-gray-800",
      foreColor: "text-gray-800 dark:text-gray-200",
      textValue: txType
    }));
  }, []);

  // TODO: 从数据库获取主类别选项
  const mainCategoryOptions = useMemo((): GenericOption[] => {
    if (!state.txType) return [];
    // TODO: 调用 API 获取指定交易类型的主类别
    return [];
  }, [state.txType]);

  // TODO: 从数据库获取子类别选项
  const subCategoryOptions = useMemo((): GenericOption[] => {
    if (!state.txType || !state.main) return [];
    // TODO: 调用 API 获取指定主类别的子类别
    return [];
  }, [state.txType, state.main]);

  // TODO: 获取完整选择信息
  const fullSelection = useMemo(() => {
    if (!state.txType || !state.main || !state.sub) return null;
    // TODO: 返回完整的分类信息
    return {
      typeLabel: state.txType,
      mainLabel: state.main,
      subLabel: state.sub,
      foreColor: "text-gray-800 dark:text-gray-200",
      backColor: "bg-gray-100 dark:bg-gray-800",
      budget: state.budget ?? null
    };
  }, [state.txType, state.main, state.sub, state.budget]);

  return (
    <div className="w-full space-y-4">
      {/* 交易类型选择 */}
      <GenericListbox
        title="交易类型"
        options={txTypeOptions}
        selectedKey={state.txType}
        onSelectionChange={(key) => {
          if (key) {
            dispatch({ type: "SET_TX", tx: key as TransactionType });
          }
        }}
      />

      {/* 主类别选择 */}
      {state.txType && (
        <GenericListbox
          title="主类别"
          options={mainCategoryOptions}
          selectedKey={state.main}
          onSelectionChange={(key) => {
            if (key) {
              dispatch({ type: "SET_MAIN", main: key as string });
            }
          }}
        />
      )}

      {/* 子类别选择 */}
      {state.txType && state.main && (
        <GenericListbox
          title="子类别"
          options={subCategoryOptions}
          selectedKey={state.sub}
          onSelectionChange={(key) => {
            if (key) {
              dispatch({ type: "SET_SUB", sub: key as string });
            }
          }}
        />
      )}

      {/* 显示完整选择结果 */}
      {fullSelection && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p className="text-sm font-semibold">已选择：</p>
          <p className="text-sm mt-1">
            {fullSelection.typeLabel} → {fullSelection.mainLabel} → {fullSelection.subLabel}
          </p>
          {fullSelection.budget && (
            <p className="text-sm mt-1 text-gray-600 dark:text-gray-400">
              预算类型：{fullSelection.budget}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
