"use client";

import { useReducer, useMemo, useEffect } from "react";
import { GenericListbox, type GenericOption } from "@/components/generic-listbox";
import { 
  CATEGORY_TREE, 
  getMainCategories, 
  getSpecificSubCategory, 
  getSubCategories, 
  type TxType, 
  type MainCategory, 
  type SubCategory,
  categoryReducer
} from "@/types/category";
import { BudgetType } from "@/types/budget-type";

// 类别选择器组件
interface CategorySelectorProps {
  onTxTypeChange?: (txType: TxType | undefined) => void;
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

  // 使用 useMemo 优化选项列表计算
  const txTypeOptions = useMemo((): GenericOption[] => {
    const txTypes = Object.keys(CATEGORY_TREE) as TxType[];
    return txTypes.map((txType) => {
      const txTypeConfig = CATEGORY_TREE[txType];
      return {
        key: txType,
        label: txTypeConfig.label,
        icon: txTypeConfig.icon,
        backColor: txTypeConfig.backColor,
        foreColor: txTypeConfig.foreColor,
        textValue: txTypeConfig.label
      };
    });
  }, []);

  const mainCategoryOptions = useMemo((): GenericOption[] => {
    if (!state.txType) return [];
    
    const mainCategories = getMainCategories(state.txType);
    return mainCategories.map((mainCat) => {
      const mainCatStr = mainCat as string;
      const mainConfig = (CATEGORY_TREE[state.txType!].mains as Record<string, any>)[mainCatStr];
      return {
        key: mainCatStr,
        label: mainConfig.label,
        icon: mainConfig.icon,
        backColor: mainConfig.backColor,
        foreColor: mainConfig.foreColor,
        textValue: mainConfig.label
      };
    });
  }, [state.txType]);

  const subCategoryOptions = useMemo((): GenericOption[] => {
    if (!state.txType || !state.main) return [];
    
    const subCategories = getSubCategories(
      state.txType, 
      state.main as MainCategory<typeof state.txType>
    );
    return subCategories.map((subCat) => {
      const subCatStr = subCat as string;
      const subConfig = (CATEGORY_TREE[state.txType!].mains as Record<string, any>)[state.main!].subs[subCatStr];
      return {
        key: subCatStr,
        label: subConfig.label,
        icon: subConfig.icon,
        backColor: subConfig.backColor,
        foreColor: subConfig.foreColor,
        textValue: subConfig.label
      };
    });
  }, [state.txType, state.main]);

  const fullSelection = useMemo(() => {
    if (!state.txType || !state.main || !state.sub) return null;
    
    return getSpecificSubCategory(
      state.txType,
      state.main as MainCategory<typeof state.txType>,
      state.sub as SubCategory<typeof state.txType, MainCategory<typeof state.txType>>
    );
  }, [state.txType, state.main, state.sub]);

  const budgetOptionsFormatted = useMemo((): GenericOption[] => {
    const budgetOptions = Object.values(BudgetType);
    return budgetOptions.map((budget) => ({
      key: budget,
      label: budget,
      icon: "📊",
      backColor: fullSelection ? fullSelection.backColor : "bg-gray-200 dark:bg-gray-700",
      foreColor: "text-gray-700 dark:text-gray-300",
      textValue: budget
    }));
  }, [fullSelection]);

  return (
    <div className="w-full">
      <div className="grid grid-cols-4 gap-4">
        {/* 记录类型选择 */}
        <GenericListbox
          title="记录类型"
          options={txTypeOptions}
          selectedKey={state.txType}
          onSelectionChange={(key: TxType) => {
            dispatch({ type: "SET_TX", tx: key });
          }}
          className="w-full"
          ariaLabel="选择记录类型"
        />

        {/* 主类别选择 */}
        <GenericListbox
          title="主类别"
          options={mainCategoryOptions}
          selectedKey={state.main}
          onSelectionChange={(key: string) => {
            dispatch({ type: "SET_MAIN", main: key });
          }}
          disabled={!state.txType}
          className="w-full"
          ariaLabel="选择主类别"
        />

        {/* 子类别选择 */}
        <GenericListbox
          title="子类别"
          options={subCategoryOptions}
          selectedKey={state.sub}
          onSelectionChange={(key: string) => {
            dispatch({ type: "SET_SUB", sub: key });
          }}
          disabled={!state.main}
          className="w-full"
          ariaLabel="选择子类别"
        />

        {/* 预算计划选择 */}
        <GenericListbox
          title="预算计划"
          options={budgetOptionsFormatted}
          selectedKey={state.budget}
          onSelectionChange={(key: BudgetType) => {
            dispatch({ type: "SET_BUDGET", budget: key });
          }}
          className="w-full"
          ariaLabel="选择预算计划"
        />
      </div>

      {/* 显示选择结果 */}
      {fullSelection && (
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mt-6">
          <h3 className="font-semibold mb-2 dark:text-white">选择结果：</h3>
          <div className="space-y-1 text-sm dark:text-gray-300">
            <p><strong>记录类型:</strong> {fullSelection.typeLabel} ({state.txType})</p>
            <p><strong>主类别:</strong> {fullSelection.mainLabel} ({state.main})</p>
            <p><strong>子类别:</strong> {fullSelection.subLabel} ({state.sub})</p>
            <p><strong>默认预算:</strong> {fullSelection.budget || '无预算消耗'}</p>
            <p><strong>实际预算:</strong> {state.budget || '未选择'} 
              {state.budget && state.budget !== fullSelection.budget && 
                <span className="text-orange-600 dark:text-orange-400 ml-1">(自定义)</span>
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
