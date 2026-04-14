"use client";

import type { TransactionOverviewListHandle } from "./transaction-overview-list";
import type { useTransactionFilter } from "@/lib/hooks/use-transaction-filter";

import { useCallback, useEffect, useState } from "react";
import { Drawer, DrawerContent, Input, Kbd } from "@heroui/react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

import { StatusFilterDropdown } from "./status-filter-dropdown";
import { TransactionOverviewList } from "./transaction-overview-list";

import { useCommandListener } from "@/lib/commands";

interface TransactionSidebarProps {
  searchInputRef: React.RefObject<HTMLInputElement>;
  transactionListRef: React.RefObject<TransactionOverviewListHandle>;
  search: ReturnType<typeof useTransactionFilter>;
  currentTransactionId?: number;
  onSelectTransaction: (id: number) => void;
}

export function TransactionSidebar({
  searchInputRef,
  transactionListRef,
  search,
  currentTransactionId,
  onSelectTransaction,
}: TransactionSidebarProps) {
  const [open, setOpen] = useState(false);

  // 抽屉打开时自动定位到当前交易
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => {
      transactionListRef.current?.scrollToTransaction();
    });
    return () => cancelAnimationFrame(raf);
  }, [open, transactionListRef]);

  // 窗口拉宽到 md 以上时自动收起 overlay
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    const handler = () => {
      if (mql.matches) setOpen(false);
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  useCommandListener(
    "toggle-sidebar",
    useCallback(() => setOpen((v) => !v), []),
  );

  const close = useCallback(() => setOpen(false), []);

  const handleSelect = useCallback(
    (id: number) => {
      onSelectTransaction(id);
      setOpen(false);
    },
    [onSelectTransaction],
  );

  const content = (
    <aside className="flex h-full min-h-0 w-full flex-col bg-white dark:bg-[#1f1f1f]">
      <div className="shrink-0 border-b border-gray-200 p-3 md:p-4 dark:border-white/[0.07]">
        <div className="flex items-center gap-2">
          <Input
            ref={searchInputRef}
            placeholder="搜索名称, 金额..."
            value={search.searchQuery}
            onValueChange={search.setSearchQuery}
            startContent={<MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />}
            endContent={
              <Kbd keys={["command"]} className="hidden lg:inline-flex text-[10px]">
                K
              </Kbd>
            }
            variant="bordered"
            size="sm"
            className="flex-1"
          />
          <StatusFilterDropdown
            statusFilter={search.statusFilter}
            onStatusFilterChange={search.setStatusFilter}
            sortOrder={search.sortOrder}
            onSortOrderChange={search.setSortOrder}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <TransactionOverviewList
          ref={transactionListRef}
          currentId={currentTransactionId}
          onSelectTransaction={handleSelect}
          filteredTransactions={search.filteredTransactions}
          isFiltered={search.isFiltered}
          onClearFilters={search.clearFilters}
        />
      </div>
    </aside>
  );

  return (
    <>
      {/* md 以上：固定侧栏（md 缩窄 w-64，lg 恢复 w-80） */}
      <div className="hidden md:flex md:w-64 lg:w-80 h-full min-h-0 flex-shrink-0 border-r border-gray-200 dark:border-white/[0.07]">
        {content}
      </div>

      {/* md 以下：Drawer 抽屉 */}
      <Drawer
        isOpen={open}
        placement="left"
        hideCloseButton
        className="md:hidden w-80"
        onOpenChange={(isOpen) => {
          if (!isOpen) close();
        }}
      >
        <DrawerContent>{content}</DrawerContent>
      </Drawer>
    </>
  );
}
