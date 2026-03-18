"use client";

import type { TransactionNavigation } from "@/lib/hooks/use-transaction-navigation";

import { NavigationControls } from "./navigation-controls";
import { PrimarySaveButton } from "./primary-save-button";
import { QuickActionsDropdownButton } from "./quick-actions-dropdown-button";
import { SplitHintBadge } from "./split-hint-badge";
import { TransactionStatusBadge } from "./transaction-status-badge";
import { useActionBarController } from "./use-action-bar-controller";

export interface ActionBarProps {
  navigation: TransactionNavigation;
}

export function ActionBar({ navigation }: ActionBarProps) {
  const controller = useActionBarController({ navigation });

  return (
    <div className="sticky top-0 z-30 border-b border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <NavigationControls
              currentIndex={controller.currentIndex}
              totalCount={controller.totalCount}
              onPrev={controller.goToPrevious}
              onNext={controller.goToNext}
              onGoToIndex={controller.goToIndex}
              onLocateCurrent={navigation.locateCurrent}
            />

            <PrimarySaveButton
              saveButtonOverride={controller.saveButtonOverride}
              disabled={controller.isPrimaryActionDisabled}
              onPress={controller.handlePrimaryAction}
            />

            <QuickActionsDropdownButton
              currentQuickActionIcon={controller.currentQuickActionIcon}
              currentQuickActionLabel={controller.currentQuickActionLabel}
              autoSwitch={controller.autoSwitch}
              dirtyCount={controller.dirtyCount}
              disabledKeys={controller.disabledKeys}
              isCurrentQuickActionDisabled={controller.isCurrentQuickActionDisabled}
              dangerConfirm={controller.dangerConfirm}
              onCurrentQuickAction={controller.handleCurrentQuickAction}
              onDropdownAction={controller.handleDropdownAction}
            />

            <SplitHintBadge splitHint={controller.splitHint} />
          </div>

          <TransactionStatusBadge status={controller.status} />
        </div>
      </div>
    </div>
  );
}
