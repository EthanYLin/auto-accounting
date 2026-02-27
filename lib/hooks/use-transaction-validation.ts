
import type {
  TransactionWithRelations,
  TransactionSplitWithRelations,
  MainCategory,
  SubCategory,
  Account,
  BudgetType,
} from '@/types';
import { useAppData } from '@/components/context/app-data-context';
import { getExitSplits } from '@/lib/transaction-funcs';

// ==================== 类型 ====================

export type ValidationResult = { valid: boolean; hint: string[] };

// ==================== 内部校验工具 ====================

/**
 * 校验主类别 + 子类别联合有效性
 * - 主/子类别存在且在有效列表中
 * - 子类别隶属于主类别
 * - 主类别的 transaction_type 与传入的收支类型一致
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
    hints.push('主类别不能为空');
    return hints;
  }
  if (!mainCategories.some(m => m.id === mainCategory.id)) {
    hints.push('主类别不在有效列表中');
  }
  if (transactionType && mainCategory.transaction_type !== transactionType) {
    hints.push('主类别与收支类型不匹配');
  }

  if (!subCategory) {
    hints.push('子类别不能为空');
    return hints;
  }
  if (!subCategories.some(s => s.id === subCategory.id)) {
    hints.push('子类别不在有效列表中');
  }
  if (subCategory.main_category_id !== mainCategory.id) {
    hints.push('子类别与主类别不匹配');
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
  if (!accounts.some(a => a.id === account.id)) return [`${prefix}账户不在有效列表中`];
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
  if (budgetType && !budgetTypes.some(b => b.id === budgetType.id)) {
    return [`${prefix}预算计划不在有效列表中`];
  }
  return [];
}

// ==================== Hook ====================

/**
 * 提供 isValidTransaction / isWarningTransaction 校验函数。
 */
