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

// ========== 枚举类型 ==========
export type TransactionStatus = Enums<'transaction_status'>;
export type TransactionType = Enums<'transaction_type'>;

// ========== 辅助类型 ==========
// 带关联数据的交易类型
export type TransactionWithRelations = Transaction & {
  account?: Account;
  main_category?: MainCategory;
  sub_category?: SubCategory;
  budget_type?: BudgetType;
  parent?: TransactionWithRelations;
  splits?: TransactionSplit[];
};
