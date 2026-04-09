"use client";

import type { TransactionStatus } from "@/types";
import type { SortOrder } from "@/lib/hooks/use-transaction-filter";

import React, { useMemo } from "react";
import { Button } from "@heroui/react";
import { Chip } from "@heroui/react";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
} from "@heroui/react";
import { CheckIcon } from "@heroicons/react/24/outline";
import { FunnelIcon as FunnelIconSolid } from "@heroicons/react/24/solid";
import { FunnelIcon } from "@heroicons/react/24/outline";

import { useTransactionStore } from "@/components/context/transaction-store-context";
import { ALL_TRANSACTION_STATUS } from "@/constants/transaction-status";

interface StatusFilterDropdownProps {
  statusFilter: TransactionStatus | "all";
  onStatusFilterChange: (status: TransactionStatus | "all") => void;
  sortOrder: SortOrder;
  onSortOrderChange: (order: SortOrder) => void;
}

export function StatusFilterDropdown({
  statusFilter,
  onStatusFilterChange,
  sortOrder,
  onSortOrderChange,
}: StatusFilterDropdownProps) {
  const { transactions } = useTransactionStore();

  const stats = useMemo(() => {
    const counts: Record<TransactionStatus, number> = {} as Record<TransactionStatus, number>;
    transactions.forEach((tx) => {
      if (tx.status) {
        counts[tx.status] = (counts[tx.status] || 0) + 1;
      }
    });
    return counts;
  }, [transactions]);

  const totalCount = Object.values(stats).reduce((sum, count) => sum + count, 0);

  const isActive = statusFilter !== "all" || sortOrder !== "newest";

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button isIconOnly size="sm" variant="bordered" className="min-w-8 h-8">
          {isActive ? (
            <FunnelIconSolid className="w-4 h-4 text-primary" />
          ) : (
            <FunnelIcon className="w-4 h-4" />
          )}
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="过滤与排序"
        onAction={(key) => {
          if (key === "newest" || key === "oldest") {
            onSortOrderChange(key as SortOrder);
          } else {
            onStatusFilterChange(key as TransactionStatus | "all");
          }
        }}
      >
        <DropdownSection title="状态" showDivider>
          <>
            <DropdownItem
              key="all"
              startContent={
                statusFilter === "all" ? (
                  <CheckIcon className="w-4 h-4" />
                ) : (
                  <span className="w-4" />
                )
              }
            >
              <div className="flex items-center justify-between w-full gap-4">
                <span>所有状态</span>
                <Chip size="sm" color="default" variant="flat">
                  {totalCount}
                </Chip>
              </div>
            </DropdownItem>
            {ALL_TRANSACTION_STATUS.map((status) => {
              return (
                <DropdownItem
                  key={status.name}
                  startContent={
                    statusFilter === status.name ? (
                      <CheckIcon className="w-4 h-4" />
                    ) : (
                      <span className="w-4" />
                    )
                  }
                >
                  <div className="flex items-center justify-between w-full gap-4">
                    <span>{status.name}</span>
                    <Chip size="sm" color={status.chipColor} variant="flat">
                      {stats[status.name] || 0}
                    </Chip>
                  </div>
                </DropdownItem>
              );
            })}
          </>
        </DropdownSection>
        <DropdownSection title="排序">
          <DropdownItem
            key="newest"
            startContent={
              sortOrder === "newest" ? <CheckIcon className="w-4 h-4" /> : <span className="w-4" />
            }
          >
            从近到远
          </DropdownItem>
          <DropdownItem
            key="oldest"
            startContent={
              sortOrder === "oldest" ? <CheckIcon className="w-4 h-4" /> : <span className="w-4" />
            }
          >
            从远到近
          </DropdownItem>
        </DropdownSection>
      </DropdownMenu>
    </Dropdown>
  );
}
