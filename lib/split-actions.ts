import type { ComponentType } from "react";
import {
  ArrowsPointingInIcon,
  ArrowsRightLeftIcon,
  UsersIcon,
  UserGroupIcon,
  ChartPieIcon,
  BanknotesIcon,
  ArrowRightCircleIcon,
  ArrowLeftCircleIcon,
  BoltIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import type { SplitEntryData } from "@/components/homepage/split-area/split-entry-editor";
import { TRANSACTION_TYPES } from "@/constants/transaction-type";
import type { TransactionType } from "@/types";

// ==================== 类型定义 ====================

/** 一条拆账操作规则 */
export interface SplitActionRule {
  /** 唯一标识 */
  key: string;
  /** 按钮文案 */
  label: string;
  /** 按钮颜色 */
  color?: "default" | "primary" | "secondary" | "success" | "warning" | "danger";
  /** 按钮风格 */
  variant?: "flat" | "light" | "solid" | "bordered" | "faded" | "shadow" | "ghost";
  /** 按钮左侧图标组件 */
  icon?: ComponentType<{ className?: string }>;
  /** 判断当前选中状态是否满足此规则 */
  test: (selected: SplitEntryData[]) => boolean;
}

// ==================== 辅助函数 ====================

/** 根据交易类型取符号 */
function getSign(txType: TransactionType): number {
  return TRANSACTION_TYPES.find((t) => t.type === txType)?.sign ?? 0;
}

/** 获取带符号的金额 */
function getSignedAmount(entry: SplitEntryData): number {
  const sign = entry.chainState.txType
    ? getSign(entry.chainState.txType)
    : 0;
  const amount = parseFloat(entry.amount) || 0;
  return sign * amount;
}

function sumSignedAmounts(entries: SplitEntryData[]): number {
  return entries.reduce((sum, e) => sum + getSignedAmount(e), 0);
}

function sameAccount(entries: SplitEntryData[]): boolean {
  const accountIds = new Set(entries.map((e) => e.accountId));
  return accountIds.size === 1 && !accountIds.has("");
}

function distinctAccounts(entries: SplitEntryData[]): boolean {
  const accountIds = entries.map((e) => e.accountId);
  return new Set(accountIds).size === accountIds.length;
}

function allHaveTxType(entries: SplitEntryData[]): boolean {
  return entries.every((e) => !!e.chainState.txType);
}

// ==================== 规则注册表 ====================

export const SPLIT_ACTION_RULES: SplitActionRule[] = [
  // ---- 基础操作 ----
  {
    key: "merge",
    label: "合并记录",
    color: "primary",
    icon: ArrowsPointingInIcon,
    test: (selected) => 
      selected.length >= 2 &&
      !distinctAccounts(selected),
  },
  {
    key: "offset",
    label: "抵消记录",
    color: "warning",
    icon: ArrowsRightLeftIcon,
    test: (selected) =>
      selected.length >= 2 &&
      allHaveTxType(selected) &&
      sameAccount(selected) &&
      sumSignedAmounts(selected) == 0,
  },

  // ---- 社交分账 ----
  {
    key: "social-split-2",
    label: "社交二分账",
    color: "primary",
    icon: UsersIcon,
    test: (selected) =>
      selected.length >= 1 &&
      sameAccount(selected) &&
      allHaveTxType(selected) &&
      sumSignedAmounts(selected) < 0,
  },
  {
    key: "social-split-3",
    label: "社交三分账",
    color: "primary",
    icon: UserGroupIcon,
    test: (selected) =>
      selected.length >= 1 &&
      sameAccount(selected) &&
      allHaveTxType(selected) &&
      sumSignedAmounts(selected) < 0,
  },

  // ---- 金额/比例分账 ----
  {
    key: "ratio-split",
    label: "按比例分账",
    color: "primary",
    icon: ChartPieIcon,
    test: (selected) =>
      selected.length >= 1 &&
      sameAccount(selected) &&
      allHaveTxType(selected) &&
      sumSignedAmounts(selected) !== 0,
  },
  {
    key: "amount-split",
    label: "按金额分账",
    color: "primary",
    icon: BanknotesIcon,
    test: (selected) =>
      selected.length >= 1 &&
      sameAccount(selected) &&
      allHaveTxType(selected) &&
      sumSignedAmounts(selected) !== 0,
  },

  // ---- 转账和充值 ----
  {
    key: "transfer-to",
    label: "转账到…",
    variant: "ghost",
    icon: ArrowRightCircleIcon,
    test: (selected) =>
      selected.length === 1 &&
      !!selected[0].chainState.txType &&
      ["支出", "应收款项"].includes(selected[0].chainState.txType),
  },
  {
    key: "transfer-from",
    label: "从…转账",
    variant: "ghost",
    icon: ArrowLeftCircleIcon,
    test: (selected) =>
      selected.length === 1 &&
      !!selected[0].chainState.txType &&
      ["收入", "应付款项"].includes(selected[0].chainState.txType),
  },
  {
    key: "recharge-to",
    label: "充值到…",
    variant: "ghost",
    icon: BoltIcon,
    test: (selected) =>
      selected.length === 1 &&
      !!selected[0].chainState.txType &&
      ["支出", "应收款项"].includes(selected[0].chainState.txType),
  },
  {
    key: "recharge-from",
    label: "从…充值",
    variant: "ghost",
    icon: ArrowDownTrayIcon,
    test: (selected) =>
      selected.length === 1 &&
      !!selected[0].chainState.txType &&
      ["收入", "应付款项"].includes(selected[0].chainState.txType),
  },
];

// ==================== 对外查询接口 ====================

/** 根据当前条目列表和选中 ID 集合，返回可用的操作列表 */
export function getAvailableActions(
  entries: SplitEntryData[],
  selectedIds: Set<string>,
): SplitActionRule[] {
  if (selectedIds.size === 0) return [];
  const selected = entries.filter((e) => selectedIds.has(e.localId));
  if (selected.length === 0) return [];
  return SPLIT_ACTION_RULES.filter((rule) => rule.test(selected));
}
