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
      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 transition-colors ${status.bgColor}`}
    >
      <div className="relative">
        <div className={`h-2 w-2 rounded-full ${status.dotColor} shadow-sm`} />
        <div className={`absolute inset-0 h-2 w-2 rounded-full ${status.dotColor} opacity-75`} />
      </div>
      <span className={`text-sm font-medium ${status.color}`}>{status.name}</span>
    </div>
  );
}
