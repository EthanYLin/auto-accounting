"use client";

import type { TransactionType } from "@/types";

import { useMemo, useEffect, useCallback, useRef } from "react";
import { Listbox, ListboxItem, Select, SelectItem } from "@heroui/react";
import { useTheme } from "next-themes";

import { TRANSACTION_TYPES } from "@/constants/transaction-type";
import { useAppData } from "@/components/context/app-data-context";
import { useTransactionEditor } from "@/components/context/transaction-editor-context";

// ── Types ──────────────────────────────────────────────────────────────────

export type FourChainState = {
  txType?: TransactionType;
  main_id?: string;
  sub_id?: string;
  budget_id?: string;
};

export type FourChainAction =
  | { type: "SET_TX"; tx: TransactionType | undefined }
  | { type: "SET_MAIN"; main: string | undefined }
  | { type: "SET_SUB"; sub: string | undefined }
  | { type: "SET_BUDGET"; budget: string | undefined };

export interface ChainOption {
  key: string;
  label: string;
  icon?: string;
  backColor?: string;
  foreColor?: string;
  textValue?: string;
}

export type SelectorMode = "listbox" | "select";
export type SelectFieldSize = "sm" | "md" | "lg";
export type SelectTextSize = "sm" | "md" | "lg";

export interface FourChainSelectModeOptions {
  size?: SelectFieldSize;
  textSize?: SelectTextSize;
}

// ── Constants & pure utils ─────────────────────────────────────────────────

const SELECT_FIELD_SIZE_STYLES: Record<
  SelectFieldSize,
  { container: string; icon: string; itemBase: string }
> = {
  sm: {
    container: "min-w-[118px]",
    icon: "w-5 h-5 text-[11px]",
    itemBase: "min-h-unit-9 px-2 py-1.5",
  },
  md: {
    container: "min-w-[140px]",
    icon: "w-6 h-6 text-xs",
    itemBase: "min-h-unit-10 px-2.5 py-2",
  },
  lg: {
    container: "min-w-[176px]",
    icon: "w-7 h-7 text-sm",
    itemBase: "min-h-unit-11 px-3 py-2.5",
  },
};

const SELECT_GRID_MIN_WIDTHS: Record<SelectFieldSize, string> = {
  sm: "118px",
  md: "140px",
  lg: "176px",
};

const SELECT_TEXT_SIZE_STYLES: Record<
  SelectTextSize,
  { label: string; value: string; item: string }
> = {
  sm: {
    label: "text-[11px] !text-gray-500 dark:!text-zinc-500 !font-light",
    value: "text-xs",
    item: "text-xs",
  },
  md: {
    label: "text-xs !text-gray-500 dark:!text-zinc-500 !font-light",
    value: "text-sm",
    item: "text-sm",
  },
  lg: {
    label: "text-sm !text-gray-500 dark:!text-zinc-500 !font-light",
    value: "text-base",
    item: "text-base",
  },
};

function isSameFourChainState(a: FourChainState, b: FourChainState): boolean {
  return (
    a.txType === b.txType &&
    a.main_id === b.main_id &&
    a.sub_id === b.sub_id &&
    a.budget_id === b.budget_id
  );
}

function fourChainReducer(state: FourChainState, action: FourChainAction): FourChainState {
  switch (action.type) {
    case "SET_TX":
      return { txType: action.tx, main_id: undefined, sub_id: undefined, budget_id: undefined };
    case "SET_MAIN":
      return { ...state, main_id: action.main, sub_id: undefined, budget_id: undefined };
    case "SET_SUB":
      return { ...state, sub_id: action.sub };
    case "SET_BUDGET":
      return { ...state, budget_id: action.budget };
    default:
      return state;
  }
}

// ── Internal components ────────────────────────────────────────────────────

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

