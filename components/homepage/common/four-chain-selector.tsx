"use client";

import type { TransactionType } from "@/types";

import { useMemo, useEffect, useCallback, useRef } from "react";
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
  sizeClassName = "w-6 h-6 text-xs",
  className = "",
}: {
  icon: string;
  backColor?: string;
  foreColor?: string;
  sizeClassName?: string;
  className?: string;
}) => (
  <span
    className={`inline-flex shrink-0 items-center justify-center rounded-full ${sizeClassName} ${backColor || ""} ${foreColor || ""} ${className}`}
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
export type SelectFieldSize = "sm" | "md" | "lg";
export type SelectTextSize = "sm" | "md" | "lg";

export interface FourChainSelectModeOptions {
  size?: SelectFieldSize;
  textSize?: SelectTextSize;
}

const SELECT_FIELD_SIZE_STYLES: Record<
  SelectFieldSize,
  {
    container: string;
    icon: string;
    itemBase: string;
  }
> = {
  sm: {
    container: "min-w-[128px]",
    icon: "w-5 h-5 text-[11px]",
    itemBase: "min-h-unit-9 px-2 py-1.5",
  },
  md: {
    container: "min-w-[150px]",
    icon: "w-6 h-6 text-xs",
    itemBase: "min-h-unit-10 px-2.5 py-2",
  },
  lg: {
    container: "min-w-[176px]",
    icon: "w-7 h-7 text-sm",
    itemBase: "min-h-unit-11 px-3 py-2.5",
  },
};

const SELECT_TEXT_SIZE_STYLES: Record<
  SelectTextSize,
  {
    label: string;
    value: string;
    item: string;
  }
> = {
  sm: {
    label: "text-[11px]",
    value: "text-xs",
    item: "text-xs",
  },
  md: {
    label: "text-xs",
    value: "text-sm",
    item: "text-sm",
  },
  lg: {
    label: "text-sm",
    value: "text-base",
    item: "text-base",
  },
};

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
  // select 模式外观
  selectModeOptions?: FourChainSelectModeOptions;
  // 样式
  className?: string;
}

