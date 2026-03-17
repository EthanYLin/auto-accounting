import type { SplitHint } from "./use-action-bar-controller";
import { ExclamationTriangleIcon, InformationCircleIcon } from "@heroicons/react/24/outline";

interface SplitHintBadgeProps {
  splitHint?: SplitHint;
}

export function SplitHintBadge({ splitHint }: SplitHintBadgeProps) {
  if (!splitHint) {
    return null;
  }

  return (
    <div
      className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium ${
        splitHint.type === "warn"
          ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          : "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      }`}
    >
      {splitHint.type === "warn" ? (
        <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
      ) : (
        <InformationCircleIcon className="h-4 w-4 flex-shrink-0" />
      )}
      <span>{splitHint.message}</span>
    </div>
  );
}
