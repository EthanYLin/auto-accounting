"use client";

import React, { useState, useEffect, useRef } from "react";
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
import { FourChainSelector } from "@/components/homepage/four-chain-selector";
import type { FourChainState } from "@/components/homepage/four-chain-selector";
import { TransactionOverviewList } from "@/components/homepage/transaction-overview-list";
import { StatusFilterDropdown } from "@/components/homepage/status-filter-dropdown";
import { useFilteredTransactions } from "@/lib/hooks/use-filtered-transactions";
import { useCurrentTransaction } from "@/lib/hooks/use-current-transaction";
import type { TransactionStatus } from "@/types";

export default function Home() {
  const router = useRouter();
  const { error, isLoading: appDataLoading, hasLoaded: hasLoadedAppData, accounts, mainCategories, subCategories, budgetTypes } = useAppData();
  const { transactions, loadTransactions, isLoading, hasLoaded, createEmptyTransaction: createTransactionInCache } = useTransactionCache();
  const { showError } = useError();
  const [chainState, setChainState] = useState<FourChainState>({});
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [selectorMode, setSelectorMode] = useState<"listbox" | "select">("select");
  
  // 搜索框状态
  const [searchQuery, setSearchQuery] = useState("");
  
  // 状态过滤
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | 'all'>("all");
  
  // 自动切换状态
  const [autoSwitch, setAutoSwitch] = useState(false);
  
  // 主内容区域的引用（用于检测宽度）
  const mainContentRef = useRef<HTMLDivElement>(null);

  // 表单数据状态
  const [formData, setFormData] = useState<TxFieldInputsData>({
    amount: "",
    account: "",
    date: null,
    name: "",
    merchant: "",
    status: undefined
  });
  
  // 使用自定义 Hook 处理搜索和过滤逻辑
  const filteredTransactions = useFilteredTransactions(transactions, searchQuery, statusFilter);

  // 获取当前选中的交易及位置信息
  const { currentTransaction, currentIndex, totalCount } = useCurrentTransaction(
    currentId,
    transactions,
    filteredTransactions
  );

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
        status: undefined
      });
      setChainState({});
    }
  }, [currentTransaction]);

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
  const handlePrevious = () => {
    if (currentIndex > 1) {
      const prevTx = filteredTransactions[currentIndex - 2];
      if (prevTx) {
        setCurrentId(prevTx.id);
      }
    }
  };

  const handleNext = () => {
    if (currentIndex > 0 && currentIndex < totalCount) {
      const nextTx = filteredTransactions[currentIndex];
      if (nextTx) {
        setCurrentId(nextTx.id);
      }
    }
  };

  const handleComplete = () => {
    console.log("完成操作");
  };

  const handleLater = () => {
    console.log("稍后处理");
  };

  const handleCancel = () => {
    console.log("取消操作");
  };

  const handleSave = () => {
    console.log("保存操作");
  };

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
              autoSwitch={autoSwitch}
              onAutoSwitchChange={setAutoSwitch}
              onPrevious={handlePrevious}
              onNext={handleNext}
              onComplete={handleComplete}
              onLater={handleLater}
              onCancel={handleCancel}
              onSave={handleSave}
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
                <div>
                  <h2 className="text-xs font-semibold mb-3">合并账单</h2>
                  <div className="text-xs text-gray-500 dark:text-gray-500">此区域暂时留空</div>
                </div>

                <Divider />

                {/* 主要填写区 */}
                <div>
                  <h2 className="text-xs font-semibold mb-3">账单信息</h2>
                  
                  {/* 交易输入组件 */}
                  <div className="mb-5">
                    <TxFieldInputs 
                      selectedTxType={chainState.txType} 
                      formData={formData}
                      onChange={handleFormChange}
                    />
                  </div>

                  {/* 分隔线 */}
                  <Divider className="my-5" />

                  {/* 四联选择器组件 */}
                  <FourChainSelector 
                    mode={selectorMode}
                    value={chainState}
                    onChange={setChainState}
                  />
                </div>

                <Divider />

                {/* 拆账区 */}
                <div>
                  <h2 className="text-xs font-semibold mb-3">拆账区</h2>
                  <div className="text-xs text-gray-500 dark:text-gray-500">此区域暂时留空</div>
                </div>

                <Divider />

                {/* 调试信息区 */}
                <div>
                  <h2 className="text-xs font-semibold mb-3">调试信息 - selectedTxWithRelations</h2>
                  <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-auto max-h-80">
                    {JSON.stringify(currentTransaction ? {
                      ...currentTransaction,
                      parent: currentTransaction.parent ? { id: currentTransaction.parent.id } : undefined,
                      children: currentTransaction.children.map(c => ({ id: c.id })),
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