export function useTransactionValidation() {
  const { accounts, mainCategories, subCategories, budgetTypes } = useAppData();

  function isValidTransaction(tx: TransactionWithRelations): ValidationResult {
    const hint: string[] = [];

    // ========== (0) 基本判定 ==========

    // 1. 账户不为空且在枚举中
    hint.push(...validateAccount(tx.account, accounts, ''));

    // 2. 金额非负数
    if (tx.amount < 0) {
      hint.push('金额不能为负数');
    }

    // 3. 日期时间不为空且合法
    if (!tx.datetime) {
      hint.push('日期时间不能为空');
    } else if (isNaN(new Date(tx.datetime).getTime())) {
      hint.push('日期时间格式不合法');
    }

    // 4. 名称不为空
    if (!tx.name?.trim()) {
      hint.push('名称不能为空');
    }

    // 5. 收支类型不为空
    if (!tx.transaction_type) {
      hint.push('收支类型不能为空');
    }

    // 6. 主类别、子类别不为空且联合校验通过
    hint.push(
      ...validateCategoryChain(
        tx.transaction_type,
        tx.main_category,
        tx.sub_category,
        mainCategories,
        subCategories,
      ),
    );

    // 7. 预算计划为空或枚举值
    hint.push(...validateBudgetType(tx.budget_type, budgetTypes, ''));

    // ========== (1) 附加判定 ==========

    if (tx.status === '附加到其他交易') {
      // A. 有父ID、无子记录、不允许分账
      if (!tx.parent) {
        hint.push('该附加交易必须有父交易');
      }
      if (tx.children?.length > 0) {
        hint.push('该附加交易不允许有子交易');
      }
      if (tx.splits && tx.splits.length > 0) {
        hint.push('该附加交易不允许分账');
      }
    } else {
      // B. 非附加：无父ID
      if (tx.parent) {
        hint.push('非附加交易不应有父交易');
      }
      if (tx.children?.length > 0) {
        // 若有子记录，所有子记录状态必须为"附加到其他交易"
        const invalid = tx.children.filter(c => c.status !== '附加到其他交易');
        if (invalid.length > 0) {
          hint.push(`存在 ${invalid.length} 条子交易状态不是"附加到其他交易"`);
        }
        // 递归校验子记录
        tx.children.forEach((child, i) => {
          const childResult = isValidTransaction(child);
          if (!childResult.valid) {
            hint.push(`子交易[${i + 1}]校验未通过: ${childResult.hint.join('; ')}`);
          }
        });
      }
    }

    // ========== (2) 分账判定 ==========
    
    // 若有子交易，则该交易必须分账
    if (tx.children?.length > 0 && (!tx.splits || tx.splits.length === 0)) {
      hint.push('存在子交易时必须分账');
    }

    if (tx.splits && tx.splits.length > 1) {
      tx.splits.forEach((split, i) => {
        const p = `分账[${i + 1}]: `;

        // 1. 金额非负数
        if (split.amount < 0) {
          hint.push(`${p}金额不能为负数`);
        }

        // 2. 主类别-子类别联合校验
        hint.push(
          ...validateCategoryChain(
            split.transaction_type,
            split.main_category,
            split.sub_category,
            mainCategories,
            subCategories,
          ).map(h => `${p}${h}`),
        );

        // 3. 预算计划为空或枚举
        hint.push(...validateBudgetType(split.budget_type, budgetTypes, p));

        // 4. 收支类型不为空
        if (!split.transaction_type) {
          hint.push(`${p}收支类型不能为空`);
        }

        // 5. 名称不为空
        if (!split.name?.trim()) {
          hint.push(`${p}名称不能为空`);
        }

        // 6. 账户不为空且在枚举中
        hint.push(...validateAccount(split.account, accounts, p));
      });
    }

    // ========== (3) 转账判定 ==========

    const exitSplits = getExitSplits(tx);
    const inList = exitSplits.filter(s => s.transaction_type === '转入');
    const outList = exitSplits.filter(s => s.transaction_type === '转出');

    if (inList.length > 0 || outList.length > 0) {
      // 存在转账类条目时才校验
      if (inList.length !== 1 || outList.length !== 1) {
        hint.push('转账必须恰好包含一条转入和一条转出记录');
      } else {
        // 金额必须相同
        if (inList[0].amount !== outList[0].amount) {
          hint.push('转入与转出金额必须相同');
        }
        // 账户必须不同
        if (inList[0].account?.id === outList[0].account?.id) {
          hint.push('转入与转出账户不能相同');
        }
      }
    }

    return { valid: hint.length === 0, hint };
  }

  function isWarningTransaction(tx: TransactionWithRelations): ValidationResult {
    
    // 1. 提示入口记录数>1或者出口数>1
    const hints: string[] = [];
    if (tx.splits?.length ?? 0 >= 2) {
      hints.push(`该账单会拆分为${tx.splits?.length ?? 0}条记录`);
    } else if (tx.children?.length ?? 0 > 0) {
      hints.push(`该账单会合并为1条记录`);
    }

    // 2. original_amount非null且与amount不一致
    if (tx.original_amount != null && tx.amount !== tx.original_amount) {
      hints.push(`金额已修改，原金额为￥${tx.original_amount}`);
    }

    // 3. 入口账户金额与出口账户金额不一致
    // 入口处各账户金额
    const entranceRecords = [tx, ...tx.children ?? []];
    const entranceAccountMap = new Map<string, number>();
    entranceRecords.forEach(record => {
      if (record.account?.name) {
        const accountName = record.account.name;
        entranceAccountMap.set(accountName, (entranceAccountMap.get(accountName) ?? 0) + record.amount);
      }
    });
    // 出口处各账户金额
    const exitSplits = getExitSplits(tx);
    const exitAccountMap = new Map<string, number>();
    exitSplits.forEach(split => {
      if (split.account?.name) {
        const accountName = split.account.name;
        exitAccountMap.set(accountName, (exitAccountMap.get(accountName) ?? 0) + split.amount);
      }
    });
    // 对比入口与出口账户金额（取两侧账户名的并集，避免漏掉只在一侧出现的账户）
    const allAccountNames = new Set([...Array.from(entranceAccountMap.keys()), ...Array.from(exitAccountMap.keys())]);
    allAccountNames.forEach(accountName => {
      const entranceAmount = entranceAccountMap.get(accountName) ?? 0;
      const exitAmount = exitAccountMap.get(accountName) ?? 0;
      if (entranceAmount !== exitAmount) {
        hints.push(`账户${accountName}的金额发生变化，原金额￥${entranceAmount}，现金额￥${exitAmount}`);
      }
    });

    // 4. 合法判定
    hints.push(...(isValidTransaction(tx).hint));  
    return { valid: hints.length === 0, hint: hints };
  }

  return { isValidTransaction, isWarningTransaction };
}
