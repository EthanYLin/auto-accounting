// 分类相关类型定义
import type { TransactionType, MainCategory, SubCategory, BudgetType } from "@/types";

// ========== 状态机相关类型 ==========
export type CategoryState = {
  txType?: TransactionType;
  main?: string;
  sub?: string;
  budget?: string; // 改为 budget_type_id 的字符串表示
};

export type CategoryAction =
  | { type: "SET_TX"; tx: TransactionType }
  | { type: "SET_MAIN"; main: string }
  | { type: "SET_SUB"; sub: string }
  | { type: "SET_BUDGET"; budget: string | undefined }
  | { type: "AUTO" }; // 处理"只有一个选项则自动选择"

// ========== 分类配置类型 ==========
export interface CategoryConfig {
  label: string;
  icon: string;
  backColor: string;
  foreColor: string;
}

export interface SubCategoryConfig extends CategoryConfig {
  budget_type_id: number | null;
}

export interface MainCategoryConfig extends CategoryConfig {
  subs: SubCategoryConfig[];
}

export interface TypeCategoryConfig extends CategoryConfig {
  mains: MainCategoryConfig[];
}

// ========== 数据库查询函数（占位实现）==========
// TODO: 实现真正的数据库查询

/**
 * 获取指定交易类型的所有主类别
 */
export async function getMainCategories(type: TransactionType): Promise<MainCategory[]> {
  // TODO: 从数据库查询
  return [];
}

/**
 * 获取指定主类别的所有子类别
 */
export async function getSubCategories(
  type: TransactionType,
  mainCategoryId: number
): Promise<SubCategory[]> {
  // TODO: 从数据库查询
  return [];
}

/**
 * 获取特定子类别的详细信息
 */
export async function getSpecificSubCategory(
  subCategoryId: number
): Promise<SubCategory | null> {
  // TODO: 从数据库查询
  return null;
}

/**
 * 判断分类路径是否合法
 */
export function isValidCategoryPath(
  type: TransactionType,
  mainId: number,
  subId: number
): boolean {
  // TODO: 实现验证逻辑
  return true;
}

// ========== 状态机 Reducer ==========
// 自动选择辅助函数
async function autoSelectFromState(state: CategoryState): Promise<CategoryState> {
  // TODO: 实现自动选择逻辑
  return state;
}

export function categoryReducer(state: CategoryState, action: CategoryAction): CategoryState {
  switch (action.type) {
    case "SET_TX":
      return { txType: action.tx };

    case "SET_MAIN":
      return {
        ...state,
        main: action.main,
        sub: undefined,
        budget: undefined,
      };

    case "SET_SUB":
      return {
        ...state,
        sub: action.sub,
        // TODO: 从数据库获取 budget
      };

    case "SET_BUDGET":
      return { ...state, budget: action.budget };

    case "AUTO":
      // TODO: 实现自动选择逻辑
      return state;

    default:
      return state;
  }
}
