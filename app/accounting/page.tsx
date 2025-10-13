"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@heroui/button";
import { Input, Textarea } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Badge } from "@heroui/badge";
import { Checkbox } from "@heroui/checkbox";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/table";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/modal";
import { DatePicker } from "@heroui/date-picker";
import { now, getLocalTimeZone } from "@internationalized/date";
import { Account } from "@/types/account";
import { TransactionType } from "@/types/transaction-type";
import { TransactionStatus } from "@/types/transaction-status";
import { BudgetType } from "@/types/budget-type";
import { CATEGORY_TREE, getMainCategories, getSubCategories, type CategoryPath, type TxType } from "@/types/category";

// 交易记录类型定义
interface Transaction {
  id: number;
  amount: number;
  account: Account;
  category: {
    type: TxType;
    main: string;
    sub: string;
  };
  datetime: Date;
  status: TransactionStatus;
  name: string;
  merchant: string;
  transactionType: TransactionType;
  budgetPlan: BudgetType | null;
  parentId?: number;
  childIds?: number[];
  splits?: TransactionSplit[];
}

// 分账类型定义
interface TransactionSplit {
  id: string;
  amount: number;
  category: {
    type: TxType;
    main: string;
    sub: string;
  };
  name: string;
  assignee?: string;
}

// 进度统计类型
interface ProgressStats {
  pending: number;
  later: number;
  completed: number;
  cancelled: number;
}

// 模拟数据
const generateMockTransactions = (): Transaction[] => {
  const statuses = [
    TransactionStatus.PENDING,
    TransactionStatus.LATER_ON, 
    TransactionStatus.COMPLETED,
    TransactionStatus.CANCELLED
  ];
  
  const accounts = Object.values(Account);
  const merchants = ["星巴克", "麦当劳", "超市", "地铁", "滴滴出行", "京东", "淘宝", "美团"];
  const names = ["早餐", "午餐", "晚餐", "零食", "交通费", "购物", "娱乐", "学习"];

  return Array.from({ length: 50 }, (_, i) => ({
    id: i + 1,
    amount: Math.floor(Math.random() * 500) + 10,
    account: accounts[Math.floor(Math.random() * accounts.length)],
    category: {
      type: "EXPENSE" as TxType,
      main: "FOOD" as any,
      sub: "LUNCH" as any
    },
    datetime: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    status: statuses[Math.floor(Math.random() * statuses.length)],
    name: names[Math.floor(Math.random() * names.length)],
    merchant: merchants[Math.floor(Math.random() * merchants.length)],
    transactionType: TransactionType.EXPENSE,
    budgetPlan: Math.random() > 0.5 ? BudgetType.BASIC : BudgetType.ENTERTAINMENT,
    childIds: Math.random() > 0.8 ? [i + 51, i + 52] : undefined
  }));
};