export function FourChainSelector({
  value,
  onChange,
  allowedTxTypes,
  mode = "listbox",
  selectModeOptions,
  className = "",
}: FourChainSelectorProps) {
  const { mainCategories, subCategories, budgetTypes } = useAppData();
  const resolvedSelectFieldSize = selectModeOptions?.size ?? "md";
  const resolvedSelectTextSize = selectModeOptions?.textSize ?? "md";
  const selectFieldStyles = SELECT_FIELD_SIZE_STYLES[resolvedSelectFieldSize];
  const selectTextStyles = SELECT_TEXT_SIZE_STYLES[resolvedSelectTextSize];

  const dispatch = useCallback(
    (action: FourChainAction) => {
      let nextValue = fourChainReducer(value, action);

      // 级联自动选中：按 tx → main → sub → budget 顺序依次判断
      // 1. SET_TX 后：若主类别只有一个则自动选中
      if (action.type === "SET_TX" && nextValue.txType) {
        const filteredMains = mainCategories.filter(
          (item) => item.transaction_type === nextValue.txType,
        );
        if (filteredMains.length === 1) {
          nextValue = fourChainReducer(nextValue, { type: "SET_MAIN", main: String(filteredMains[0].id) });
        }
      }

      // 2. SET_TX / SET_MAIN 后：若子类别只有一个则自动选中
      if ((action.type === "SET_TX" || action.type === "SET_MAIN") && nextValue.main_id) {
        const filteredSubs = subCategories.filter(
          (item) => item.main_category_id === Number(nextValue.main_id),
        );
        if (filteredSubs.length === 1) {
          nextValue = fourChainReducer(nextValue, { type: "SET_SUB", sub: String(filteredSubs[0].id) });
        }
      }

      // 3. SET_TX / SET_MAIN / SET_SUB 后：若子类别有关联预算且预算未设置则自动选中
      if ((action.type === "SET_TX" || action.type === "SET_MAIN" || action.type === "SET_SUB") && nextValue.sub_id && !nextValue.budget_id) {
        const matchedSub = subCategories.find((item) => item.id === Number(nextValue.sub_id));
        const budgetId = matchedSub?.budget_type_id ? String(matchedSub.budget_type_id) : undefined;
        if (budgetId) {
          nextValue = fourChainReducer(nextValue, { type: "SET_BUDGET", budget: budgetId });
        }
      }

      if (isSameFourChainState(value, nextValue)) return;
      onChange(nextValue);
    },
    [onChange, value, mainCategories, subCategories],
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

  // ListBox 模式面板（独立组件以便使用 ref + useEffect 自动滚动到选中项）
  const ListboxSelectorPanel = useCallback(
    ({
      title,
      options,
      selectedKey,
      onChangeKey,
      disabled,
    }: {
      title: string;
      options: ChainOption[];
      selectedKey: string | undefined;
      onChangeKey: (key: string | undefined) => void;
      disabled?: boolean;
    }) => {
      const scrollRef = useRef<HTMLDivElement>(null);

      useEffect(() => {
        if (!selectedKey || !scrollRef.current) return;
        const el = scrollRef.current.querySelector(`[data-key="${selectedKey}"]`);
        if (el) {
          el.scrollIntoView({ block: "nearest" });
        }
      }, [selectedKey]);

      return (
        <div className="flex-1 min-w-[165px]">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{title}</p>
          <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800 shadow-sm">
            <div ref={scrollRef} className="h-52 overflow-y-auto overscroll-contain">
              <Listbox
                aria-label={title}
                variant="flat"
                selectionMode="single"
                selectedKeys={selectedKey ? [selectedKey] : []}
                onSelectionChange={(keys) => {
                  if (disabled) return;
                  const key = Array.from(keys)[0] as string | undefined;
                  onChangeKey(key);
                }}
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
        </div>
      );
    },
    [],
  );

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
      const selectedOption = selectedKey
        ? options.find((option) => option.key === selectedKey)
        : undefined;

      return (
        <div className={`flex-1 ${selectFieldStyles.container}`}>
          <Select
            size={resolvedSelectFieldSize}
            label={title}
            placeholder={placeholder || `选择${title}`}
            selectedKeys={selectedKey ? [selectedKey] : []}
            onSelectionChange={(keys) => {
              const key = Array.from(keys)[0] as string | undefined;
              onChange(key);
            }}
            isDisabled={disabled}
            className="w-full"
            classNames={{
              label: selectTextStyles.label,
              value: selectTextStyles.value,
            }}
            listboxProps={{
              itemClasses: {
                base: selectFieldStyles.itemBase,
                title: selectTextStyles.item,
              },
            }}
            renderValue={() => {
              if (!selectedOption) return null;

              return (
                <div className="flex min-w-0 items-center gap-2">
                  {selectedOption.icon ? (
                    <IconComponent
                      icon={selectedOption.icon}
                      backColor={selectedOption.backColor}
                      foreColor={selectedOption.foreColor}
                      sizeClassName={selectFieldStyles.icon}
                    />
                  ) : null}
                  <span
                    className={`truncate font-medium ${selectTextStyles.value} ${selectedOption.foreColor || ""}`}
                  >
                    {selectedOption.label}
                  </span>
                </div>
              );
            }}
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
                      sizeClassName={selectFieldStyles.icon}
                    />
                  ) : null
                }
              >
                <span className={`font-medium ${selectTextStyles.item} ${option.foreColor || ""}`}>
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
      <ListboxSelectorPanel
        title={title}
        options={options}
        selectedKey={selectedKey}
        onChangeKey={onChange}
        disabled={disabled}
      />
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
  // select 模式外观
  selectModeOptions?: FourChainSelectModeOptions;
  // 样式
  className?: string;
}

export function TransactionEditorFourChainSelector({
  allowedTxTypes,
  mode = "listbox",
  selectModeOptions,
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
      selectModeOptions={selectModeOptions}
      className={className}
    />
  );
}
