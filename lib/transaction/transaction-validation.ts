/**
 * 负责交易与拆账的校验和提示生成。
 * 包括账户、类别链、预算计划、附加交易、出口拆分和金额平衡等规则校验，
 * 用于判断交易是否可保存，以及生成告警提示。
 */
import type {
  AppDataValue,
  TransactionWithRelations,
  MainCategory,
  SubCategory,
  Account,
  BudgetType,
} from "@/types";

import { amountToCents, calculateAmount } from "@/lib/transaction/transaction-display";
import { parseTxTime } from "@/lib/transaction/transaction-datetime";
import { getExitSplits } from "@/lib/transaction/transaction-split-merge";

export type ValidationResult = { valid: boolean; hint: string[] };

// ==================== 内部校验工具 ====================

/**
 * 校验主类别 + 子类别联合有效性
 */
function validateCategoryChain(
  transactionType: string | null | undefined,
  mainCategory: MainCategory | undefined,
  subCategory: SubCategory | undefined,
  mainCategories: MainCategory[],
  subCategories: SubCategory[],
): string[] {
  const hints: string[] = [];

  if (!mainCategory) {
    hints.push("主类别不能为空");
    return hints;
  }
  if (!mainCategories.some((m) => m.id === mainCategory.id)) {
    hints.push("主类别不在有效列表中");
  }
  if (transactionType && mainCategory.transaction_type !== transactionType) {
    hints.push("主类别与收支类型不匹配");
  }

  if (!subCategory) {
    hints.push("子类别不能为空");
    return hints;
  }
  if (!subCategories.some((s) => s.id === subCategory.id)) {
    hints.push("子类别不在有效列表中");
  }
  if (subCategory.main_category_id !== mainCategory.id) {
    hints.push("子类别与主类别不匹配");
  }

  return hints;
}

/**
 * 校验账户存在且在有效列表中
 */
function validateAccount(
  account: Account | undefined | null,
  accounts: Account[],
  prefix: string,
): string[] {
  if (!account) return [`${prefix}账户不能为空`];
  if (!accounts.some((a) => a.id === account.id)) return [`${prefix}账户不在有效列表中`];
  return [];
}

/**
 * 校验预算计划为空或在有效列表中
 */
function validateBudgetType(
  budgetType: BudgetType | undefined | null,
  budgetTypes: BudgetType[],
  prefix: string,
): string[] {
  if (budgetType && !budgetTypes.some((b) => b.id === budgetType.id)) {
    return [`${prefix}预算计划不在有效列表中`];
  }
  return [];
}

// ==================== 校验函数 ====================

/**
 * 校验是否为合法交易
 */
export function isValidTransaction(
  tx: TransactionWithRelations,
  childrenTx: TransactionWithRelations[],
  appData: AppDataValue,
): ValidationResult {
  const { accounts, mainCategories, subCategories, budgetTypes } = appData;
  const hint: string[] = [];
  const isChildTransaction = tx.parent_id !== null || tx.status === "附加到其他交易";

  // ========== (1) 基本属性判定(根交易) ==========

  // 1. 账户不为空且在枚举中
  hint.push(...validateAccount(tx.account, accounts, ""));

  // 2. 金额非负数
  if (tx.amount < 0) hint.push("金额不能为负数");

  // 3. 交易类型不为空
  if (!tx.transaction_type) hint.push("交易类型不能为空");

  // 4. 预算计划为空或枚举值
  hint.push(...validateBudgetType(tx.budget_type, budgetTypes, ""));

  // 5. 日期时间不为空且合法
  if (!tx.datetime) {
    hint.push("日期时间不能为空");
  } else if (!parseTxTime(tx.datetime)) {
    hint.push("日期时间格式不合法");
  }

  // ========== (1) 基本属性判定(分账) ==========

  if (tx.splits) {
    tx.splits.forEach((split, i) => {
      const p = `分账[${i + 1}]: `;
      // 1. 账户不为空且在枚举中
      hint.push(...validateAccount(split.account, accounts, p));
      // 2. 金额非负数
      if (split.amount < 0) hint.push(`${p}金额不能为负数`);
      // 3. 交易类型不为空
      if (!split.transaction_type) hint.push(`${p}交易类型不能为空`);
      // 4. 预算计划为空或枚举值
      hint.push(...validateBudgetType(split.budget_type, budgetTypes, p));
    });
  }

  // ========== (2) 附加判定 ==========

  if (tx.status === "附加到其他交易") {
    if (!tx.parent_id) hint.push("该附加交易必须有父交易");
    if (tx.children_ids.length > 0) hint.push("该附加交易不允许有子交易");
    if (tx.splits && tx.splits.length > 0) hint.push("该附加交易不允许分账");
  } else {
    if (tx.parent_id) hint.push("非附加交易不应有父交易");
    childrenTx.forEach((child, i) => {
      if (child.status !== "附加到其他交易")
        hint.push(`子交易[${i + 1}]的状态必须是"附加到其他交易"`);
      if (child.parent_id !== tx.id) {
        hint.push(`子交易[${i + 1}]的parent_id不正确`);
      }
      // 递归校验子交易
      const childResult = isValidTransaction(child, [], appData);
      childResult.hint.forEach((h) => hint.push(`子交易[${i + 1}]: ${h}`));
    });
  }

  // 如果是子交易，跳过 (3)转账判定 和 (4)出口判定，直接返回校验结果
  if (isChildTransaction) return { valid: hint.length === 0, hint };

  // ========== (3) 转账判定 ==========
  const exitSplits = getExitSplits(tx, childrenTx);
  const inList = exitSplits.filter((s) => s.transaction_type === "转入");
  const outList = exitSplits.filter((s) => s.transaction_type === "转出");
  if (inList.length > 0 || outList.length > 0) {
    if (inList.length !== 1 || outList.length !== 1) {
      hint.push("转账必须恰好包含一条转入和一条转出记录");
    } else {
      if (amountToCents(inList[0].amount) !== amountToCents(outList[0].amount)) {
        hint.push("转入与转出金额必须相同");
      }
      if (inList[0].account?.id === outList[0].account?.id) {
        hint.push("转入与转出账户不能相同");
      }
    }
  }

  // ========== (4) 出口处类别判定 ==========
  const hasChildren = childrenTx.length > 0;
  const hasSplits = tx.splits?.length ?? 0 > 0;

  if (!hasChildren && !hasSplits) {
    // 无附加、无分账的情况
    // 名称不为空
    if (!tx.name?.trim()) hint.push("名称不能为空");
    // 主类别、子类别不为空且联合校验通过
    hint.push(
      ...validateCategoryChain(
        tx.transaction_type,
        tx.main_category,
        tx.sub_category,
        mainCategories,
        subCategories,
      ),
    );
  } else if (hasChildren && !hasSplits) {
    // 有附加、无分账的情况(出口=默认合并策略)
    exitSplits.forEach((split) => {
      // 出口名称不为空
      if (!tx.name?.trim()) hint.push(`账户为${split.account.name}的交易: 名称不能为空`);
      // 主类别、子类别不为空且联合校验通过
      hint.push(
        ...validateCategoryChain(
          split.transaction_type,
          split.main_category,
          split.sub_category,
          mainCategories,
          subCategories,
        ).map((h) => `账户"${split.account.name}"的交易: ${h}`),
      );
    });
  } else {
    // 有分账的情况(出口以分账为准)
    tx.splits?.forEach((split, i) => {
      const p = `分账[${i + 1}]: `;
      // 根交易名称不为空 或 分账名称不为空
      if (!tx.name?.trim() && !split.name?.trim()) hint.push(`${p}名称不能为空`);
      // 主类别、子类别不为空且联合校验通过
      hint.push(
        ...validateCategoryChain(
          split.transaction_type,
          split.main_category,
          split.sub_category,
          mainCategories,
          subCategories,
        ).map((h) => `${p}${h}`),
      );
    });
  }

  return { valid: hint.length === 0, hint };
}

