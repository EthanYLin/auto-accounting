import type { ComponentType } from "react";
import type { FourChainState } from "@/components/homepage/common/four-chain-selector";
import type { SplitEntryData } from "@/components/homepage/split-area/split-entry-editor";
import type { MainCategory, SubCategory, TransactionType } from "@/types";

import {
  ArrowsPointingInIcon,
  UsersIcon,
  UserGroupIcon,
  ChartPieIcon,
  BanknotesIcon,
  ArrowRightCircleIcon,
  ArrowLeftCircleIcon,
  BoltIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";

import { TRANSACTION_TYPES } from "@/constants/transaction-type";

// ==================== 类型定义 ====================

export type SplitActionKey =
  | "merge"
  | "social-split-2"
  | "social-split-3"
  | "ratio-split"
  | "amount-split"
  | "transfer-to"
  | "transfer-from"
  | "recharge-to"
  | "recharge-from";

export interface SplitActionPayload {
  actionKey: SplitActionKey;
}

export interface RatioSplitPayload extends SplitActionPayload {
  actionKey: "ratio-split";
  count: number;
  ratio: number[];
  chainStates: FourChainState[];
  name: string;
}

export interface SocialSplitPayload extends SplitActionPayload {
  actionKey: "social-split-2" | "social-split-3";
  count: number;
  ratio: number[];
  chainStates: FourChainState[];
  name: string;
}

export interface AmountSplitPayload extends SplitActionPayload {
  actionKey: "amount-split";
  count: number;
  /** 绝对值 cents，仅包含前 count-1 笔；最后一笔由系统计算得到 */
  partialAbsCents: number[];
  chainStates: FourChainState[];
  name: string;
}

export interface AccountTargetPayload extends SplitActionPayload {
  actionKey: "transfer-to" | "transfer-from" | "recharge-to" | "recharge-from";
  account_id: string;
  mainCategories: MainCategory[];
  subCategories: SubCategory[];
}

/** 一条拆账操作规则 */
export interface SplitActionRule {
  /** 唯一标识 */
  key: SplitActionKey;
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
  /** 执行拆账操作，返回新的条目列表 */
  split: (
    sources: SplitEntryData[],
    nextLocalId: number,
    payload?: SplitActionPayload,
  ) => SplitEntryData[];
}

// ==================== 辅助函数 ====================

/** 根据交易类型取符号 */
function getSign(txType: TransactionType): number {
  return TRANSACTION_TYPES.find((t) => t.type === txType)?.sign ?? 0;
}

/** 获取带符号的金额 */
function getSignedAmount(entry: SplitEntryData): number {
  const sign = entry.chainState.txType ? getSign(entry.chainState.txType) : 0;
  const amount = parseFloat(entry.amount) || 0;
  return sign * amount;
}

export function sumSignedAmounts(entries: SplitEntryData[]): number {
  return entries.reduce((sum, e) => sum + getSignedAmount(e), 0);
}

/**
 * 将绝对总额（cents）按比例拆分成每一行的 cents。
 * 规则：前 n-1 行向下取整，最后一行取剩余值，避免累计误差。
 */
export function computeSplitCentsPerRow(totalAbsCents: number, ratios: number[]): number[] {
  const ratioSum = ratios.reduce((s, r) => s + r, 0);
  if (ratios.length === 0 || ratioSum <= 0) {
    return ratios.map(() => 0);
  }
  let assigned = 0;
  return ratios.map((ratio, index) => {
    if (index === ratios.length - 1) {
      return Math.max(0, totalAbsCents - assigned);
    } else {
      const c = Math.floor((totalAbsCents * ratio) / ratioSum);
      assigned += c;
      return c;
    }
  });
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

function buildTransferLikeEntry(
  localId: number,
  accountId: string,
  amount: string,
  txType: "转出" | "转入",
  mainCategories: MainCategory[],
  subCategories: SubCategory[],
): SplitEntryData {
  const matchedMain = mainCategories.find((item) => item.transaction_type === txType);
  const matchedSub = matchedMain
    ? subCategories.find((item) => item.main_category_id === matchedMain.id)
    : undefined;

  return {
    localId,
    accountId,
    amount,
    name: txType,
    chainState: {
      txType,
      main_id: matchedMain ? String(matchedMain.id) : undefined,
      sub_id: matchedSub ? String(matchedSub.id) : undefined,
      budget_id: undefined,
    },
  };
}

function buildCrossAccountSplitEntries(
  mode: "transfer-to" | "transfer-from" | "recharge-to" | "recharge-from",
  sources: SplitEntryData[],
  nextLocalId: number,
  payload?: SplitActionPayload,
): SplitEntryData[] {
  if (!payload || payload.actionKey !== mode) return sources;
  const accountPayload = payload as AccountTargetPayload;
  if (sources.length !== 1) return sources;

  const source = sources[0];
  const sourceAccountId = source.accountId;
  const targetAccountId = accountPayload.account_id;
  const mainCategories = accountPayload.mainCategories;
  const subCategories = accountPayload.subCategories;
  if (!Array.isArray(mainCategories) || !Array.isArray(subCategories)) return sources;
  if (!sourceAccountId || !targetAccountId) return sources;

  const amount = source.amount;
  const sourceToOut = mode === "transfer-to" || mode === "recharge-to";
  const sourceTxType: "转出" | "转入" = sourceToOut ? "转出" : "转入";
  const targetTxType: "转出" | "转入" = sourceToOut ? "转入" : "转出";

  const result: SplitEntryData[] = [
    buildTransferLikeEntry(
      nextLocalId,
      sourceAccountId,
      amount,
      sourceTxType,
      mainCategories,
      subCategories,
    ),
    buildTransferLikeEntry(
      nextLocalId + 1,
      targetAccountId,
      amount,
      targetTxType,
      mainCategories,
      subCategories,
    ),
  ];

  if (mode === "transfer-to" || mode === "transfer-from") {
    result.push({
      localId: nextLocalId + 2,
      accountId: targetAccountId,
      amount,
      name: source.name,
      chainState: { ...source.chainState },
    });
  }

  return result;
}

// ==================== 规则注册表 ====================

export const SPLIT_ACTION_RULES: SplitActionRule[] = [
  // ---- 基础操作 ----
  {
    key: "merge",
    label: "合并记录",
    color: "primary",
    icon: ArrowsPointingInIcon,
    test: (selected) => selected.length >= 2 && !distinctAccounts(selected),
    split: (sources, _nextLocalId, _payload) => {
      const result: SplitEntryData[] = [];
      const participating: SplitEntryData[] = [];

      // 1. 过滤不参与合并的记录（转出、转入、无类型则原样保留）
      sources.forEach((e) => {
        if (
          !e.chainState.txType ||
          e.chainState.txType === "转出" ||
          e.chainState.txType === "转入"
        ) {
          result.push(e);
        } else {
          participating.push(e);
        }
      });

      // 2. 相同账户聚合
      const groups = new Map<string, SplitEntryData[]>();
      participating.forEach((e) => {
        const accId = e.accountId;
        if (!groups.has(accId)) groups.set(accId, []);
        groups.get(accId)!.push(e);
      });

      // 3. 逐组合并
      Array.from(groups.values()).forEach((entries) => {
        // (1) 金额求和
        const sum = entries.reduce((acc, e) => acc + getSignedAmount(e), 0);
        if (sum === 0) return; // 完全抵消

        // (2) 确定名称：第一条有名称的记录
        const name = entries.find((e) => e.name)?.name || "";

        // (3) 确定交易类型
        let refCategory: "income_expense" | "receivable_payable" | "other" = "other";
        const firstType = entries.find((e) => e.chainState.txType)?.chainState.txType;
        if (firstType === "收入" || firstType === "支出") {
          refCategory = "income_expense";
        } else if (firstType === "应收款项" || firstType === "应付款项") {
          refCategory = "receivable_payable";
        }

        let mergedType: TransactionType;
        if (refCategory === "income_expense" || refCategory === "other") {
          mergedType = sum < 0 ? "支出" : "收入";
        } else {
          mergedType = sum < 0 ? "应收款项" : "应付款项";
        }

        // (4) 推导分类（主分类, 子分类, 预算计划）
        let txMain: string | undefined;
        let txSub: string | undefined;
        let txBudget: string | undefined;

        // 类型与 mergedType 一致，且有主分类的
        const typeMatch = entries.find(
          (e) => e.chainState.txType === mergedType && e.chainState.main_id,
        );
        if (typeMatch) {
          txMain = typeMatch.chainState.main_id;
          txSub = typeMatch.chainState.sub_id;
          txBudget = typeMatch.chainState.budget_id;
        }

        result.push({
          localId: entries[0].localId,
          accountId: entries[0].accountId,
          amount: Math.abs(sum).toFixed(2),
          name,
          chainState: {
            txType: mergedType,
            main_id: txMain,
            sub_id: txSub,
            budget_id: txBudget,
          },
        });
      });

      return result;
    },
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
    split: (sources, nextLocalId, payload) => {
      if (!payload || payload.actionKey !== "social-split-2") return sources;
      if (sources.length === 0) return sources;

      const socialPayload = payload as SocialSplitPayload;
      const count = Math.max(2, Math.trunc(socialPayload.count));
      const ratios = socialPayload.ratio;

      if (
        ratios.length !== count ||
        socialPayload.chainStates.length !== count ||
        ratios.some((value) => !Number.isFinite(value) || value <= 0)
      ) {
        return sources;
      }

      const totalAbsCents = Math.round(Math.abs(sumSignedAmounts(sources)) * 100);
      const centsPerRow = computeSplitCentsPerRow(totalAbsCents, ratios);

      return centsPerRow.map((cents, index) => ({
        localId: nextLocalId + index,
        accountId: sources[0].accountId,
        amount: (cents / 100).toFixed(2),
        name: socialPayload.name.trim(),
        chainState: socialPayload.chainStates[index],
      }));
    },
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
    split: (sources, nextLocalId, payload) => {
      if (!payload || payload.actionKey !== "social-split-3") return sources;
      if (sources.length === 0) return sources;

      const socialPayload = payload as SocialSplitPayload;
      const count = Math.max(2, Math.trunc(socialPayload.count));
      const ratios = socialPayload.ratio;

      if (
        ratios.length !== count ||
        socialPayload.chainStates.length !== count ||
        ratios.some((value) => !Number.isFinite(value) || value <= 0)
      ) {
        return sources;
      }

      const totalAbsCents = Math.round(Math.abs(sumSignedAmounts(sources)) * 100);
      const centsPerRow = computeSplitCentsPerRow(totalAbsCents, ratios);

      return centsPerRow.map((cents, index) => ({
        localId: nextLocalId + index,
        accountId: sources[0].accountId,
        amount: (cents / 100).toFixed(2),
        name: socialPayload.name.trim(),
        chainState: socialPayload.chainStates[index],
      }));
    },
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
    split: (sources, nextLocalId, payload) => {
      if (!payload || payload.actionKey !== "ratio-split") return sources;
      if (sources.length === 0) return sources;

      const ratioPayload = payload as RatioSplitPayload;
      const count = Math.max(1, Math.trunc(ratioPayload.count));
      const ratios = ratioPayload.ratio;

      if (
        ratios.length !== count ||
        ratioPayload.chainStates.length !== count ||
        ratios.some((value) => !Number.isFinite(value) || value <= 0)
      ) {
        return sources;
      }

      const totalAbsCents = Math.round(Math.abs(sumSignedAmounts(sources)) * 100);
      const centsPerRow = computeSplitCentsPerRow(totalAbsCents, ratios);
      return centsPerRow.map((cents, index) => ({
        localId: nextLocalId + index,
        accountId: sources[0].accountId,
        amount: (cents / 100).toFixed(2),
        name: ratioPayload.name.trim(),
        chainState: ratioPayload.chainStates[index],
      }));
    },
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
    split: (sources, nextLocalId, payload) => {
      if (!payload || payload.actionKey !== "amount-split") return sources;
      if (sources.length === 0) return sources;

      const amountPayload = payload as AmountSplitPayload;
      const count = Math.max(2, Math.trunc(amountPayload.count));

      if (
        amountPayload.chainStates.length !== count ||
        amountPayload.partialAbsCents.length !== count - 1 ||
        amountPayload.partialAbsCents.some((c) => !Number.isFinite(c) || c < 0)
      ) {
        return sources;
      }

      const totalAbsCents = Math.round(Math.abs(sumSignedAmounts(sources)) * 100);
      const assigned = amountPayload.partialAbsCents.reduce((s, v) => s + v, 0);
      const lastAbsCents = totalAbsCents - assigned;
      if (lastAbsCents < 0) return sources;

      const absCents = [...amountPayload.partialAbsCents, lastAbsCents];
      return absCents.map((cents, index) => ({
        localId: nextLocalId + index,
        accountId: sources[0].accountId,
        amount: (cents / 100).toFixed(2),
        name: amountPayload.name.trim(),
        chainState: amountPayload.chainStates[index],
      }));
    },
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
    split: (sources, nextLocalId, payload) =>
      buildCrossAccountSplitEntries("transfer-to", sources, nextLocalId, payload),
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
    split: (sources, nextLocalId, payload) =>
      buildCrossAccountSplitEntries("transfer-from", sources, nextLocalId, payload),
  },
  {
    key: "recharge-to",
    label: "充值到…",
    variant: "ghost",
    icon: BoltIcon,
    test: (selected) =>
      selected.length === 1 &&
      !!selected[0].chainState.txType &&
      ["支出", "应收款项", "转出"].includes(selected[0].chainState.txType),
    split: (sources, nextLocalId, payload) =>
      buildCrossAccountSplitEntries("recharge-to", sources, nextLocalId, payload),
  },
  {
    key: "recharge-from",
    label: "从…充值",
    variant: "ghost",
    icon: ArrowDownTrayIcon,
    test: (selected) =>
      selected.length === 1 &&
      !!selected[0].chainState.txType &&
      ["收入", "应付款项", "转入"].includes(selected[0].chainState.txType),
    split: (sources, nextLocalId, payload) =>
      buildCrossAccountSplitEntries("recharge-from", sources, nextLocalId, payload),
  },
];

// ==================== 对外查询接口 ====================

/** 根据当前条目列表和选中 ID 集合，返回可用的操作列表 */
export function getAvailableActions(
  entries: SplitEntryData[],
  selectedIds: Set<number>,
): SplitActionRule[] {
  if (selectedIds.size === 0) return [];
  const selected = entries.filter((e) => selectedIds.has(e.localId));
  if (selected.length === 0) return [];
  return SPLIT_ACTION_RULES.filter((rule) => rule.test(selected));
}