/** ListBox 模式面板：选中项自动滚动到可视区域 */
function ListboxDisplayMode({
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
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedKey || !scrollRef.current) return;
    scrollRef.current
      .querySelector(`[data-key="${selectedKey}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selectedKey]);

  return (
    <div className="flex-1 min-w-[150px]">
      <p className="text-xs text-gray-500 dark:text-zinc-500 mb-2">{title}</p>
      <div className="border border-gray-200 dark:border-white/[0.08] rounded-lg p-2 bg-white dark:bg-[#222222] shadow-sm dark:shadow-none">
        <div ref={scrollRef} className="h-52 overflow-y-auto overscroll-contain">
          <Listbox
            aria-label={title}
            variant="flat"
            selectionMode="single"
            selectedKeys={selectedKey ? [selectedKey] : []}
            onSelectionChange={(keys) => {
              if (disabled) return;
              onChangeKey(Array.from(keys)[0] as string | undefined);
            }}
            emptyContent={disabled ? "请先选择上级类别" : "无可用选项"}
            itemClasses={{ base: "py-1.5 px-2 min-h-unit-9", title: "text-sm" }}
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
}

/** Select 模式面板：下拉选择器 */
function SelectDisplayMode({
  title,
  options,
  selectedKey,
  onChange,
  disabled = false,
  placeholder,
  selectFieldStyles,
  selectTextStyles,
  resolvedSelectFieldSize,
}: {
  title: string;
  options: ChainOption[];
  selectedKey: string | undefined;
  onChange: (key: string | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
  selectFieldStyles: (typeof SELECT_FIELD_SIZE_STYLES)[SelectFieldSize];
  selectTextStyles: (typeof SELECT_TEXT_SIZE_STYLES)[SelectTextSize];
  resolvedSelectFieldSize: SelectFieldSize;
}) {
  const selectedOption = selectedKey ? options.find((o) => o.key === selectedKey) : undefined;
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className={`flex-1 ${selectFieldStyles.container}`}>
      <Select
        size={resolvedSelectFieldSize}
        label={title}
        variant={isDark ? "bordered" : "underlined"}
        labelPlacement="outside"
        placeholder={placeholder || `选择${title}`}
        selectedKeys={selectedKey ? [selectedKey] : []}
        onSelectionChange={(keys) => onChange(Array.from(keys)[0] as string | undefined)}
        isDisabled={disabled}
        className="w-full"
        classNames={{ label: selectTextStyles.label, value: selectTextStyles.value }}
        listboxProps={{
          itemClasses: { base: selectFieldStyles.itemBase, title: selectTextStyles.item },
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

// ── Exported components ────────────────────────────────────────────────────

export function FourChainSelector({
  value,
  onChange,
  allowedTxTypes,
  mode = "listbox",
  selectModeOptions,
  className = "",
}: {
  value: FourChainState;
  onChange: (state: FourChainState) => void;
  allowedTxTypes?: TransactionType[];
  mode?: SelectorMode;
  selectModeOptions?: FourChainSelectModeOptions;
  className?: string;
}) {
  const { mainCategories, subCategories, budgetTypes } = useAppData();
  const resolvedSelectFieldSize = selectModeOptions?.size ?? "md";
  const resolvedSelectTextSize = selectModeOptions?.textSize ?? "md";
  const selectFieldStyles = SELECT_FIELD_SIZE_STYLES[resolvedSelectFieldSize];
  const selectTextStyles = SELECT_TEXT_SIZE_STYLES[resolvedSelectTextSize];

  const dispatch = useCallback(
    (action: FourChainAction) => {
      let next = fourChainReducer(value, action);

      // 级联自动选中：SET_TX 后若主类别唯一则自动选中
      if (action.type === "SET_TX" && next.txType) {
        const mains = mainCategories.filter((i) => i.transaction_type === next.txType);
        if (mains.length === 1)
          next = fourChainReducer(next, { type: "SET_MAIN", main: String(mains[0].id) });
      }

      // SET_TX / SET_MAIN 后若子类别唯一则自动选中
      if ((action.type === "SET_TX" || action.type === "SET_MAIN") && next.main_id) {
        const subs = subCategories.filter((i) => i.main_category_id === Number(next.main_id));
        if (subs.length === 1)
          next = fourChainReducer(next, { type: "SET_SUB", sub: String(subs[0].id) });
      }

      // SET_TX / SET_MAIN / SET_SUB 后若子类别有关联预算且预算未设置则自动选中
      if (
        (action.type === "SET_TX" || action.type === "SET_MAIN" || action.type === "SET_SUB") &&
        next.sub_id &&
        !next.budget_id
      ) {
        const budgetId = subCategories.find((i) => i.id === Number(next.sub_id))?.budget_type_id;
        if (budgetId)
          next = fourChainReducer(next, { type: "SET_BUDGET", budget: String(budgetId) });
      }

      if (isSameFourChainState(value, next)) return;
      onChange(next);
    },
    [onChange, value, mainCategories, subCategories],
  );

  const txTypeOptions = useMemo((): ChainOption[] => {
    const types = allowedTxTypes || TRANSACTION_TYPES.map((i) => i.type);
    return types.map((txType) => {
      const t = TRANSACTION_TYPES.find((i) => i.type === txType);
      return {
        key: txType,
        label: txType,
        textValue: txType,
        icon: t?.icon || "🔄",
        backColor: t?.back_color || "bg-gray-100 dark:bg-[#2a2f3a]",
        foreColor: t?.fore_color || "text-gray-800 dark:text-zinc-200",
      };
    });
  }, [allowedTxTypes]);

  const mainCategoryOptions = useMemo((): ChainOption[] => {
    if (!value.txType) return [];
    return mainCategories
      .filter((i) => i.transaction_type === value.txType)
      .map((i) => ({
        key: String(i.id),
        label: i.label,
        icon: i.icon,
        backColor: i.back_color,
        foreColor: i.fore_color,
        textValue: i.label,
      }));
  }, [value.txType, mainCategories]);

  const subCategoryOptions = useMemo((): ChainOption[] => {
    if (!value.main_id) return [];
    return subCategories
      .filter((i) => i.main_category_id === Number(value.main_id))
      .map((i) => ({
        key: String(i.id),
        label: i.label,
        icon: i.icon,
        backColor: i.back_color,
        foreColor: i.fore_color,
        textValue: i.label,
      }));
  }, [value.main_id, subCategories]);

  const budgetOptions = useMemo(
    (): ChainOption[] =>
      budgetTypes.map((i) => ({
        key: String(i.id),
        label: i.name,
        textValue: i.name,
        icon: i.icon || "📊",
        backColor: "bg-blue-100 dark:bg-blue-950/60",
        foreColor: "text-blue-800 dark:text-blue-300",
      })),
    [budgetTypes],
  );

  // 支持点击已选项取消选择
  const handle = (fieldType: "tx" | "main" | "sub" | "budget", key: string | undefined) => {
    if (fieldType === "tx")
      dispatch({ type: "SET_TX", tx: key === value.txType ? undefined : (key as TransactionType) });
    if (fieldType === "main")
      dispatch({ type: "SET_MAIN", main: key === value.main_id ? undefined : key });
    if (fieldType === "sub")
      dispatch({ type: "SET_SUB", sub: key === value.sub_id ? undefined : key });
    if (fieldType === "budget")
      dispatch({ type: "SET_BUDGET", budget: key === value.budget_id ? undefined : key });
  };

  const renderSelector = (
    title: string,
    options: ChainOption[],
    selectedKey: string | undefined,
    fieldType: "tx" | "main" | "sub" | "budget",
    disabled = false,
    placeholder?: string,
  ) => {
    const commonProps = { title, options, selectedKey, disabled };
    if (mode === "select") {
      return (
        <SelectDisplayMode
          {...commonProps}
          onChange={(k) => handle(fieldType, k)}
          placeholder={placeholder}
          selectFieldStyles={selectFieldStyles}
          selectTextStyles={selectTextStyles}
          resolvedSelectFieldSize={resolvedSelectFieldSize}
        />
      );
    }
    return <ListboxDisplayMode {...commonProps} onChangeKey={(k) => handle(fieldType, k)} />;
  };

  return (
    <div className={`w-full space-y-3 ${className}`}>
      <div
        className={`${mode === "select" ? "grid" : "flex flex-wrap"} gap-3`}
        style={
          mode === "select"
            ? {
                gridTemplateColumns: `repeat(auto-fit, minmax(${SELECT_GRID_MIN_WIDTHS[resolvedSelectFieldSize]}, 1fr))`,
              }
            : undefined
        }
      >
        {renderSelector("交易类型", txTypeOptions, value.txType, "tx")}
        {renderSelector(
          "主类别",
          mainCategoryOptions,
          value.main_id,
          "main",
          !value.txType,
          "请先选择交易类型",
        )}
        {renderSelector(
          "子类别",
          subCategoryOptions,
          value.sub_id,
          "sub",
          !value.main_id,
          "请先选择主类别",
        )}
        {renderSelector("预算计划", budgetOptions, value.budget_id, "budget")}
      </div>
    </div>
  );
}

export function TransactionEditorFourChainSelector({
  allowedTxTypes,
  mode = "listbox",
  selectModeOptions,
  className = "",
}: {
  allowedTxTypes?: TransactionType[];
  mode?: SelectorMode;
  selectModeOptions?: FourChainSelectModeOptions;
  className?: string;
}) {
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
    (next: FourChainState) => {
      updateFields({
        transaction_type: next.txType || "",
        main_category: next.main_id,
        sub_category: next.sub_id,
        budget_type: next.budget_id,
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