/**
 * 校验是否为警示交易
 */
export function isWarningTransaction(
  tx: TransactionWithRelations,
  childrenTx: TransactionWithRelations[],
  appData: AppDataValue,
): ValidationResult {
  const hints: string[] = [];

  // 1. 提示入口记录数=1时，分账=1
  const entranceCount = 1 + childrenTx.length;
  const splitCount = tx.splits?.length ?? 0;
  if (entranceCount == 1 && splitCount == 1) {
    hints.push("该账单经过分账修改");
  }

  // 2. original_amount非null且与amount不一致
  if (
    tx.original_amount != null &&
    amountToCents(tx.amount) !== amountToCents(tx.original_amount)
  ) {
    hints.push(`金额已修改，原金额为￥${tx.original_amount}`);
  }

  // 3. 入口账户金额与出口账户金额不一致
  const entranceRecords = [tx, ...childrenTx];
  const entranceAccountMap = new Map<string, number>();
  entranceRecords.forEach((record) => {
    if (record.account?.name) {
      const accountName = record.account.name;
      const cents = amountToCents(calculateAmount(record));
      entranceAccountMap.set(accountName, (entranceAccountMap.get(accountName) ?? 0) + cents);
    }
  });

  const exitSplits = getExitSplits(tx, childrenTx);
  const exitAccountMap = new Map<string, number>();
  exitSplits.forEach((split) => {
    if (split.account?.name) {
      const accountName = split.account.name;
      const cents = amountToCents(calculateAmount(split));
      exitAccountMap.set(accountName, (exitAccountMap.get(accountName) ?? 0) + cents);
    }
  });

  const allAccountNames = new Set([
    ...Array.from(entranceAccountMap.keys()),
    ...Array.from(exitAccountMap.keys()),
  ]);
  allAccountNames.forEach((accountName) => {
    const entranceCents = entranceAccountMap.get(accountName) ?? 0;
    const exitCents = exitAccountMap.get(accountName) ?? 0;
    if (entranceCents !== exitCents) {
      hints.push(
        `账户${accountName}的金额发生变化，原金额￥${(entranceCents / 100).toFixed(2)}，现金额￥${(exitCents / 100).toFixed(2)}`,
      );
    }
  });

  // 4. 有附加 无分账的情况（出口=默认合并策略）
  exitSplits.forEach((split) => {
    // 出口名称与根交易名称不一致
    if (tx.name?.trim() && split.name?.trim() && tx.name.trim() !== split.name.trim())
      hints.push(`账户为${split.account.name}的交易: 将会导出为名称"${split.name.trim()}"`);
  });

  // 5. 合法判定
  hints.push(...isValidTransaction(tx, childrenTx, appData).hint);

  return { valid: hints.length === 0, hint: hints };
}
