"use client";

import { useReducer, useMemo, useEffect } from "react";
import { Listbox, ListboxItem } from "@heroui/listbox";
import { Select, SelectItem } from "@heroui/select";
import type { TransactionType, MainCategory, SubCategory, BudgetType } from "@/types";
import { TRANSACTION_TYPES } from "@/constants/transaction-type";
import { useAppData } from "@/components/context/app-data-context";

// ==================== 类型定义 ====================

// 四联选择器状态类型
export type FourChainState = {
  txType?: TransactionType;
  main?: string;
  sub?: string;
  budget?: string;
};

// 四联选择器动作类型
export type FourChainAction =
  | { type: "SET_TX"; tx: TransactionType | undefined }
  | { type: "SET_MAIN"; main: string | undefined }
  | { type: "SET_SUB"; sub: string | undefined }
  | { type: "SET_BUDGET"; budget: string | undefined }
  | { type: "RESET_CHAIN"; from: "main" | "sub" | "budget" };

// 四联选择器的完整选择结果类型
export type FourChainSelection = {
  txType: TransactionType;
  mainCategory: MainCategory;
  subCategory: SubCategory;
  budgetType?: BudgetType;
} | null;

// ==================== Reducer ====================

// 四联选择器reducer
function fourChainReducer(state: FourChainState, action: FourChainAction): FourChainState {
  switch (action.type) {
    case "SET_TX":
      return {
        txType: action.tx,
        // 清除下游选择
        main: undefined,
        sub: undefined,
        budget: undefined,
      };

    case "SET_MAIN":
      return {
        ...state,
        main: action.main,
        // 清除下游选择
        sub: undefined,
        budget: undefined,
      };

    case "SET_SUB":
      return {
        ...state,
        sub: action.sub,
        // 预算计划可以被自动设置，但用户也可以手动调整，所以不清空
      };

    case "SET_BUDGET":
      return {
        ...state,
        budget: action.budget,
      };

    case "RESET_CHAIN":
      switch (action.from) {
        case "main":
          return {
            ...state,
            main: undefined,
            sub: undefined,
            budget: undefined,
          };
        case "sub":
          return {
            ...state,
            sub: undefined,
            budget: undefined,
          };
        case "budget":
          return {
            ...state,
            budget: undefined,
          };
        default:
          return state;
      }

    default:
      return state;
  }
}

// ==================== 组件 ====================

