import { TransactionStatusConfig } from "@/constants/transaction-status";

interface TransactionStatusBadgeProps {
  status: TransactionStatusConfig | null;
}

export function TransactionStatusBadge({ status }: TransactionStatusBadgeProps) {
  if (!status) {
    return null;
  }

  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-3 transition-colors ${status.bgColor} py-1.5 lg:py-1.5 h-8 lg:h-auto`}
    >
      <div className="relative">
        <div className={`h-2 w-2 rounded-full ${status.dotColor} shadow-sm`} />
        <div className={`absolute inset-0 h-2 w-2 rounded-full ${status.dotColor} opacity-75`} />
      </div>

      {/* 桌面端显示文字 */}
      <span className={`hidden lg:inline text-sm font-medium ${status.color}`}>{status.name}</span>
    </div>
  );
}
