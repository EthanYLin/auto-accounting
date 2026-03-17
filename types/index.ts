import { SVGProps } from "react";
import type { Database, Tables, TablesInsert, TablesUpdate, Enums } from "@/types/database.types";

export type IconSvgProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

// ========== 导出 Database 相关类型 ==========
export type { Database, Tables, TablesInsert, TablesUpdate, Enums };

// ========== 类型别名 ==========
// 交易相关
export type Transaction = Tables<'transaction'>;
export type TransactionInsert = TablesInsert<'transaction'>;
export type TransactionUpdate = TablesUpdate<'transaction'>;

// 账户相关
export type Account = Tables<'account'>;
export type AccountInsert = TablesInsert<'account'>;
export type AccountUpdate = TablesUpdate<'account'>;

// 分类相关
export type MainCategory = Tables<'main_category'>;
export type MainCategoryInsert = TablesInsert<'main_category'>;
export type MainCategoryUpdate = TablesUpdate<'main_category'>;

export type SubCategory = Tables<'sub_category'>;
export type SubCategoryInsert = TablesInsert<'sub_category'>;
export type SubCategoryUpdate = TablesUpdate<'sub_category'>;

// 预算类型
export type BudgetType = Tables<'budget_type'>;
export type BudgetTypeInsert = TablesInsert<'budget_type'>;
export type BudgetTypeUpdate = TablesUpdate<'budget_type'>;

// 分账相关
export type TransactionSplit = Tables<'transaction_split'>;
export type TransactionSplitInsert = TablesInsert<'transaction_split'>;
export type TransactionSplitUpdate = TablesUpdate<'transaction_split'>;

// 匹配规则相关
export type MatchingRule = Tables<'matching_rule'>;
export type MatchingRuleInsert = TablesInsert<'matching_rule'>;
export type MatchingRuleUpdate = TablesUpdate<'matching_rule'>;

// App 基础数据
export interface AppDataValue {
  accounts: Account[];
  mainCategories: MainCategory[];
  subCategories: SubCategory[];
  budgetTypes: BudgetType[];
  matchingRules: MatchingRule[];
}

// ========== 枚举类型 ==========
export type TransactionStatus = Enums<'transaction_status'>;
export type TransactionType = Enums<'transaction_type'>;

// ========== 辅助类型 ==========
// 带关联数据的交易类型
export type TransactionWithRelations = Omit<
  Transaction,
  'account_id' | 'main_category_id' | 'sub_category_id' | 'budget_type_id'
> & {
  account: Account;
  main_category?: MainCategory;
  sub_category?: SubCategory;
  budget_type?: BudgetType;
  children_ids: number[];
  splits?: TransactionSplitWithRelations[];
};

export type TransactionContentDraft = Omit<
  TransactionWithRelations,
  'parent_id' | 'children_ids'
>;

// 带关联数据的交易拆账类型
export type TransactionSplitWithRelations = Omit<
  TransactionSplit,
  'account_id' | 'main_category_id' | 'sub_category_id' | 'budget_type_id' | 'transaction_id'
> & {
  account: Account; 
  main_category?: MainCategory;
  sub_category?: SubCategory;
  budget_type?: BudgetType;
};

// ========== 用于批量创建的数据结构 ==========
/** 用于创建新拆账记录的数据结构（不含 id、user_id） */
export type NewTransactionSplitData = Omit<TransactionSplitWithRelations, 'id' | 'user_id'>;

/** 
 * 用于批量创建交易的数据结构（不含 id、parent_id、user_id）
 * - 通过 splits 添加拆账记录
 * - 通过 children 直接嵌套子交易，子交易的 splits 会被处理，children 会被忽略
 */
export type NewTransactionData = Omit<
  TransactionWithRelations,
  'id' | 'parent_id' | 'user_id' | 'children_ids' | 'splits'
> & {
  splits?: NewTransactionSplitData[];
  children?: NewTransactionData[];
};
