import type { TransactionType } from "@/models";

export interface TransactionTypeOption {
  type: TransactionType;
  icon: string;
  back_color: string;
  fore_color: string;
}

export const TRANSACTION_TYPES: TransactionTypeOption[] = [
  { 
    type: "支出", 
    icon: "💸",
    back_color: "bg-emerald-100 dark:bg-emerald-900",
    fore_color: "text-emerald-800 dark:text-emerald-200"
  },
  { 
    type: "收入", 
    icon: "💰",
    back_color: "bg-red-100 dark:bg-red-900",
    fore_color: "text-red-800 dark:text-red-200"
  },
  { 
    type: "转出", 
    icon: "📤",
    back_color: "bg-cyan-100 dark:bg-cyan-900",
    fore_color: "text-cyan-800 dark:text-cyan-200"
  },
  { 
    type: "转入", 
    icon: "📥",
    back_color: "bg-cyan-100 dark:bg-cyan-900",
    fore_color: "text-cyan-800 dark:text-cyan-200"
  },
  { 
    type: "应收款项", 
    icon: "🧾",
    back_color: "bg-violet-100 dark:bg-violet-900",
    fore_color: "text-violet-800 dark:text-violet-200"
  },
  { 
    type: "应付款项", 
    icon: "🏦",
    back_color: "bg-orange-100 dark:bg-orange-900",
    fore_color: "text-orange-800 dark:text-orange-200"
  },
];

