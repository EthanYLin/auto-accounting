"use client";

import type { TransactionType } from "@/types";

import { useMemo, useEffect, useCallback } from "react";
import { Listbox, ListboxItem } from "@heroui/react";
import { Select, SelectItem } from "@heroui/react";

import { TRANSACTION_TYPES } from "@/constants/transaction-type";
import { useAppData } from "@/components/context/app-data-context";
import { useTransactionEditor } from "@/components/context/transaction-editor-context";

// ==================== 类型定义 ====================

// 四联选择器状态类型
export type FourChainState = {
  txType?: TransactionType;
  main_id?: string;
  sub_id?: string;
  budget_id?: string;
};

// 四联选择器动作类型
export type FourChainAction =
  | { type: "SET_TX"; tx: TransactionType | undefined }
  | { type: "SET_MAIN"; main: string | undefined }
  | { type: "SET_SUB"; sub: string | undefined }
  | { type: "SET_BUDGET"; budget: string | undefined };

function isSameFourChainState(a: FourChainState, b: FourChainState): boolean {
  return (
    a.txType === b.txType &&
    a.main_id === b.main_id &&
    a.sub_id === b.sub_id &&
    a.budget_id === b.budget_id
  );
}

// ==================== Reducer ====================

// 四联选择器reducer
function fourChainReducer(state: FourChainState, action: FourChainAction): FourChainState {
  switch (action.type) {
    case "SET_TX":
      return {
        txType: action.tx,
        // 清除下游选择
        main_id: undefined,
        sub_id: undefined,
        budget_id: undefined,
      };

    case "SET_MAIN":
      return {
        ...state,
        main_id: action.main,
        // 清除下游选择
        sub_id: undefined,
        budget_id: undefined,
      };

    case "SET_SUB":
      return {
        ...state,
        sub_id: action.sub,
        // 预算计划可以被自动设置，但用户也可以手动调整，所以不清空
      };

    case "SET_BUDGET":
      return {
        ...state,
        budget_id: action.budget,
      };

    default:
      return state;
  }
}

// ==================== 组件 ====================

