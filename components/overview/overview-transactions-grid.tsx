"use client";

import type { TransactionWithRelations } from "@/types";
import type { Ref } from "react";

import {
  type CellDoubleClickedEvent,
  type CellStyle,
  type CellValueChangedEvent,
  type ColDef,
  type SelectionChangedEvent,
  type StatusBar,
  type ValueFormatterParams,
  type ValueParserParams,
  type ValueSetterParams,
  themeQuartz,
  colorSchemeDarkBlue,
} from "ag-grid-community";
import { useCallback, useMemo } from "react";
import { useTheme } from "next-themes";
import { AgGridReact, type CustomCellRendererProps } from "ag-grid-react";
import { Chip, Spinner } from "@heroui/react";
import { useRouter } from "next/navigation";

import { TRANSACTION_STATUS_COLORS, TRANSACTION_TYPES } from "@/constants/transaction-type";
import { useAppData } from "@/components/context/app-data-context";
import { useTransactionStore } from "@/components/context/transaction-store-context";
import {
  formatAmountParts,
  formatTransactionTypeWithEmoji,
  getAmountColorClass,
} from "@/lib/transaction/transaction-display";
import { displayTxTime, parseTxTime, formatTxTime } from "@/lib/transaction/transaction-datetime";

const FONT_MONO =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

const EMPTY_BUDGET = -1;

function formatCategoryPickCell(c: { id: number; label: string; icon?: string | null }) {
  return c.label ? `${c.icon || "📋"} ${c.label}` : "";
}

function parseAccountIdFromImport(
  raw: string,
  accountsList: { id: number; name: string }[],
): number | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  // 试图解析 ID
  if (/^\d+$/.test(t)) {
    const id = Number(t);
    if (accountsList.some((a) => a.id === id)) return id;
  }
  // 试图解析 名称
  const byName = accountsList.find((a) => a.name === t);
  return byName?.id;
}

function parseCategoryIdFromImport(
  raw: string,
  items: { id: number; label: string; icon?: string | null }[],
): number | null | undefined {
  const t = raw.trim();
  if (!t) return null;
  // 试图解析 ID
  const n = Number(t);
  if (!Number.isNaN(n) && Number.isInteger(n) && items.some((i) => i.id === n)) return n;
  // 试图解析 名称 或 Emoji + 名称组合
  for (const item of items) {
    if (!item.label) continue;
    if (t === item.label || t === formatCategoryPickCell(item)) return item.id;
  }
  return undefined;
}

function OverviewAmountCell({ data }: CustomCellRendererProps<TransactionWithRelations>) {
  if (!data) return null;
  const { sign, digits } = formatAmountParts(data.amount ?? 0, data.transaction_type ?? null);
  const amountColorClass = getAmountColorClass(data.transaction_type);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        minWidth: 0,
        fontWeight: 600,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <span style={{ display: "inline-flex", flexShrink: 0, alignItems: "center", gap: 6 }}>
        <span>¥</span>
        <span className={amountColorClass} style={{ whiteSpace: "pre" }}>
          {sign}
        </span>
      </span>
      <span className={amountColorClass} style={{ fontVariantNumeric: "tabular-nums" }}>
        {digits}
      </span>
    </div>
  );
}

function StatusBadgeCell({ data }: CustomCellRendererProps<TransactionWithRelations>) {
  const s = data?.status;
  if (!s) return null;
  if (s === "附加到其他交易") return null;
  let str = String(s);
  if (str === "经自动处理填写" || str === "经自动处理取消") str = str.slice(1);
  return (
    <Chip size="sm" variant="flat" color={TRANSACTION_STATUS_COLORS[s]} className="h-5 max-w-full">
      {str}
    </Chip>
  );
}

const gridThemeBase = themeQuartz.withParams({
  headerFontSize: 13,
  rowGroupIndentSize: 12,
});

