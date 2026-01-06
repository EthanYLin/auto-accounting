'use client';

import React, { useMemo } from 'react';
import { Button } from '@heroui/button';
import { Chip } from '@heroui/chip';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/dropdown';
import { FunnelIcon, CheckIcon } from '@heroicons/react/24/outline';
import type { TransactionStatus } from '@/types';
import { useTransactionCache } from '@/components/context/transaction-cache-context';

interface StatusFilterDropdownProps {
  statusFilter: TransactionStatus | 'all';
  onStatusFilterChange: (status: TransactionStatus | 'all') => void;
}

export function StatusFilterDropdown({
  statusFilter,
  onStatusFilterChange,
}: StatusFilterDropdownProps) {
  const { transactions } = useTransactionCache();

  const stats = useMemo(() => {
    const counts: Record<TransactionStatus, number> = {} as Record<TransactionStatus, number>;
    transactions.forEach(tx => {
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
        <Button 
          isIconOnly 
          size="sm" 
          variant="bordered"
          className="min-w-8 h-8"
        >
          <FunnelIcon className="w-4 h-4" />
        </Button>
      </DropdownTrigger>
      <DropdownMenu 
        aria-label="状态过滤"
        onAction={(key) => {
          onStatusFilterChange(key as TransactionStatus | 'all');
        }}
      >
        <DropdownItem 
          key="all"
          startContent={statusFilter === "all" ? <CheckIcon className="w-4 h-4" /> : <span className="w-4" />}
        >
          <div className="flex items-center justify-between w-full gap-4">
            <span>所有状态</span>
            <Chip size="sm" color="default" variant="flat">{totalCount}</Chip>
          </div>
        </DropdownItem>
        <DropdownItem 
          key="待处理"
          startContent={statusFilter === "待处理" ? <CheckIcon className="w-4 h-4" /> : <span className="w-4" />}
        >
          <div className="flex items-center justify-between w-full gap-4">
            <span>待处理</span>
            <Chip size="sm" color="primary" variant="flat">{stats['待处理'] || 0}</Chip>
          </div>
        </DropdownItem>
        <DropdownItem 
          key="稍后处理"
          startContent={statusFilter === "稍后处理" ? <CheckIcon className="w-4 h-4" /> : <span className="w-4" />}
        >
          <div className="flex items-center justify-between w-full gap-4">
            <span>稍后处理</span>
            <Chip size="sm" color="warning" variant="flat">{stats['稍后处理'] || 0}</Chip>
          </div>
        </DropdownItem>
        <DropdownItem 
          key="经自动处理填写"
          startContent={statusFilter === "经自动处理填写" ? <CheckIcon className="w-4 h-4" /> : <span className="w-4" />}
        >
          <div className="flex items-center justify-between w-full gap-4">
            <span>经自动处理填写</span>
            <Chip size="sm" color="primary" variant="flat">{stats['经自动处理填写'] || 0}</Chip>
          </div>
        </DropdownItem>
        <DropdownItem 
          key="经自动处理取消"
          startContent={statusFilter === "经自动处理取消" ? <CheckIcon className="w-4 h-4" /> : <span className="w-4" />}
        >
          <div className="flex items-center justify-between w-full gap-4">
            <span>经自动处理取消</span>
            <Chip size="sm" color="danger" variant="flat">{stats['经自动处理取消'] || 0}</Chip>
          </div>
        </DropdownItem>
        <DropdownItem 
          key="已完成"
          startContent={statusFilter === "已完成" ? <CheckIcon className="w-4 h-4" /> : <span className="w-4" />}
        >
          <div className="flex items-center justify-between w-full gap-4">
            <span>已完成</span>
            <Chip size="sm" color="success" variant="flat">{stats['已完成'] || 0}</Chip>
          </div>
        </DropdownItem>
        <DropdownItem 
          key="取消"
          startContent={statusFilter === "取消" ? <CheckIcon className="w-4 h-4" /> : <span className="w-4" />}
        >
          <div className="flex items-center justify-between w-full gap-4">
            <span>取消</span>
            <Chip size="sm" color="default" variant="flat">{stats['取消'] || 0}</Chip>
          </div>
        </DropdownItem>
        <DropdownItem 
          key="附加到其他交易"
          startContent={statusFilter === "附加到其他交易" ? <CheckIcon className="w-4 h-4" /> : <span className="w-4" />}
        >
          <div className="flex items-center justify-between w-full gap-4">
            <span>附加到其他交易</span>
            <Chip size="sm" color="default" variant="flat">{stats['附加到其他交易'] || 0}</Chip>
          </div>
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}