// 图标组件
const IconComponent = ({
  icon,
  backColor,
  foreColor,
}: {
  icon: string;
  backColor?: string;
  foreColor?: string;
}) => (
  <span
    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs mr-2 ${backColor || ""} ${foreColor || ""}`}
  >
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
  // 受控状态
  value: FourChainState;
  // 状态变更回调
  onChange: (state: FourChainState) => void;
  // 数据过滤
  allowedTxTypes?: TransactionType[];
  // 显示模式
  mode?: SelectorMode;
  // 样式
  className?: string;
}

export function FourChainSelector({
  value,
  onChange,
  allowedTxTypes,
  mode = "listbox",
  className = "",
}: FourChainSelectorProps) {
  const { mainCategories, subCategories, budgetTypes } = useAppData();

  const dispatch = useCallback(
    (action: FourChainAction) => {
      const nextValue = fourChainReducer(value, action);
      if (isSameFourChainState(value, nextValue)) return;
      onChange(nextValue);
    },
    [onChange, value],
  );

  // 交易类型选项
  const txTypeOptions = useMemo((): ChainOption[] => {
    const types = allowedTxTypes || TRANSACTION_TYPES.map((item) => item.type);
    return types.map((txType) => {
      const typeOption = TRANSACTION_TYPES.find((item) => item.type === txType);
      return {
        key: txType,
        label: txType,
        icon: typeOption?.icon || "🔄",
        backColor: typeOption?.back_color || "bg-gray-100 dark:bg-gray-800",
        foreColor: typeOption?.fore_color || "text-gray-800 dark:text-gray-200",
        textValue: txType,
      };
    });
  }, [allowedTxTypes]);

  // 主类别选项（按交易类型过滤）
  const mainCategoryOptions = useMemo((): ChainOption[] => {
    if (!value.txType) return [];

    return mainCategories
      .filter((item) => item.transaction_type === value.txType)
      .map((item) => ({
        key: String(item.id),
        label: item.label,
        icon: item.icon,
        backColor: item.back_color,
        foreColor: item.fore_color,
        textValue: item.label,
      }));
  }, [value.txType, mainCategories]);

  // 子类别选项（按主类别过滤）
  const subCategoryOptions = useMemo((): ChainOption[] => {
    if (!value.main_id) return [];

    const mainId = Number(value.main_id);
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
  }, [value.main_id, subCategories]);

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
    if (value.txType && !value.main_id && mainCategoryOptions.length === 1) {
      dispatch({ type: "SET_MAIN", main: mainCategoryOptions[0].key });
    }
  }, [dispatch, value.txType, value.main_id, mainCategoryOptions]);

  useEffect(() => {
    if (value.main_id && !value.sub_id && subCategoryOptions.length === 1) {
      dispatch({ type: "SET_SUB", sub: subCategoryOptions[0].key });
    }
  }, [dispatch, value.main_id, value.sub_id, subCategoryOptions]);

  // 选择子类别后自动选择预算计划（仅在子类别改变且预算未设置时触发）
  useEffect(() => {
    if (!value.sub_id) return;
    // 如果预算计划已经设置，不覆盖
    if (value.budget_id) return;

    const matchedSub = subCategories.find((item) => item.id === Number(value.sub_id));
    const budgetId = matchedSub?.budget_type_id ? String(matchedSub.budget_type_id) : undefined;

    if (budgetId !== value.budget_id) {
      dispatch({ type: "SET_BUDGET", budget: budgetId });
    }
  }, [dispatch, value.sub_id, value.budget_id, subCategories]);

  // 处理选择变更，支持取消选择
  const handleSelectionChange = (
    type: "tx" | "main" | "sub" | "budget",
    key: string | undefined,
  ) => {
    switch (type) {
      case "tx":
        const newTx = key === value.txType ? undefined : (key as TransactionType);
        dispatch({ type: "SET_TX", tx: newTx });
        break;
      case "main":
        const newMain = key === value.main_id ? undefined : key;
        dispatch({ type: "SET_MAIN", main: newMain });
        break;
      case "sub":
        const newSub = key === value.sub_id ? undefined : key;
        dispatch({ type: "SET_SUB", sub: newSub });
        break;
      case "budget":
        const newBudget = key === value.budget_id ? undefined : key;
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
    placeholder?: string,
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
                <span className={option.foreColor || ""}>{option.label}</span>
              </SelectItem>
            ))}
          </Select>
        </div>
      );
    }

    // ListBox模式
    return (
      <div className="flex-1 min-w-[165px]">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{title}</p>
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
            className="h-52 overflow-y-auto"
            emptyContent={disabled ? "请先选择上级类别" : "无可用选项"}
            itemClasses={{
              base: "py-1.5 px-2 min-h-unit-9",
              title: "text-sm",
            }}
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
                  <span className={`font-medium ${option.foreColor || ""}`}>{option.label}</span>
                </ListboxItem>
              );
            })}
          </Listbox>
        </div>
      </div>
    );
  };

  return (
    <div className={`w-full space-y-3 ${className}`}>
      {/* 四联选择器 - 横向排列 */}
      <div
        className={`${mode === "select" ? "grid grid-cols-2 md:grid-cols-4" : "flex flex-wrap"} gap-3`}
      >
        {/* 交易类型选择 */}
        {renderSelector("交易类型", txTypeOptions, value.txType, (key) =>
          handleSelectionChange("tx", key),
        )}

        {/* 主类别选择 */}
        {renderSelector(
          "主类别",
          mainCategoryOptions,
          value.main_id,
          (key) => handleSelectionChange("main", key),
          !value.txType,
          "请先选择交易类型",
        )}

        {/* 子类别选择 */}
        {renderSelector(
          "子类别",
          subCategoryOptions,
          value.sub_id,
          (key) => handleSelectionChange("sub", key),
          !value.main_id,
          "请先选择主类别",
        )}

        {/* 预算计划选择 */}
        {renderSelector("预算计划", budgetOptions, value.budget_id, (key) =>
          handleSelectionChange("budget", key),
        )}
      </div>
    </div>
  );
}

// TransactionEditorFourChainSelector 组件：绑定当前交易编辑器状态的四联选择器
export interface TransactionEditorFourChainSelectorProps {
  // 数据过滤
  allowedTxTypes?: TransactionType[];
  // 显示模式
  mode?: SelectorMode;
  // 样式
  className?: string;
}

export function TransactionEditorFourChainSelector({
  allowedTxTypes,
  mode = "listbox",
  className = "",
}: TransactionEditorFourChainSelectorProps) {
  const { currentTransaction, updateFields } = useTransactionEditor();

  const value = useMemo(
    () => ({
      txType: currentTransaction?.transaction_type as TransactionType | undefined,
      main_id: currentTransaction?.main_category
        ? String(currentTransaction.main_category.id)
        : undefined,
      sub_id: currentTransaction?.sub_category
        ? String(currentTransaction.sub_category.id)
        : undefined,
      budget_id: currentTransaction?.budget_type
        ? String(currentTransaction.budget_type.id)
        : undefined,
    }),
    [
      currentTransaction?.transaction_type,
      currentTransaction?.main_category?.id,
      currentTransaction?.sub_category?.id,
      currentTransaction?.budget_type?.id,
    ],
  );

  const handleChange = useCallback(
    (nextValue: FourChainState) => {
      updateFields({
        transaction_type: nextValue.txType || "",
        main_category: nextValue.main_id,
        sub_category: nextValue.sub_id,
        budget_type: nextValue.budget_id,
      });
    },
    [updateFields],
  );

  return (
    <FourChainSelector
      value={value}
      onChange={handleChange}
      allowedTxTypes={allowedTxTypes}
      mode={mode}
      className={className}
    />
  );
}
