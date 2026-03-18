import type { TransactionStatus } from "@/types";

export interface TransactionStatusConfig {
  name: TransactionStatus;
  chipColor: "primary" | "danger" | "warning" | "default" | "success";
  color: string;
  dotColor: string;
  bgColor: string;
}

// 交易状态配置
export const ALL_TRANSACTION_STATUS: Array<TransactionStatusConfig> = [
  {
    name: "待处理",
    chipColor: "primary",
    color: "text-blue-700 dark:text-blue-400",
    dotColor: "bg-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-500/10",
  },
  {
    name: "稍后处理",
    chipColor: "warning",
    color: "text-amber-700 dark:text-amber-400",
    dotColor: "bg-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-500/10",
  },
  {
    name: "经自动处理填写",
    chipColor: "primary",
    color: "text-blue-700 dark:text-blue-400",
    dotColor: "bg-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-500/10",
  },
  {
    name: "经自动处理取消",
    chipColor: "danger",
    color: "text-red-700 dark:text-red-400",
    dotColor: "bg-red-500",
    bgColor: "bg-red-50 dark:bg-red-500/10",
  },
  {
    name: "已完成",
    chipColor: "success",
    color: "text-green-700 dark:text-green-400",
    dotColor: "bg-green-500",
    bgColor: "bg-green-50 dark:bg-green-500/10",
  },
  {
    name: "取消",
    chipColor: "default",
    color: "text-gray-600 dark:text-gray-400",
    dotColor: "bg-gray-400",
    bgColor: "bg-gray-50 dark:bg-gray-500/10",
  },
  {
    name: "附加到其他交易",
    chipColor: "default",
    color: "text-gray-600 dark:text-gray-400",
    dotColor: "bg-gray-400",
    bgColor: "bg-gray-50 dark:bg-gray-500/10",
  },
];
