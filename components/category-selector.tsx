"use client";

import { useReducer, useMemo, useEffect } from "react";
import { GenericListbox, type GenericOption } from "@/components/generic-listbox";
import { categoryReducer } from "@/types/category";
import type { TransactionType } from "@/types";
import { TRANSACTION_TYPES } from "@/constants/transaction-type";
import { useAppData } from "@/contexts/app-data-context";

// 类别选择器组件
interface CategorySelectorProps {
  onTxTypeChange?: (txType: TransactionType | undefined) => void;
}

export function CategorySelector({ onTxTypeChange }: CategorySelectorProps = {}) {
  const { mainCategories, subCategories, budgetTypes } = useAppData();

  // 使用 useReducer 管理级联选择状态
  const [state, dispatch] = useReducer(categoryReducer, {});

  // 自动选择交易类型（初始化时挑选第一个可用枚举）
  useEffect(() => {
    if (!state.txType && TRANSACTION_TYPES.length > 0) {
      dispatch({ type: "SET_TX", tx: TRANSACTION_TYPES[0].type });
    }
  }, [state.txType]);

  // 当 TxType 改变时通知父组件
  useEffect(() => {
    onTxTypeChange?.(state.txType);
  }, [state.txType, onTxTypeChange]);

  // 交易类型选项
  const txTypeOptions = useMemo((): GenericOption[] => {
    return TRANSACTION_TYPES.map((txTypeOption) => ({
      key: txTypeOption.type,
      label: txTypeOption.type,
      icon: txTypeOption.icon,
      backColor: "bg-gray-100 dark:bg-gray-800",
      foreColor: "text-gray-800 dark:text-gray-200",
      textValue: txTypeOption.type
    }));
  }, []);

  // 主类别选项（按交易类型过滤）
  const mainCategoryOptions = useMemo((): GenericOption[] => {
    if (!state.txType) return [];

    return mainCategories
      .filter((item) => item.transaction_type === state.txType)
      .map((item) => ({
        key: String(item.id),
        label: item.label,
        icon: item.icon,
        backColor: item.back_color,
        foreColor: item.fore_color,
        textValue: `${item.label}-${item.id}`,
      }));
  }, [state.txType, mainCategories]);

  // 子类别选项（按主类别过滤）
  const subCategoryOptions = useMemo((): GenericOption[] => {
    if (!state.main) return [];

    const mainId = Number(state.main);
    return subCategories
      .filter((item) => item.main_category_id === mainId)
      .map((item) => ({
        key: String(item.id),
        label: item.label,
        icon: item.icon,
        backColor: item.back_color,
        foreColor: item.fore_color,
        textValue: `${item.label}-${item.id}`,
      }));
  }, [state.main, subCategories]);

  // 当只有一个主类别或子类别时自动选择
  useEffect(() => {
    if (state.txType && !state.main && mainCategoryOptions.length === 1) {
      dispatch({ type: "SET_MAIN", main: mainCategoryOptions[0].key });
    }
  }, [state.txType, state.main, mainCategoryOptions]);

  useEffect(() => {
    if (state.main && !state.sub && subCategoryOptions.length === 1) {
      dispatch({ type: "SET_SUB", sub: subCategoryOptions[0].key });
    }
  }, [state.main, state.sub, subCategoryOptions]);

  // 选择子类别后同步预算类型
  useEffect(() => {
    if (!state.sub) {
      if (state.budget) {
        dispatch({ type: "SET_BUDGET", budget: undefined });
      }
      return;
    }

    const matchedSub = subCategories.find((item) => item.id === Number(state.sub));
    const budgetId = matchedSub?.budget_type_id ? String(matchedSub.budget_type_id) : undefined;

    if (budgetId !== state.budget) {
      dispatch({ type: "SET_BUDGET", budget: budgetId });
    }
  }, [state.sub, state.budget, subCategories]);

  // 获取完整选择信息
  const fullSelection = useMemo(() => {
    if (!state.txType || !state.main || !state.sub) return null;

    const main = mainCategories.find((item) => item.id === Number(state.main));
    const sub = subCategories.find((item) => item.id === Number(state.sub));

    if (!main || !sub) return null;

    const budgetType = sub.budget_type_id
      ? budgetTypes.find((item) => item.id === sub.budget_type_id)
      : undefined;

    return {
      typeLabel: state.txType,
      mainLabel: main.label,
      subLabel: sub.label,
      foreColor: sub.fore_color || main.fore_color,
      backColor: sub.back_color || main.back_color,
      budget: budgetType?.name,
    };
  }, [state.txType, state.main, state.sub, mainCategories, subCategories, budgetTypes, state.budget]);

  return (
    <div className="w-full space-y-4">
      {/* 类别选择器 - 横向排列 */}
      <div className="flex flex-wrap gap-4">
        {/* 交易类型选择 */}
        <div className="flex-1 min-w-[200px]">
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
        </div>

        {/* 主类别选择 */}
        {state.txType && (
          <div className="flex-1 min-w-[200px]">
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
          </div>
        )}

        {/* 子类别选择 */}
        {state.txType && state.main && (
          <div className="flex-1 min-w-[200px]">
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
          </div>
        )}
      </div>

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
