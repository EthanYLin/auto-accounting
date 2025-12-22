import type { TransactionType, TransactionStatus } from "@/types";

export interface TransactionTypeOption {
  type: TransactionType;
  icon: string;
  back_color: string;
  fore_color: string;
  sign: number;
}

export const TRANSACTION_TYPES: TransactionTypeOption[] = [
  { 
    type: "支出", 
    icon: "💸",
    back_color: "bg-emerald-100 dark:bg-emerald-900",
    fore_color: "text-emerald-800 dark:text-emerald-200",
    sign: -1
  },
  { 
    type: "收入", 
    icon: "💰",
    back_color: "bg-red-100 dark:bg-red-900",
    fore_color: "text-red-800 dark:text-red-200",
    sign: 1
  },
  { 
    type: "转出", 
    icon: "📤",
    back_color: "bg-cyan-100 dark:bg-cyan-900",
    fore_color: "text-cyan-800 dark:text-cyan-200",
    sign: -1
  },
  { 
    type: "转入", 
    icon: "📥",
    back_color: "bg-cyan-100 dark:bg-cyan-900",
    fore_color: "text-cyan-800 dark:text-cyan-200",
    sign: 1
  },
  { 
    type: "应收款项", 
    icon: "🧾",
    back_color: "bg-violet-100 dark:bg-violet-900",
    fore_color: "text-violet-800 dark:text-violet-200",
    sign: -1
  },
  { 
    type: "应付款项", 
    icon: "🏦",
    back_color: "bg-orange-100 dark:bg-orange-900",
    fore_color: "text-orange-800 dark:text-orange-200",
    sign: 1
  },
];

// 交易状态颜色映射
export const TRANSACTION_STATUS_COLORS: Record<TransactionStatus, "primary" | "danger" | "warning" | "default" | "success"> = {
  "待处理": "primary",
  "经自动处理取消": "danger",
  "经自动处理填写": "primary",
  "稍后处理": "warning",
  "取消": "default",
  "附加到其他交易": "default",
  "已完成": "success",
};