const defaultColDef: ColDef<TransactionWithRelations> = {
  sortable: true,
  filter: true,
  resizable: true,
  wrapHeaderText: true,
  autoHeaderHeight: true,
  suppressHeaderMenuButton: true,
  floatingFilter: false,
};

interface OverviewTransactionsGridProps {
  gridRef?: Ref<AgGridReact<TransactionWithRelations>>;
  quickFilterText?: string;
  onSelectionChange?: (ids: number[]) => void;
}

export function OverviewTransactionsGrid({
  gridRef,
  quickFilterText,
  onSelectionChange,
}: OverviewTransactionsGridProps) {
  const { resolvedTheme } = useTheme();
  const gridTheme = useMemo(
    () => (resolvedTheme === "dark" ? gridThemeBase.withPart(colorSchemeDarkBlue) : gridThemeBase),
    [resolvedTheme],
  );
  const {
    hasLoaded: appLoaded,
    accounts,
    mainCategories,
    subCategories,
    budgetTypes,
  } = useAppData();
  const router = useRouter();
  const store = useTransactionStore();
  const { transactions, isFetching, error, setTransactionDraft } = store;

  // Immer's produce() freezes objects in the React Query cache.
  // ag-grid mutates row data in-place via valueSetter / default field setters,
  // so we shallow-clone each row to make them writable.
  const mutableRows = useMemo(() => transactions.map((tx) => ({ ...tx })), [transactions]);

  const merchantValues = useMemo(
    () =>
      Array.from(
        new Set(transactions.map((t) => t.merchant).filter((m): m is string => Boolean(m?.trim()))),
      ).sort(),
    [transactions],
  );

  const txTypeValues = useMemo(() => TRANSACTION_TYPES.map((t) => t.type), []);
  const statusBar = useMemo<StatusBar>(
    () => ({
      statusPanels: [
        {
          statusPanel: "agAggregationComponent",
          key: "rangeAggregation",
          align: "right",
          statusPanelParams: {
            aggFuncs: ["count", "sum", "avg"],
          },
        },
      ],
    }),
    [],
  );
  const rowSelection = useMemo(
    () =>
      ({
        mode: "multiRow" as const,
        enableClickSelection: false,
      }) as const,
    [],
  );

  const onCellValueChanged = useCallback(
    (e: CellValueChangedEvent<TransactionWithRelations>) => {
      if (e.oldValue === e.newValue) return;
      const tx = e.data;
      if (!tx) return;
      const id = tx.id;

      setTransactionDraft(id, () => {
        const { parent_id, children_ids, ...draft } = tx;
        return draft;
      });
    },
    [setTransactionDraft],
  );

  const onIdCellDoubleClicked = useCallback(
    (e: CellDoubleClickedEvent<TransactionWithRelations>) => {
      const tx = e.data;
      if (!tx) return;
      router.push(`/transactions?id=${tx.id}`);
    },
    [router],
  );

  const columnDefs = useMemo<ColDef<TransactionWithRelations>[]>(
    () => [
      {
        field: "datetime",
        headerName: "日期时间",
        width: 155,
        editable: true,
        cellDataType: "dateTimeString",
        filter: "agDateColumnFilter",
        filterParams: {
          comparator: (fd: Date, cell: string) => {
            if (!cell) return -1;
            const dt = parseTxTime(cell);
            if (!dt) return 0;
            const cellDay = dt.startOf("day").toMillis();
            const filterDay = new Date(fd.getFullYear(), fd.getMonth(), fd.getDate()).getTime();
            if (cellDay < filterDay) return -1;
            if (cellDay > filterDay) return 1;
            return 0;
          },
        },
        valueFormatter: (p) => displayTxTime(p.value ?? null, "long"),
        getQuickFilterText: (p) => displayTxTime(p.data?.datetime ?? null, "long") || "",
        valueParser: (p: ValueParserParams<TransactionWithRelations, string | null>) => {
          const t = String(p.newValue ?? "").trim();
          if (!t || t === "-") return null;
          return formatTxTime(t) ?? undefined;
        },
        cellEditor: "agDateStringCellEditor",
        cellEditorParams: { includeTime: true },
        cellStyle: { fontFamily: FONT_MONO, fontSize: 12 } as CellStyle,
        valueSetter: (p: ValueSetterParams<TransactionWithRelations, string | null>) => {
          const normalized = formatTxTime(p.newValue);
          if (!normalized) return false;
          p.data.datetime = normalized;
          return true;
        },
      },
      {
        colId: "account_pick",
        headerName: "账户",
        width: 120,
        editable: true,
        filter: "agSetColumnFilter",
        filterParams: {
          values: accounts.map((a) => a.id),
          valueFormatter: (p: ValueFormatterParams<TransactionWithRelations, number>) =>
            accounts.find((a) => a.id === p.value)?.name ?? String(p.value ?? ""),
        },
        valueGetter: (p) => p.data?.account?.id,
        valueFormatter: (p) => p.data?.account?.name ?? "",
        getQuickFilterText: (p) => p.data?.account?.name ?? "",
        valueParser: (p: ValueParserParams<TransactionWithRelations, number>) =>
          parseAccountIdFromImport(String(p.newValue ?? ""), accounts),
        cellEditor: "agRichSelectCellEditor",
        cellEditorParams: {
          values: accounts.map((a) => a.id),
          formatValue: (id: number | null | undefined) =>
            accounts.find((a) => a.id === id)?.name ?? "",
        },
        valueSetter: (p: ValueSetterParams<TransactionWithRelations, number>) => {
          const newId = p.newValue as number;
          const acc = accounts.find((a) => a.id === newId);
          if (!acc) return false;
          p.data.account = acc;
          return true;
        },
      },
      {
        field: "name",
        headerName: "名称",
        width: 170,
        editable: true,
        filter: "agTextColumnFilter",
        cellEditor: "agTextCellEditor",
      },
      {
        field: "merchant",
        headerName: "商家",
        width: 120,
        editable: true,
        filter: "agSetColumnFilter",
        filterParams: merchantValues.length ? { values: merchantValues } : undefined,
        cellEditor: "agTextCellEditor",
      },
      {
        field: "amount",
        headerName: "金额",
        type: "numericColumn",
        width: 120,
        cellDataType: "number",
        editable: true,
        filter: "agNumberColumnFilter",
        cellRenderer: OverviewAmountCell,
        cellEditor: "agNumberCellEditor",
        cellEditorParams: { precision: 2, step: 0.01 },
        cellStyle: { fontFamily: FONT_MONO, fontVariantNumeric: "tabular-nums" } as CellStyle,
        valueGetter: (p) => p.data?.amount ?? 0,
        valueFormatter: (p) => (p.value ?? 0).toFixed(2),
        getQuickFilterText: (p) => {
          const amount = p.data?.amount ?? 0;
          const { sign, digits } = formatAmountParts(amount, p.data?.transaction_type ?? null);
          return `${sign}${digits}`;
        },
        valueParser: (p: ValueParserParams<TransactionWithRelations, string>) => {
          const cleaned = String(p.newValue ?? "").replace(/[¥$,，\s]/g, "");
          const n = parseFloat(cleaned);
          if (Number.isNaN(n)) return undefined;
          return Math.round(Math.abs(n) * 100) / 100;
        },
        valueSetter: (p: ValueSetterParams<TransactionWithRelations, number>) => {
          const n = Number(p.newValue);
          if (Number.isNaN(n)) return false;
          p.data.amount = Math.round(Math.abs(n) * 100) / 100;
          return true;
        },
      },
      {
        field: "transaction_type",
        headerName: "交易类型",
        width: 120,
        editable: true,
        filter: "agSetColumnFilter",
        filterParams: { values: txTypeValues },
        valueFormatter: (p) => formatTransactionTypeWithEmoji(p.value ?? undefined),
        getQuickFilterText: (p) => formatTransactionTypeWithEmoji(p.value ?? undefined),
        valueParser: (p: ValueParserParams<TransactionWithRelations, string>) => {
          const t = String(p.newValue ?? "").trim();
          if (!t || t === "-") return undefined;
          // 试图解析 交易类型名
          if (txTypeValues.includes(t as (typeof txTypeValues)[number])) return t;
          // 试图解析 Emoji + 类型名
          const hit = TRANSACTION_TYPES.find((tt) => formatTransactionTypeWithEmoji(tt.type) === t);
          return hit?.type;
        },
        cellEditor: "agRichSelectCellEditor",
        cellEditorParams: {
          values: txTypeValues,
          formatValue: (v: string | null | undefined) =>
            formatTransactionTypeWithEmoji(v ?? undefined),
        },
        valueSetter: (p: ValueSetterParams<TransactionWithRelations, string>) => {
          const v = p.newValue as string;
          if (!txTypeValues.includes(v as (typeof txTypeValues)[number])) return false;
          p.data.transaction_type = v as TransactionWithRelations["transaction_type"];
          if (p.data.main_category && p.data.main_category.transaction_type !== v) {
            p.data.main_category = undefined;
            p.data.sub_category = undefined;
          }
          return true;
        },
      },
      {
        colId: "main_category_pick",
        headerName: "主类别",
        width: 120,
        editable: true,
        filter: "agSetColumnFilter",
        filterParams: {
          values: mainCategories.map((c) => c.id),
          valueFormatter: (p: ValueFormatterParams<TransactionWithRelations, number>) => {
            const mc = mainCategories.find((c) => c.id === p.value);
            return mc?.label ? formatCategoryPickCell(mc) : String(p.value ?? "");
          },
        },
        valueGetter: (p) => p.data?.main_category?.id,
        valueFormatter: (p) =>
          p.data?.main_category?.label ? formatCategoryPickCell(p.data.main_category) : "",
        getQuickFilterText: (p) =>
          p.data?.main_category?.label ? formatCategoryPickCell(p.data.main_category) : "",
        valueParser: (p: ValueParserParams<TransactionWithRelations, number | null>) => {
          const txType = p.data?.transaction_type;
          const allowed = mainCategories.filter((c) => c.transaction_type === txType);
          return parseCategoryIdFromImport(String(p.newValue ?? ""), allowed);
        },
        cellEditor: "agRichSelectCellEditor",
        cellEditorParams: {
          values: (params: { data?: TransactionWithRelations }) => {
            const txType = params.data?.transaction_type;
            return mainCategories.filter((c) => c.transaction_type === txType).map((c) => c.id);
          },
          formatValue: (id: number | null | undefined) => {
            const mc = mainCategories.find((c) => c.id === id);
            return mc?.label ? formatCategoryPickCell(mc) : "";
          },
        },
        valueSetter: (p: ValueSetterParams<TransactionWithRelations, number | null>) => {
          const newId = p.newValue as number | null;
          if (newId == null) {
            p.data.main_category = undefined;
            p.data.sub_category = undefined;
            return true;
          }
          const mc = mainCategories.find(
            (c) => c.id === newId && c.transaction_type === p.data?.transaction_type,
          );
          if (!mc) return false;
          p.data.main_category = mc;
          const subOk = p.data.sub_category?.id
            ? subCategories.some(
                (s) => s.id === p.data.sub_category?.id && s.main_category_id === mc.id,
              )
            : true;
          if (!subOk) p.data.sub_category = undefined;
          return true;
        },
      },
      {
        colId: "sub_category_pick",
        headerName: "子类别",
        width: 120,
        editable: true,
        filter: "agSetColumnFilter",
        filterParams: {
          values: subCategories.map((s) => s.id),
          valueFormatter: (p: ValueFormatterParams<TransactionWithRelations, number>) => {
            const sc = subCategories.find((c) => c.id === p.value);
            return sc?.label ? formatCategoryPickCell(sc) : String(p.value ?? "");
          },
        },
        valueGetter: (p) => p.data?.sub_category?.id,
        valueFormatter: (p) =>
          p.data?.sub_category?.label ? formatCategoryPickCell(p.data.sub_category) : "",
        getQuickFilterText: (p) =>
          p.data?.sub_category?.label ? formatCategoryPickCell(p.data.sub_category) : "",
        valueParser: (p: ValueParserParams<TransactionWithRelations, number | null>) => {
          const mainId = p.data?.main_category?.id;
          const allowed = subCategories.filter((s) => s.main_category_id === mainId);
          return parseCategoryIdFromImport(String(p.newValue ?? ""), allowed);
        },
        cellEditor: "agRichSelectCellEditor",
        cellEditorParams: {
          values: (params: { data?: TransactionWithRelations }) => {
            const mainId = params.data?.main_category?.id;
            return subCategories.filter((s) => s.main_category_id === mainId).map((s) => s.id);
          },
          formatValue: (id: number | null | undefined) => {
            const sc = subCategories.find((c) => c.id === id);
            return sc?.label ? formatCategoryPickCell(sc) : "";
          },
        },
        valueSetter: (p: ValueSetterParams<TransactionWithRelations, number | null>) => {
          const newId = p.newValue as number | null;
          const mainId = p.data?.main_category?.id;
          if (newId == null) {
            p.data.sub_category = undefined;
            return true;
          }
          const sc = subCategories.find((c) => c.id === newId);
          if (!sc || sc.main_category_id !== mainId) return false;
          p.data.sub_category = sc;
          return true;
        },
      },
      {
        colId: "budget_type_pick",
        headerName: "预算计划",
        width: 120,
        editable: true,
        filter: "agSetColumnFilter",
        filterParams: {
          values: [EMPTY_BUDGET, ...budgetTypes.map((b) => b.id)],
          valueFormatter: (p: ValueFormatterParams<TransactionWithRelations, number>) => {
            const id = p.value as number;
            if (id == null || id === EMPTY_BUDGET) return "(空)";
            return budgetTypes.find((b) => b.id === id)?.name ?? String(id);
          },
        },
        valueGetter: (p) => p.data?.budget_type?.id ?? EMPTY_BUDGET,
        valueFormatter: (p) => p.data?.budget_type?.name ?? "",
        getQuickFilterText: (p) => (p.data?.budget_type?.name ? p.data.budget_type.name : "(空)"),
        valueParser: (p: ValueParserParams<TransactionWithRelations, number>) => {
          const t = String(p.newValue ?? "").trim();
          if (!t || t === "(空)") return EMPTY_BUDGET;
          // 试图解析 ID
          const n = Number(t);
          if (!Number.isNaN(n) && Number.isInteger(n)) {
            if (n === EMPTY_BUDGET) return EMPTY_BUDGET;
            if (budgetTypes.some((b) => b.id === n)) return n;
          }
          // 试图解析 名称
          return budgetTypes.find((b) => b.name === t)?.id;
        },
        cellEditor: "agRichSelectCellEditor",
        cellEditorParams: {
          values: [EMPTY_BUDGET, ...budgetTypes.map((b) => b.id)],
          formatValue: (id: number | null | undefined) =>
            id == null || id === EMPTY_BUDGET
              ? "(空)"
              : (budgetTypes.find((b) => b.id === id)?.name ?? ""),
        },
        valueSetter: (p: ValueSetterParams<TransactionWithRelations, number>) => {
          const v = p.newValue as number;
          if (v === EMPTY_BUDGET) {
            p.data.budget_type = undefined;
            return true;
          }
          const bt = budgetTypes.find((b) => b.id === v);
          if (!bt) return false;
          p.data.budget_type = bt;
          return true;
        },
      },
      {
        field: "status",
        headerName: "状态",
        width: 120,
        editable: false,
        filter: "agSetColumnFilter",
        cellRenderer: StatusBadgeCell,
        getQuickFilterText: (p) => p.data?.status ?? "",
      },
      {
        colId: "split_count",
        headerName: "分账数目",
        width: 88,
        editable: false,
        filter: "agNumberColumnFilter",
        valueGetter: (p) => p.data?.splits?.length ?? 0,
        valueFormatter: (p) => {
          const n = p.value as number;
          return n === 0 ? "" : `${n}笔`;
        },
        getQuickFilterText: (p) => {
          const n = p.data?.splits?.length ?? 0;
          return n === 0 ? "" : `${n}笔`;
        },
      },
      {
        field: "source",
        headerName: "来源",
        width: 140,
        editable: true,
        filter: "agTextColumnFilter",
        cellEditor: "agLargeTextCellEditor",
        cellEditorPopup: true,
        cellEditorParams: { rows: 3, cols: 30 },
      },
      {
        field: "remark",
        headerName: "备注",
        width: 200,
        editable: true,
        filter: "agTextColumnFilter",
        cellEditor: "agLargeTextCellEditor",
        cellEditorPopup: true,
        cellEditorParams: { rows: 4, cols: 40 },
      },
      {
        field: "title",
        headerName: "识别标题",
        width: 200,
        editable: true,
        filter: "agTextColumnFilter",
        cellEditor: "agLargeTextCellEditor",
        cellEditorPopup: true,
        cellEditorParams: { rows: 3, cols: 40 },
      },
    ],
    [accounts, budgetTypes, mainCategories, merchantValues, subCategories, txTypeValues],
  );

  if (!appLoaded || (accounts.length > 0 && isFetching && transactions.length === 0)) {
    return (
      <div className="flex h-[min(70vh,560px)] w-full items-center justify-center rounded-lg border border-default-200 bg-default-50/40">
        <Spinner size="lg" color="default" label="加载交易数据…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-danger-200 bg-danger-50/30 p-6 text-sm text-danger">
        {error}
      </div>
    );
  }

  if (!accounts.length) {
    return <p className="text-sm text-default-500">请先添加账户后再加载交易数据。</p>;
  }

  return (
    <div
      className="ag-theme-quartz min-h-0 w-full flex-1"
      style={{ height: "min(70vh, calc(100vh - 12rem))", minHeight: 360 }}
    >
      <AgGridReact<TransactionWithRelations>
        ref={gridRef}
        theme={gridTheme}
        rowData={mutableRows}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        treeData
        treeDataParentIdField="parent_id"
        groupDefaultExpanded={1}
        autoGroupColumnDef={{
          headerName: "ID",
          field: "id",
          width: 120,
          minWidth: 88,
          editable: false,
          filter: "agNumberColumnFilter",
          valueFormatter: (p) => (p.value != null ? `#${p.value}` : ""),
          getQuickFilterText: (p) => (p.data?.id != null ? `#${p.data.id}` : ""),
          pinned: "left",
          cellRendererParams: { suppressCount: true, suppressDoubleClickExpand: true },
          cellStyle: { fontWeight: 600, fontFamily: FONT_MONO } as CellStyle,
          onCellDoubleClicked: onIdCellDoubleClicked,
        }}
        getRowId={(p) => String(p.data.id)}
        quickFilterText={quickFilterText || undefined}
        rowSelection={rowSelection}
        cellSelection={{
          handle: { mode: "fill", direction: "y" },
        }}
        statusBar={statusBar}
        onCellValueChanged={onCellValueChanged}
        onSelectionChanged={(e: SelectionChangedEvent<TransactionWithRelations>) => {
          onSelectionChange?.(e.api.getSelectedRows().map((tx) => tx.id));
        }}
        pagination
        paginationPageSize={100}
        paginationPageSizeSelector={[50, 100, 200, 500]}
        animateRows
        rowGroupPanelShow="never"
      />
    </div>
  );
}
