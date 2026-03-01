"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@heroui/spinner";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Divider } from "@heroui/divider";
import { MagnifyingGlassIcon, DocumentPlusIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { parseDateTime } from "@internationalized/date";
import { ActionBar } from "@/components/homepage/action-bar";
import { useAppData } from "@/components/context/app-data-context";
import { useTransactionCache } from "@/components/context/transaction-cache-context";
import { useError } from "@/components/context/error-context";
import { TxFieldInputs } from "@/components/homepage/tx-field-inputs";
import type { TxFieldInputsData } from "@/components/homepage/tx-field-inputs";
import { FourChainSelector } from "@/components/homepage/common/four-chain-selector";
import type { FourChainState } from "@/components/homepage/common/four-chain-selector";
import { TransactionOverviewList } from "@/components/homepage/left-panel/transaction-overview-list";
import { StatusFilterDropdown } from "@/components/homepage/left-panel/status-filter-dropdown";
import { TxParentArea } from "@/components/homepage/tx-parent-area";
import { SplitEntryArea } from "@/components/homepage/split-area/split-entry-area";
import type { SplitEntryData } from "@/components/homepage/split-area/split-entry-editor";
import { calculateAmount } from "@/lib/transaction-funcs";
import { useFilteredTransactions } from "@/lib/hooks/use-filtered-transactions";
import { useCurrentTransaction } from "@/lib/hooks/use-current-transaction";
import { useTransactionActions } from "@/lib/hooks/use-transaction-actions";
import type { TransactionStatus, TransactionWithRelations } from "@/types";
import type { SplitHint } from "@/components/homepage/action-bar";

export default function Home() {
  
  const router = useRouter();
  const { showError } = useError();
  // 主内容区域的引用（用于检测宽度）
  const mainContentRef = useRef<HTMLDivElement>(null);
  // 四联选择器的模式（列表式或下拉框式）
  const [selectorMode, setSelectorMode] = useState<"listbox" | "select">("select");

  // 全局用户配置(账户、类别、预算等)，所有交易数据
  const { error, isLoading: appDataLoading, hasLoaded: hasLoadedAppData, accounts, mainCategories, subCategories, budgetTypes } = useAppData();
  const { transactions, loadTransactions, isLoading, hasLoaded, createEmptyTransaction: createTransactionInCache } = useTransactionCache();

  // 交易切换、搜索、筛选状态数据
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | 'all'>("all");
  
  // 页面展示的当前交易数据
  // 主要填写区
  const [formData, setFormData] = useState<TxFieldInputsData>({
    amount: "",
    account: "",
    date: null,
    name: "",
    merchant: "",
    status: undefined,
    source: null,
    remark: null,
    title: null,
    raw_info: null,
  });
  // 四联选择器
  const [chainState, setChainState] = useState<FourChainState>({});
  // 拆账区
  const [splitEntries, setSplitEntries] = useState<SplitEntryData[]>([]);
  
  // 使用自定义 Hook 处理搜索和过滤逻辑
  const filteredTransactions = useFilteredTransactions(transactions, searchQuery, statusFilter);

  // 获取当前选中的交易及位置信息
  const { currentTransaction, currentIndex, totalCount } = useCurrentTransaction(currentId, transactions, filteredTransactions);

  // 计算分账/合并提示
  const splitHint = useMemo<SplitHint>(() => {
    if (!currentTransaction || currentTransaction.parent_id) return null;

    const exitCount = splitEntries.length; // 出口数
    const entryCount = currentTransaction.children_ids.length + 1; // 入口数

    if (exitCount > 1) {
      return { type: 'info', message: `该账单会拆分为${exitCount}条记录` };
    }
    if (exitCount === 1 && entryCount > 1) {
      return { type: 'info', message: '该账单会合并为1条记录' };
    }
    if (exitCount === 1 && entryCount === 1) {
      return { type: 'warn', message: '该账单经过分账修改' };
    }
    if (exitCount === 0 && entryCount > 1) {
      const childTransactions = currentTransaction.children_ids
        .map(id => transactions.find(t => t.id === id))
        .filter((t): t is TransactionWithRelations => !!t);
      const allEntries = [currentTransaction, ...childTransactions];
      const totalAmount = allEntries.reduce((sum, tx) => sum + calculateAmount(tx), 0);

      if (Math.abs(totalAmount) < 0.005) {
        return { type: 'info', message: '该账单正负相抵不会被导出' };
      } else {
        return { type: 'warn', message: '该账单会默认按账户进行合并' };
      }
    }
    // exitCount === 0 && entryCount === 1: 正常情况，不显示
    return null;
  }, [currentTransaction, splitEntries.length, transactions]);

  // 交易操作 hook
  const txActions = useTransactionActions({
    currentTransaction,
    filteredTransactions,
    currentIndex,
    totalCount,
    onSelectTransaction: setCurrentId,
    getFormSnapshot: () => ({ formData, chainState, splitEntries }),
  });

  // 组件挂载时，如果交易数据为空，且基础数据已加载完成，再自动加载交易
  useEffect(() => {
    const appDataReady = !appDataLoading
      && accounts.length > 0
      && mainCategories.length > 0
      && subCategories.length > 0
      && budgetTypes.length > 0;
    // 只在未加载过的情况下自动加载，避免云端本身没有数据时无限循环
    if (appDataReady && transactions.length === 0 && !isLoading && !hasLoaded) {
      loadTransactions();
    }
  }, [appDataLoading, accounts.length, mainCategories.length, subCategories.length, budgetTypes.length, transactions.length, isLoading, hasLoaded, loadTransactions]);

  // 当选中的交易变化时，填充表单数据
  useEffect(() => {
    if (currentTransaction) {
      // 填充表单数据 - 金额使用绝对值
      setFormData({
        amount: Math.abs(currentTransaction.amount).toFixed(2),
        account: currentTransaction.account.id ? String(currentTransaction.account.id) : "",
        date: currentTransaction.datetime ? parseDateTime(currentTransaction.datetime) : null,
        name: currentTransaction.name || "",
        merchant: currentTransaction.merchant || "",
        status: currentTransaction.status || undefined,
        source: currentTransaction.source,
        remark: currentTransaction.remark,
        title: currentTransaction.title,
        raw_info: currentTransaction.raw_info as Record<string, string> | null,
      });

      // 填充四联选择器状态
      setChainState({
        txType: currentTransaction.transaction_type || undefined,
        main_id: currentTransaction.main_category ? String(currentTransaction.main_category.id) : undefined,
        sub_id: currentTransaction.sub_category ? String(currentTransaction.sub_category.id) : undefined,
        budget_id: currentTransaction.budget_type ? String(currentTransaction.budget_type.id) : undefined,
      });
    } else {
      // 清空表单
      setFormData({
        amount: "",
        account: "",
        date: null,
        name: "",
        merchant: "",
        status: undefined,
        source: null,
        remark: null,
        title: null,
        raw_info: null,
      });
      setChainState({});
    }
  }, [currentTransaction?.id]);

  // 当选中的交易变化时，初始化拆账条目
  useEffect(() => {
    if (!currentTransaction) {
      setSplitEntries([]);
      return;
    }
    const splits = currentTransaction.splits;
    if (!splits || splits.length === 0) {
      setSplitEntries([]);
      return;
    }
    setSplitEntries(splits.map((split) => ({
      localId: `db-${split.id}`,
      accountId: String(split.account.id),
      amount: Math.abs(split.amount).toFixed(2),
      chainState: {
        txType: split.transaction_type ?? undefined,
        main_id: split.main_category ? String(split.main_category.id) : undefined,
        sub_id: split.sub_category ? String(split.sub_category.id) : undefined,
        budget_id: split.budget_type ? String(split.budget_type.id) : undefined,
      },
      name: split.name ?? "",
    })));
  }, [currentTransaction?.id]);

  // 动态检测容器宽度并设置选择器模式
  useEffect(() => {
    const container = mainContentRef.current;
    if (!container) return;

    // 四个 listbox 每个最小 192px，加上间距约 48px，总共约 816px
    // 为了安全起见，设置阈值为 850px
    const MIN_WIDTH_FOR_LISTBOX = 810;

    const updateSelectorMode = () => {
      const containerWidth = container.offsetWidth;
      setSelectorMode(containerWidth >= MIN_WIDTH_FOR_LISTBOX ? "listbox" : "select");
    };

    // 使用 ResizeObserver 监听容器大小变化
    const resizeObserver = new ResizeObserver(() => {
      updateSelectorMode();
    });

    resizeObserver.observe(container);
    
    // 初始化
    updateSelectorMode();

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // 监听错误状态，显示错误弹窗
  useEffect(() => {
    if (error) {
      showError('数据加载失败', error + '\n\n请检查您的网络连接或重新登录。如果问题持续存在，请联系管理员。');
    }
  }, [error, showError]);

  // 表单数据变更处理
  const handleFormChange = (field: keyof TxFieldInputsData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 操作栏事件处理函数

  // 导入账单
  const handleImport = () => {
    router.push('/upload');
  };

  // 新建记录
  const handleCreate = async () => {
    const result = await createTransactionInCache();

    if (result.success && result.data) {
      setCurrentId(result.data.id);
    } else {
      showError('操作失败', result.error || '未知错误');
    }
  };

  return (
    <>
      <div className="flex h-full w-full min-h-0 overflow-hidden">
        
        {/* 左侧 Sidebar */}
        <aside className="w-80 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col h-full min-h-0">
          
          {/* 搜索框和状态过滤 */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex gap-2 items-center">
              <Input
                placeholder="搜索名称, 金额..."
                value={searchQuery}
                onValueChange={setSearchQuery}
                startContent={<MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />}
                variant="bordered"
                size="sm"
                className="flex-1"
              />
              <StatusFilterDropdown
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
              />
            </div>
          </div>

          {/* 账单概览区 - 占据剩余空间 */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <TransactionOverviewList 
              currentId={currentId || undefined}
              onSelectTransaction={setCurrentId}
              filteredTransactions={filteredTransactions}
              isFiltered={searchQuery.trim() !== '' || statusFilter !== 'all'}
              onClearFilters={() => { setSearchQuery(''); setStatusFilter('all'); }}
            />
          </div>
        </aside>

        {/* 右侧主要区域 */}
        <main className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
          
          {/* ActionBar - 仅在选中账单时显示 */}
          {currentId !== null && currentIndex > 0 && (
            <ActionBar
              currentIndex={currentIndex}
              totalCount={totalCount}
              status={currentTransaction?.status || undefined}
              actions={txActions}
              splitHint={splitHint}
            />
          )}

          {/* 主内容区域 */}
          <div ref={mainContentRef} className="flex-1 min-h-0 overflow-y-auto">
            {/* AppData 加载中 */}
            {!hasLoadedAppData || appDataLoading ? (
              <div className="flex items-center justify-center h-full">
                <Spinner size="sm" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-lg text-gray-500 dark:text-gray-400 mb-2">暂无账单</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">请先新建或导入账单</p>
                  <div className="flex gap-3 justify-center">
                    <Button 
                      size="sm" 
                      color="default" 
                      variant="flat" 
                      startContent={<DocumentPlusIcon className="w-4 h-4" />}
                      onPress={handleCreate}
                    >
                      新建记录
                    </Button>
                    <Button 
                      size="sm" 
                      color="default" 
                      variant="flat" 
                      startContent={<ArrowDownTrayIcon className="w-4 h-4" />}
                      onPress={handleImport}
                    >
                      导入账单
                    </Button>
                  </div>
                </div>
              </div>
            ) : !currentId ? (
              /* 空状态：未选择账单 */
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-lg text-gray-500 dark:text-gray-400 mb-2">未选择账单</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">请先在左侧选择一个账单</p>
                  <div className="flex gap-3 justify-center">
                    <Button 
                      size="sm" 
                      color="default" 
                      variant="flat" 
                      startContent={<DocumentPlusIcon className="w-4 h-4" />}
                      onPress={handleCreate}
                    >
                      新建记录
                    </Button>
                    <Button 
                      size="sm" 
                      color="default" 
                      variant="flat" 
                      startContent={<ArrowDownTrayIcon className="w-4 h-4" />}
                      onPress={handleImport}
                    >
                      导入账单
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* 正常显示：已选择账单 */
              <div className="w-full p-5 space-y-5">
                
                {/* 账单附加区 */}
                <TxParentArea 
                  currentTransaction={currentTransaction}
                  onNavigateToTransaction={setCurrentId}
                />

                <Divider />

                {/* 主要填写区 */}
                <div>
                  
                  {/* 交易输入组件 */}
                  <div className="mb-5">
                    <TxFieldInputs 
                      selectedTxType={chainState.txType} 
                      formData={formData}
                      onChange={handleFormChange}
                    />
                  </div>

                  <div className="h-2" />

                  {/* 四联选择器组件 */}
                  <FourChainSelector 
                    mode={selectorMode}
                    value={chainState}
                    onChange={setChainState}
                  />
                </div>

                {/* 拆账区（子交易不显示） */}
                {currentTransaction && !currentTransaction.parent_id && (
                  <>
                    <Divider />
                    <SplitEntryArea
                      currentTransaction={currentTransaction}
                      entries={splitEntries}
                      onEntriesChange={setSplitEntries}
                    />
                  </>
                )}

                <Divider />

                {/* 调试信息区 */}
                <div>
                  <h2 className="text-xs font-semibold mb-3">调试信息 - selectedTxWithRelations</h2>
                  <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-auto max-h-80">
                    {JSON.stringify(currentTransaction ? {
                      ...currentTransaction,
                      children_ids: currentTransaction.children_ids,
                    } : null, null, 2)}
                  </pre>
                </div>

              </div>
            )}
          </div>
        </main>
      </div>

    </>
  );
}