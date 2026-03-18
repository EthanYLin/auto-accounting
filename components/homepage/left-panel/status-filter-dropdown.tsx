"use client";

import type { TransactionStatus } from "@/types";

import React, { useMemo } from "react";
import { Button } from "@heroui/react";
import { Chip } from "@heroui/react";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/react";
import { CheckIcon } from "@heroicons/react/24/outline";
import { FunnelIcon as FunnelIconSolid } from "@heroicons/react/24/solid";
import { FunnelIcon } from "@heroicons/react/24/outline";

import { useTransactionStore } from "@/components/context/transaction-store-context";
import { ALL_TRANSACTION_STATUS } from "@/constants/transaction-status";

interface StatusFilterDropdownProps {
  statusFilter: TransactionStatus | "all";
  onStatusFilterChange: (status: TransactionStatus | "all") => void;
}

export function StatusFilterDropdown({
  statusFilter,
  onStatusFilterChange,
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

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button isIconOnly size="sm" variant="bordered" className="min-w-8 h-8">
          {statusFilter !== "all" ? (
            <FunnelIconSolid className="w-4 h-4 text-primary" />
          ) : (
            <FunnelIcon className="w-4 h-4" />
          )}
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="状态过滤"
        onAction={(key) => {
          onStatusFilterChange(key as TransactionStatus | "all");
        }}
      >
        <>
          <DropdownItem
            key="all"
            startContent={
              statusFilter === "all" ? <CheckIcon className="w-4 h-4" /> : <span className="w-4" />
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
      </DropdownMenu>
    </Dropdown>
  );
}
