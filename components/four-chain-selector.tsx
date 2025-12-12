"use client";

import { useReducer, useMemo, useEffect } from "react";
import { Listbox, ListboxItem } from "@heroui/listbox";
import { Select, SelectItem } from "@heroui/select";
import { fourChainReducer, type FourChainState, type FourChainSelection } from "@/types/four-chain-selector";
import type { TransactionType } from "@/types";
import { TRANSACTION_TYPES } from "@/constants/transaction";
import { useAppData } from "@/contexts/app-data-context";

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
  // 回调
  onSelectionChange?: (selection: FourChainSelection) => void;
  // 样式
  className?: string;
}

export function FourChainSelector({
  allowedTxTypes,
  mode = "listbox",
  onSelectionChange,
  className = ""
}: FourChainSelectorProps = {}) {
  const { mainCategories, subCategories, budgetTypes } = useAppData();

  // 使用 reducer 管理级联选择状态
  const [state, dispatch] = useReducer(fourChainReducer, {});

  // 交易类型选项
  const txTypeOptions = useMemo((): ChainOption[] => {
    const types = allowedTxTypes || TRANSACTION_TYPES;
    return types.map((txType) => ({
      key: txType,
      label: txType,
      icon: txType === "支出" ? "💸" : txType === "收入" ? "💰" : "🔄",
      backColor: "bg-gray-100 dark:bg-gray-800",
      foreColor: "text-gray-800 dark:text-gray-200",
      textValue: txType
    }));
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
        textValue: `${item.label}-${item.id}`,
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
        textValue: `${item.label}-${item.id}`,
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

  // 选择子类别后自动选择预算计划
  useEffect(() => {
    if (!state.sub) return;

    const matchedSub = subCategories.find((item) => item.id === Number(state.sub));
    if (matchedSub?.budget_type_id) {
      const budgetId = String(matchedSub.budget_type_id);
      if (budgetId !== state.budget) {
        dispatch({ type: "SET_BUDGET", budget: budgetId });
      }
    }
  }, [state.sub, state.budget, subCategories]);

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
        <div className="flex-1 min-w-[200px]">
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
      <div className="flex-1 min-w-[200px]">
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
      <div className={`flex ${mode === 'select' ? 'flex-col' : 'flex-wrap'} gap-4`}>
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

      {/* 显示完整选择结果 */}
      {fullSelection && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p className="text-sm font-semibold">已选择：</p>
          <p className="text-sm mt-1">
            {fullSelection.txType} → {fullSelection.mainCategory.label} → {fullSelection.subCategory.label}
          </p>
          {fullSelection.budgetType && (
            <p className="text-sm mt-1 text-gray-600 dark:text-gray-400">
              预算计划：{fullSelection.budgetType.name}
            </p>
          )}
        </div>
      )}
    </div>
  );
}