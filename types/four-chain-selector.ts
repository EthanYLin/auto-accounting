import type { TransactionType, MainCategory, SubCategory, BudgetType } from "@/types";

// 四联选择器状态类型
export type FourChainState = {
  txType?: TransactionType;
  main?: string;
  sub?: string;
  budget?: string;
};

// 四联选择器动作类型
export type FourChainAction =
  | { type: "SET_TX"; tx: TransactionType | undefined }
  | { type: "SET_MAIN"; main: string | undefined }
  | { type: "SET_SUB"; sub: string | undefined }
  | { type: "SET_BUDGET"; budget: string | undefined }
  | { type: "RESET_CHAIN"; from: "main" | "sub" | "budget" };

// 四联选择器reducer
export function fourChainReducer(state: FourChainState, action: FourChainAction): FourChainState {
  switch (action.type) {
    case "SET_TX":
      return {
        txType: action.tx,
        // 清除下游选择
        main: undefined,
        sub: undefined,
        budget: undefined,
      };

    case "SET_MAIN":
      return {
        ...state,
        main: action.main,
        // 清除下游选择
        sub: undefined,
        budget: undefined,
      };

    case "SET_SUB":
      return {
        ...state,
        sub: action.sub,
        // 预算计划可以被自动设置，但用户也可以手动调整，所以不清空
      };

    case "SET_BUDGET":
      return {
        ...state,
        budget: action.budget,
      };

    case "RESET_CHAIN":
      switch (action.from) {
        case "main":
          return {
            ...state,
            main: undefined,
            sub: undefined,
            budget: undefined,
          };
        case "sub":
          return {
            ...state,
            sub: undefined,
            budget: undefined,
          };
        case "budget":
          return {
            ...state,
            budget: undefined,
          };
        default:
          return state;
      }

    default:
      return state;
  }
}

// 四联选择器的完整选择结果类型
export type FourChainSelection = {
  txType: TransactionType;
  mainCategory: MainCategory;
  subCategory: SubCategory;
  budgetType?: BudgetType;
} | null;