// 图标组件
const IconComponent = ({ icon, backColor, foreColor }: { icon: string; backColor?: string; foreColor?: string }) => (
  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs mr-2 ${backColor || ''} ${foreColor || ''}`}>
    {icon}
  </span>
);

// 通用选项接口
export interface ChainOption {
  key: string;
  label: string;
  icon?: string;
  backColor?: string;
  foreColor?: string;
  textValue?: string;
}

// 选择器模式
export type SelectorMode = "listbox" | "select";

// FourChainSelector 组件属性
interface FourChainSelectorProps {
  // 数据过滤
  allowedTxTypes?: TransactionType[];
  // 显示模式
  mode?: SelectorMode;
  // 受控状态
  value?: FourChainState;
  // 回调
  onSelectionChange?: (selection: FourChainSelection) => void;
  onStateChange?: (state: FourChainState) => void;
  // 样式
  className?: string;
}

export function FourChainSelector({
  allowedTxTypes,
  mode = "listbox",
  value,
  onSelectionChange,
  onStateChange,
  className = ""
}: FourChainSelectorProps = {}) {
  const { mainCategories, subCategories, budgetTypes } = useAppData();

  // 使用 reducer 管理级联选择状态（仅在非受控模式下使用）
  const [internalState, internalDispatch] = useReducer(fourChainReducer, {});
  
  // 如果是受控组件，使用外部传入的 value，否则使用内部状态
  const state = value !== undefined ? value : internalState;
  const dispatch = value !== undefined 
    ? (action: FourChainAction) => {
        // 受控模式：计算新状态并通过回调传递给父组件
        const newState = fourChainReducer(state, action);
        onStateChange?.(newState);
      }
    : internalDispatch;

  // 交易类型选项
  const txTypeOptions = useMemo((): ChainOption[] => {
    const types = allowedTxTypes || TRANSACTION_TYPES.map(item => item.type);
    return types.map((txType) => {
      const typeOption = TRANSACTION_TYPES.find(item => item.type === txType);
      return {
        key: txType,
        label: txType,
        icon: typeOption?.icon || "🔄",
        backColor: typeOption?.back_color || "bg-gray-100 dark:bg-gray-800",
        foreColor: typeOption?.fore_color || "text-gray-800 dark:text-gray-200",
        color: typeOption?.back_color || "default",
        textValue: txType
      };
    });
  }, [allowedTxTypes]);

  // 主类别选项（按交易类型过滤）
  const mainCategoryOptions = useMemo((): ChainOption[] => {
    if (!state.txType) return [];

    return mainCategories
      .filter((item) => item.transaction_type === state.txType)
      .map((item) => ({
        key: String(item.id),
        label: item.label,
        icon: item.icon,
        backColor: item.back_color,
        foreColor: item.fore_color,
        textValue: item.label,
      }));
  }, [state.txType, mainCategories]);

  // 子类别选项（按主类别过滤）
  const subCategoryOptions = useMemo((): ChainOption[] => {
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
        textValue: item.label,
      }));
  }, [state.main, subCategories]);

  // 预算计划选项（显示所有预算计划）
  const budgetOptions = useMemo((): ChainOption[] => {
    return budgetTypes.map((item) => ({
      key: String(item.id),
      label: item.name,
      icon: item.icon || "📊",
      backColor: "bg-blue-100 dark:bg-blue-800",
      foreColor: "text-blue-800 dark:text-blue-200",
      textValue: item.name,
    }));
  }, [budgetTypes]);

  // 自动选择逻辑
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

  // 选择子类别后自动选择预算计划（仅在子类别改变时触发一次）
  useEffect(() => {
    if (!state.sub) return;

    const matchedSub = subCategories.find((item) => item.id === Number(state.sub));
    if (matchedSub?.budget_type_id) {
      const budgetId = String(matchedSub.budget_type_id);
      dispatch({ type: "SET_BUDGET", budget: budgetId });
    } else {
      // 如果子类别没有绑定预算，清空预算选择
      dispatch({ type: "SET_BUDGET", budget: undefined });
    }
  }, [state.sub, subCategories]); // 移除 state.budget 依赖，只在子类别改变时触发

  // 构建完整选择结果
  const fullSelection = useMemo((): FourChainSelection => {
    if (!state.txType || !state.main || !state.sub) return null;

    const main = mainCategories.find((item) => item.id === Number(state.main));
    const sub = subCategories.find((item) => item.id === Number(state.sub));
    const budget = state.budget ? budgetTypes.find((item) => item.id === Number(state.budget)) : undefined;

    if (!main || !sub) return null;

    return {
      txType: state.txType,
      mainCategory: main,
      subCategory: sub,
      budgetType: budget,
    };
  }, [state.txType, state.main, state.sub, state.budget, mainCategories, subCategories, budgetTypes]);

  // 向外回传选择结果
  useEffect(() => {
    onSelectionChange?.(fullSelection);
  }, [fullSelection, onSelectionChange]);

  // 处理选择变更，支持取消选择
  const handleSelectionChange = (type: "tx" | "main" | "sub" | "budget", key: string | undefined) => {
    switch (type) {
      case "tx":
        const newTx = key === state.txType ? undefined : key as TransactionType;
        dispatch({ type: "SET_TX", tx: newTx });
        break;
      case "main":
        const newMain = key === state.main ? undefined : key;
        dispatch({ type: "SET_MAIN", main: newMain });
        break;
      case "sub":
        const newSub = key === state.sub ? undefined : key;
        dispatch({ type: "SET_SUB", sub: newSub });
        break;
      case "budget":
        const newBudget = key === state.budget ? undefined : key;
        dispatch({ type: "SET_BUDGET", budget: newBudget });
        break;
    }
  };

  // 渲染选择器
  const renderSelector = (
    title: string,
    options: ChainOption[],
    selectedKey: string | undefined,
    onChange: (key: string | undefined) => void,
    disabled: boolean = false,
    placeholder?: string
  ) => {
    if (mode === "select") {
      return (
        <div className="flex-1 min-w-[150px]">
          <Select
            label={title}
            placeholder={placeholder || `选择${title}`}
            selectedKeys={selectedKey ? [selectedKey] : []}
            onSelectionChange={(keys) => {
              const key = Array.from(keys)[0] as string | undefined;
              onChange(key);
            }}
            isDisabled={disabled}
            className="w-full"
          >
            {options.map((option) => (
              <SelectItem
                key={option.key}
                textValue={option.textValue || option.label}
                startContent={option.icon ? (
                  <IconComponent
                    icon={option.icon}
                    backColor={option.backColor}
                    foreColor={option.foreColor}
                  />
                ) : null}
              >
                <span className={option.foreColor || ''}>
                  {option.label}
                </span>
              </SelectItem>
            ))}
          </Select>
        </div>
      );
    }

    // ListBox模式
    return (
      <div className="flex-1 min-w-[165px]">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{title}</p>
        <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800 shadow-sm">
          <Listbox
            aria-label={title}
            variant="flat"
            selectionMode="single"
            selectedKeys={selectedKey ? [selectedKey] : []}
            onSelectionChange={(keys) => {
              if (disabled) return;
              const key = Array.from(keys)[0] as string | undefined;
              onChange(key);
            }}
            className="h-60 overflow-y-auto"
            emptyContent={disabled ? "请先选择上级类别" : "无可用选项"}
          >
            {options.map((option) => {
              const isSelected = selectedKey === option.key;
              return (
                <ListboxItem
                  key={option.key}
                  textValue={option.textValue || option.label}
                  className={isSelected && option.backColor ? option.backColor : ""}
                  color={isSelected && option.backColor ? (option.backColor as any) : "default"}
                  startContent={
                    option.icon ? (
                      <IconComponent
                        icon={option.icon}
                        backColor={option.backColor}
                        foreColor={option.foreColor}
                      />
                    ) : null
                  }
                >
                  <span className={`font-medium ${option.foreColor || ''}`}>
                    {option.label}
                  </span>
                </ListboxItem>
              );
            })}
          </Listbox>
        </div>
      </div>
    );
  };

  return (
    <div className={`w-full space-y-4 ${className}`}>
      {/* 四联选择器 - 横向排列 */}
      <div className={`${mode === 'select' ? 'grid grid-cols-2 md:grid-cols-4' : 'flex flex-wrap'} gap-4`}>
        {/* 交易类型选择 */}
        {renderSelector(
          "交易类型",
          txTypeOptions,
          state.txType,
          (key) => handleSelectionChange("tx", key)
        )}

        {/* 主类别选择 */}
        {renderSelector(
          "主类别",
          mainCategoryOptions,
          state.main,
          (key) => handleSelectionChange("main", key),
          !state.txType,
          "请先选择交易类型"
        )}

        {/* 子类别选择 */}
        {renderSelector(
          "子类别",
          subCategoryOptions,
          state.sub,
          (key) => handleSelectionChange("sub", key),
          !state.main,
          "请先选择主类别"
        )}

        {/* 预算计划选择 */}
        {renderSelector(
          "预算计划",
          budgetOptions,
          state.budget,
          (key) => handleSelectionChange("budget", key)
        )}
      </div>

    </div>
  );
}