const AccountingPage = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentTransactionId, setCurrentTransactionId] = useState(1);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false);
  const [selectedStatusFilters, setSelectedStatusFilters] = useState<Set<TransactionStatus>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [autoMoveToNext, setAutoMoveToNext] = useState(true);
  const [splitMode, setSplitMode] = useState<"equal" | "amount" | "percentage">("equal");
  const [splitCount, setSplitCount] = useState(2);
  const [splits, setSplits] = useState<TransactionSplit[]>([]);
  
  const { isOpen: isAttachModalOpen, onOpen: onAttachModalOpen, onClose: onAttachModalClose } = useDisclosure();

  // 初始化数据
  useEffect(() => {
    setTransactions(generateMockTransactions());
  }, []);

  // 计算进度统计
  const progressStats: ProgressStats = transactions.reduce((stats, transaction) => {
    switch (transaction.status) {
      case TransactionStatus.PENDING:
        stats.pending++;
        break;
      case TransactionStatus.LATER_ON:
        stats.later++;
        break;
      case TransactionStatus.COMPLETED:
        stats.completed++;
        break;
      case TransactionStatus.CANCELLED:
        stats.cancelled++;
        break;
    }
    return stats;
  }, { pending: 0, later: 0, completed: 0, cancelled: 0 });

  // 过滤后的交易
  const filteredTransactions = transactions.filter(transaction => {
    const statusMatch = selectedStatusFilters.size === 0 || selectedStatusFilters.has(transaction.status);
    const searchMatch = searchTerm === "" || 
      transaction.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.merchant.toLowerCase().includes(searchTerm.toLowerCase());
    return statusMatch && searchMatch;
  });

  // 当前交易
  const currentTransaction = transactions.find(t => t.id === currentTransactionId);

  // 切换状态筛选
  const toggleStatusFilter = (status: TransactionStatus) => {
    const newFilters = new Set(selectedStatusFilters);
    if (newFilters.has(status)) {
      newFilters.delete(status);
    } else {
      newFilters.add(status);
    }
    setSelectedStatusFilters(newFilters);
  };

  // 跳转到交易
  const navigateToTransaction = (id: number) => {
    setCurrentTransactionId(id);
    setIsDetailDrawerOpen(true);
  };

  // 上一笔/下一笔
  const navigatePrevNext = (direction: "prev" | "next") => {
    const currentIndex = filteredTransactions.findIndex(t => t.id === currentTransactionId);
    let newIndex;
    
    if (direction === "prev") {
      newIndex = currentIndex > 0 ? currentIndex - 1 : filteredTransactions.length - 1;
    } else {
      newIndex = currentIndex < filteredTransactions.length - 1 ? currentIndex + 1 : 0;
    }
    
    setCurrentTransactionId(filteredTransactions[newIndex].id);
  };

  // 保存操作
  const handleSave = () => {
    console.log("保存交易", currentTransaction);
    if (autoMoveToNext) {
      navigatePrevNext("next");
    }
  };

  // 状态操作
  const handleStatusAction = (newStatus: TransactionStatus) => {
    if (currentTransaction) {
      const updatedTransactions = transactions.map(t => 
        t.id === currentTransaction.id ? { ...t, status: newStatus } : t
      );
      setTransactions(updatedTransactions);
      
      if (autoMoveToNext) {
        navigatePrevNext("next");
      }
    }
  };

  // 初始化分账
  useEffect(() => {
    if (currentTransaction) {
      const averageAmount = Math.floor(currentTransaction.amount / splitCount);
      const newSplits: TransactionSplit[] = Array.from({ length: splitCount }, (_, i) => ({
        id: `split-${i + 1}`,
        amount: i === splitCount - 1 ? 
          currentTransaction.amount - (averageAmount * (splitCount - 1)) : 
          averageAmount,
        category: currentTransaction.category,
        name: `${currentTransaction.name} (${i + 1})`,
        assignee: ""
      }));
      setSplits(newSplits);
    }
  }, [splitCount, splitMode, currentTransaction]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 顶栏 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">记账管理</h1>
            <Input
              placeholder="搜索交易..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-80"
              startContent={<span className="text-gray-400">🔍</span>}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button color="primary">新增账单</Button>
            <Button variant="light">导出</Button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* 左侧 - 进度看板 + 交易列表 */}
        <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          {/* 进度看板 */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">进度看板</h2>
              <Button
                isIconOnly
                variant="light"
                size="sm"
                onClick={() => setIsLeftSidebarCollapsed(!isLeftSidebarCollapsed)}
              >
                {isLeftSidebarCollapsed ? "→" : "←"}
              </Button>
            </div>

            {/* 进度卡片 - 2x2 网格 */}
            <div className="grid grid-cols-2 gap-2">
              <Card 
                isPressable
                className={`${selectedStatusFilters.has(TransactionStatus.PENDING) ? "ring-2 ring-blue-500" : ""}`}
                onClick={() => toggleStatusFilter(TransactionStatus.PENDING)}
              >
                <CardBody className="p-2 text-center">
                  <div className="text-xs text-gray-600 dark:text-gray-400">未完成</div>
                  <div className="text-lg font-bold text-blue-500">{progressStats.pending}</div>
                </CardBody>
              </Card>

              <Card 
                isPressable
                className={`${selectedStatusFilters.has(TransactionStatus.LATER_ON) ? "ring-2 ring-orange-500" : ""}`}
                onClick={() => toggleStatusFilter(TransactionStatus.LATER_ON)}
              >
                <CardBody className="p-2 text-center">
                  <div className="text-xs text-gray-600 dark:text-gray-400">稍后处理</div>
                  <div className="text-lg font-bold text-orange-500">{progressStats.later}</div>
                </CardBody>
              </Card>

              <Card 
                isPressable
                className={`${selectedStatusFilters.has(TransactionStatus.COMPLETED) ? "ring-2 ring-green-500" : ""}`}
                onClick={() => toggleStatusFilter(TransactionStatus.COMPLETED)}
              >
                <CardBody className="p-2 text-center">
                  <div className="text-xs text-gray-600 dark:text-gray-400">已完成</div>
                  <div className="text-lg font-bold text-green-500">{progressStats.completed}</div>
                </CardBody>
              </Card>

              <Card 
                isPressable
                className={`${selectedStatusFilters.has(TransactionStatus.CANCELLED) ? "ring-2 ring-red-500" : ""}`}
                onClick={() => toggleStatusFilter(TransactionStatus.CANCELLED)}
              >
                <CardBody className="p-2 text-center">
                  <div className="text-xs text-gray-600 dark:text-gray-400">已取消</div>
                  <div className="text-lg font-bold text-red-500">{progressStats.cancelled}</div>
                </CardBody>
              </Card>
            </div>

            {/* 搜索框 */}
            <div className="mt-3">
              <Input
                placeholder="搜索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="sm"
                startContent={<span className="text-gray-400">🔍</span>}
              />
            </div>
          </div>

          {/* 交易列表 */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-2">
              {filteredTransactions.map((transaction) => (
                <Card 
                  key={transaction.id}
                  isPressable
                  className={`mb-2 ${
                    transaction.id === currentTransactionId 
                      ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20" 
                      : ""
                  }`}
                  onClick={() => {
                    setCurrentTransactionId(transaction.id);
                    setIsDetailDrawerOpen(true);
                  }}
                >
                  <CardBody className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <span className="text-sm">🍽️</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{transaction.name}</div>
                        <div className="text-xs text-gray-500">
                          {transaction.datetime.toLocaleDateString()} {transaction.datetime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-mono text-sm font-bold ${
                          transaction.transactionType === TransactionType.INCOME ? "text-green-600" : "text-red-600"
                        }`}>
                          {transaction.transactionType === TransactionType.INCOME ? "+" : "-"}¥{transaction.amount}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">{transaction.account}</span>
                      <div className="flex gap-1">
                        <Chip 
                          size="sm"
                          color={
                            transaction.status === TransactionStatus.COMPLETED ? "success" :
                            transaction.status === TransactionStatus.CANCELLED ? "danger" :
                            transaction.status === TransactionStatus.LATER_ON ? "warning" : "primary"
                          }
                          className="text-xs"
                        >
                          {transaction.status}
                        </Chip>
                        {transaction.childIds && transaction.childIds.length > 0 && (
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">#{transaction.id} ↗{transaction.childIds.length} ↶{transaction.parentId ? 1 : 0}</span>
                        )}
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧详情面板 */}
        {isDetailDrawerOpen && (
          <div className="flex-1 bg-white dark:bg-gray-800 flex flex-col">
            {/* 操作栏 - 固定在顶部 */}
            <div className="border-b border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="flat"
                    onClick={() => navigatePrevNext("prev")}
                  >
                    ← 上一个
                  </Button>
                  <Button 
                    size="sm" 
                    variant="flat"
                    onClick={() => navigatePrevNext("next")}
                  >
                    下一个 →
                  </Button>
                </div>
                
                <div className="flex items-center gap-2">
                  <Input
                    size="sm"
                    className="w-16"
                    value={currentTransactionId.toString()}
                    onChange={(e) => {
                      const id = parseInt(e.target.value);
                      if (id > 0 && id <= transactions.length) {
                        setCurrentTransactionId(id);
                      }
                    }}
                  />
                  <span className="text-sm text-gray-500">/ {filteredTransactions.length}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox 
                    size="sm"
                    isSelected={autoMoveToNext}
                    onValueChange={setAutoMoveToNext}
                  >
                    自动切换到下一个
                  </Checkbox>
                </div>

                <div className="flex items-center gap-2">
                  <Button size="sm" color="primary" onClick={handleSave}>保存</Button>
                  <Button size="sm" color="success" onClick={() => handleStatusAction(TransactionStatus.COMPLETED)}>保存并完成</Button>
                  <Button size="sm" variant="flat" onClick={() => handleStatusAction(TransactionStatus.CANCELLED)}>保存并取消</Button>
                  <Button size="sm" color="warning" onClick={() => handleStatusAction(TransactionStatus.LATER_ON)}>保存并稍后处理</Button>
                </div>
              </div>
            </div>

            {/* 三个区域 */}
            <div className="flex-1 overflow-y-auto">
              {currentTransaction && (
                <div className="grid grid-cols-1 divide-y divide-gray-200 dark:divide-gray-700">
                  {/* 账单附加区 */}
                  <div className="p-6">
                    <h3 className="text-lg font-semibold mb-4 border-b border-dashed border-gray-300 pb-2">账单附加区</h3>
                    <div className="space-y-4">
                      {/* 父账单信息 */}
                      {currentTransaction.parentId ? (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">父账单</label>
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium">#{currentTransaction.parentId} - 父账单名称</p>
                                <p className="text-xs text-gray-500">¥500.00 - 2024-01-15</p>
                              </div>
                              <div className="flex gap-1">
                                <Button size="sm" variant="light">跳转</Button>
                                <Button size="sm" color="danger" variant="light">解除</Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-sm text-gray-500 mb-3">当前账单未附加到其他账单</p>
                          <Button color="primary" size="sm" onClick={onAttachModalOpen}>
                            附加到其他账单
                          </Button>
                        </div>
                      )}

                      {/* 子账单列表 */}
                      {currentTransaction.childIds && currentTransaction.childIds.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">子账单 ({currentTransaction.childIds.length})</label>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {currentTransaction.childIds.map((childId) => (
                              <div key={childId} className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium">#{childId} - 子账单名称</p>
                                    <p className="text-xs text-gray-500">¥100.00 - 已完成</p>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button size="sm" variant="light">跳转</Button>
                                    <Button size="sm" color="danger" variant="light">移除</Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 附加操作 */}
                      <div className="flex gap-2">
                        <Button variant="flat" size="sm">
                          从其他账单附加到此
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* 主要填写区 */}
                  <div className="p-6">
                    <h3 className="text-lg font-semibold mb-4 border-b border-dashed border-gray-300 pb-2">主要填写区</h3>
                    <div className="space-y-4">
                      {/* 金额 - 突出显示 */}
                      <Input
                        label="金额"
                        placeholder="0.00"
                        startContent={<span className="text-gray-400">¥</span>}
                        value={currentTransaction.amount.toString()}
                        size="lg"
                        classNames={{
                          input: "text-2xl font-bold",
                        }}
                      />

                      {/* 账户和交易类型 */}
                      <div className="grid grid-cols-2 gap-4">
                        <Select label="账户" selectedKeys={[currentTransaction.account]}>
                          {Object.values(Account).map((account) => (
                            <SelectItem key={account}>{account}</SelectItem>
                          ))}
                        </Select>
                        <Select label="交易类型" selectedKeys={[currentTransaction.transactionType]}>
                          {Object.values(TransactionType).map((type) => (
                            <SelectItem key={type}>{type}</SelectItem>
                          ))}
                        </Select>
                      </div>

                      {/* 类别选择 */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">类别</label>
                        <div className="text-sm text-gray-600 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                          {CATEGORY_TREE[currentTransaction.category.type].label} → 
                          {(CATEGORY_TREE[currentTransaction.category.type].mains as any)[currentTransaction.category.main]?.label} → 
                          {(CATEGORY_TREE[currentTransaction.category.type].mains as any)[currentTransaction.category.main]?.subs[currentTransaction.category.sub]?.label}
                        </div>
                        <Button size="sm" variant="flat">更改类别</Button>
                      </div>

                      {/* 日期时间 */}
                      <DatePicker 
                        label="日期时间"
                        defaultValue={now(getLocalTimeZone())}
                      />

                      {/* 状态 */}
                      <Select label="状态" selectedKeys={[currentTransaction.status]}>
                        {Object.values(TransactionStatus).map((status) => (
                          <SelectItem key={status}>{status}</SelectItem>
                        ))}
                      </Select>

                      {/* 名称和商户 */}
                      <div className="grid grid-cols-2 gap-4">
                        <Input label="名称" value={currentTransaction.name} />
                        <Input label="商户" value={currentTransaction.merchant} />
                      </div>

                      {/* 预算计划 */}
                      <Select label="预算计划" selectedKeys={currentTransaction.budgetPlan ? [currentTransaction.budgetPlan] : []}>
                        {Object.values(BudgetType).map((budget) => (
                          <SelectItem key={budget}>{budget}</SelectItem>
                        ))}
                      </Select>
                    </div>
                  </div>

                  {/* 折账区 */}
                  <div className="p-6">
                    <h3 className="text-lg font-semibold mb-4 border-b border-dashed border-gray-300 pb-2">折账区</h3>
                    <div className="space-y-4">
                      {/* 分账模式选择 */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">分账模式</label>
                        <div className="flex gap-2">
                          <Chip 
                            className="cursor-pointer"
                            color={splitMode === "equal" ? "primary" : "default"}
                            onClick={() => setSplitMode("equal")}
                            size="sm"
                          >
                            平均拆分
                          </Chip>
                          <Chip 
                            className="cursor-pointer"
                            color={splitMode === "amount" ? "primary" : "default"}
                            onClick={() => setSplitMode("amount")}
                            size="sm"
                          >
                            按金额
                          </Chip>
                          <Chip 
                            className="cursor-pointer"
                            color={splitMode === "percentage" ? "primary" : "default"}
                            onClick={() => setSplitMode("percentage")}
                            size="sm"
                          >
                            按比例
                          </Chip>
                        </div>
                      </div>

                      {/* 分账数量 */}
                      <Input
                        type="number"
                        label="分账数量"
                        value={splitCount.toString()}
                        onChange={(e) => setSplitCount(parseInt(e.target.value) || 2)}
                        min={2}
                        max={10}
                        size="sm"
                      />

                      {/* 分账明细 */}
                      {splits.length > 0 && (
                        <div className="space-y-3">
                          <label className="text-sm font-medium">分账明细</label>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {splits.map((split, index) => (
                              <div key={split.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                                <div className="text-xs text-gray-500 mb-2">第 {index + 1} 项</div>
                                <div className="grid grid-cols-3 gap-2">
                                  <Input
                                    size="sm"
                                    label="金额"
                                    value={split.amount.toString()}
                                    startContent="¥"
                                  />
                                  <Input
                                    size="sm"
                                    label="名称"
                                    value={split.name}
                                  />
                                  <Input
                                    size="sm"
                                    label="分担人"
                                    value={split.assignee || ""}
                                    placeholder="可选"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* 总和校验 */}
                          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                            <span className="text-sm font-medium">分账总和:</span>
                            <span className={`font-mono text-sm font-bold ${
                              splits.reduce((sum, split) => sum + split.amount, 0) === currentTransaction.amount 
                                ? "text-green-600" : "text-red-600"
                            }`}>
                              ¥{splits.reduce((sum, split) => sum + split.amount, 0)} / ¥{currentTransaction.amount}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 附加账单选择模态框 */}
      <Modal 
        isOpen={isAttachModalOpen} 
        onClose={onAttachModalClose}
        size="5xl"
      >
        <ModalContent>
          <ModalHeader>选择要附加的账单</ModalHeader>
          <ModalBody>
            <Table aria-label="附加账单选择">
              <TableHeader>
                <TableColumn>ID</TableColumn>
                <TableColumn>日期</TableColumn>
                <TableColumn>金额</TableColumn>
                <TableColumn>名称</TableColumn>
                <TableColumn>状态</TableColumn>
              </TableHeader>
              <TableBody>
                {transactions.filter(t => t.id !== currentTransactionId).slice(0, 10).map((transaction) => (
                  <TableRow 
                    key={transaction.id}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <TableCell>#{transaction.id}</TableCell>
                    <TableCell>{transaction.datetime.toLocaleDateString()}</TableCell>
                    <TableCell>¥{transaction.amount}</TableCell>
                    <TableCell>{transaction.name}</TableCell>
                    <TableCell>
                      <Chip size="sm" color="default">{transaction.status}</Chip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onClick={onAttachModalClose}>
              取消
            </Button>
            <Button color="primary" onClick={onAttachModalClose}>
              确认附加
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default AccountingPage;
