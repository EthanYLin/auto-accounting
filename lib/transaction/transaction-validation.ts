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

import { calculateAmount } from "@/lib/transaction/transaction-display";
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

  // ========== (0) 基本判定 ==========

  // 1. 账户不为空且在枚举中
  hint.push(...validateAccount(tx.account, accounts, ""));

  // 2. 金额非负数
  if (tx.amount < 0) {
    hint.push("金额不能为负数");
  }

  // 3. 日期时间不为空且合法
  if (!tx.datetime) {
    hint.push("日期时间不能为空");
  } else if (isNaN(new Date(tx.datetime).getTime())) {
    hint.push("日期时间格式不合法");
  }

  // 4. 名称不为空
  if (!isChildTransaction && !tx.name?.trim()) {
    hint.push("名称不能为空");
  }

  // 5. 收支类型不为空
  if (!tx.transaction_type) {
    hint.push("收支类型不能为空");
  }

  // 6. 主类别、子类别不为空且联合校验通过
  if (!isChildTransaction) {
    hint.push(
      ...validateCategoryChain(
        tx.transaction_type,
        tx.main_category,
        tx.sub_category,
        mainCategories,
        subCategories,
      ),
    );
  }

  // 7. 预算计划为空或枚举值
  hint.push(...validateBudgetType(tx.budget_type, budgetTypes, ""));

  // ========== (1) 附加判定 ==========

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
      if (child.children_ids.length > 0) {
        hint.push(`子交易[${i + 1}]不允许再有子交易`);
      }
      const childResult = isValidTransaction(child, [], appData);
      if (!childResult.valid) {
        hint.push(`子交易[${i + 1}]: ${childResult.hint.join("; ")}`);
      }
    });
  }

  // ========== (2) 分账判定 ==========

  if (tx.splits) {
    tx.splits.forEach((split, i) => {
      const p = `分账[${i + 1}]: `;

      if (split.amount < 0) {
        hint.push(`${p}金额不能为负数`);
      }

      hint.push(
        ...validateCategoryChain(
          split.transaction_type,
          split.main_category,
          split.sub_category,
          mainCategories,
          subCategories,
        ).map((h) => `${p}${h}`),
      );

      hint.push(...validateBudgetType(split.budget_type, budgetTypes, p));

      if (!split.transaction_type) {
        hint.push(`${p}收支类型不能为空`);
      }

      hint.push(...validateAccount(split.account, accounts, p));
    });
  }

  // ========== (3) 转账判定 ==========

  if (!isChildTransaction) {
    const exitSplits = getExitSplits(tx, childrenTx);
    const inList = exitSplits.filter((s) => s.transaction_type === "转入");
    const outList = exitSplits.filter((s) => s.transaction_type === "转出");
    if (inList.length > 0 || outList.length > 0) {
      if (inList.length !== 1 || outList.length !== 1) {
        hint.push("转账必须恰好包含一条转入和一条转出记录");
      } else {
        if (inList[0].amount !== outList[0].amount) {
          hint.push("转入与转出金额必须相同");
        }
        if (inList[0].account?.id === outList[0].account?.id) {
          hint.push("转入与转出账户不能相同");
        }
      }
    }
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

  // 1. 提示入口记录数>1或者出口数>1
  const entranceCount = 1 + childrenTx.length;
  const exitCount = tx.splits?.length ?? 0;
  if (entranceCount == 1 && exitCount == 1) {
    hints.push("该账单经过分账修改");
  }

  // 2. original_amount非null且与amount不一致
  if (tx.original_amount != null && tx.amount !== tx.original_amount) {
    hints.push(`金额已修改，原金额为￥${tx.original_amount}`);
  }

  // 3. 入口账户金额与出口账户金额不一致
  const entranceRecords = [tx, ...childrenTx];
  const entranceAccountMap = new Map<string, number>();
  entranceRecords.forEach((record) => {
    if (record.account?.name) {
      const accountName = record.account.name;
      const amount = calculateAmount(record);
      entranceAccountMap.set(accountName, (entranceAccountMap.get(accountName) ?? 0) + amount);
    }
  });

  const exitSplits = getExitSplits(tx, childrenTx);
  const exitAccountMap = new Map<string, number>();
  exitSplits.forEach((split) => {
    if (split.account?.name) {
      const accountName = split.account.name;
      const amount = calculateAmount(split);
      exitAccountMap.set(accountName, (exitAccountMap.get(accountName) ?? 0) + amount);
    }
  });

  const allAccountNames = new Set([
    ...Array.from(entranceAccountMap.keys()),
    ...Array.from(exitAccountMap.keys()),
  ]);
  allAccountNames.forEach((accountName) => {
    const entranceAmount = entranceAccountMap.get(accountName) ?? 0;
    const exitAmount = exitAccountMap.get(accountName) ?? 0;
    if (entranceAmount !== exitAmount) {
      hints.push(
        `账户${accountName}的金额发生变化，原金额￥${entranceAmount}，现金额￥${exitAmount}`,
      );
    }
  });

  // 4. 合法判定
  hints.push(...isValidTransaction(tx, childrenTx, appData).hint);

  return { valid: hints.length === 0, hint: hints };
}
