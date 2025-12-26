"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Skeleton } from "@heroui/skeleton";
import { Spinner } from "@heroui/spinner";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Divider } from "@heroui/divider";
import { MagnifyingGlassIcon, DocumentPlusIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { parseDateTime } from "@internationalized/date";
import { ActionBar } from "@/components/homepage/action-bar";
import { useAppData } from "@/components/context/app-data-context";
import { useTransactionCache } from "@/components/context/transaction-cache-context";
import type { TxFieldInputsData } from "@/components/homepage/tx-field-inputs";
import type { FourChainSelection, FourChainState } from "@/components/homepage/four-chain-selector";
import { TransactionOverviewList } from "@/components/homepage/transaction-overview-list";
import { StatusFilterDropdown } from "@/components/homepage/status-filter-dropdown";
import { useFilteredTransactions } from "@/lib/hooks/use-filtered-transactions";
import type { TransactionStatus } from "@/types";

// 使用 dynamic import 替代 NoSSR
const FourChainSelector = dynamic(
  () => import("@/components/homepage/four-chain-selector").then(mod => ({ default: mod.FourChainSelector })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full mb-6">
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    )
  }
);

// 交易输入组件
const TxFieldInputs = dynamic(
  () => import("@/components/homepage/tx-field-inputs").then(mod => ({ default: mod.TxFieldInputs })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full">
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    )
  }
);

export default function Home() {
  const router = useRouter();
  const { error, isLoading: appDataLoading, hasLoaded: hasLoadedAppData, accounts, mainCategories, subCategories, budgetTypes } = useAppData();
  const { transactions, loadTransactions, isLoading, createTransactionInCache } = useTransactionCache();
  const [chainSelection, setChainSelection] = useState<FourChainSelection>(null);
  const [chainState, setChainState] = useState<FourChainState>({}); // 管理四联选择器的内部状态
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
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
  
  // 计算真实的状态统计
  // 直接统计每个 status 的数量，返回 key 和 count
  const statusStats = useMemo(() => {
    const counts: Record<TransactionStatus, number> = {} as Record<TransactionStatus, number>;
    transactions.forEach(tx => {
      if (tx.status) {
        counts[tx.status] = (counts[tx.status] || 0) + 1;
      }
    });
    return counts;
  }, [transactions]);

  // 使用自定义 Hook 处理搜索和过滤逻辑
  const filteredTransactions = useFilteredTransactions(transactions, searchQuery, statusFilter);

  // 获取当前选中的交易
  const currentTransaction = useMemo(() => {
    if (currentId === null) return null;
    return transactions.find(tx => tx.id === currentId) || null;
  }, [currentId, transactions]);

  // 计算当前交易在过滤后列表中的位置（从1开始）和总数
  const { currentIndex, totalCount } = useMemo(() => {
    if (currentId === null) {
      return { currentIndex: 0, totalCount: filteredTransactions.length };
    }
    const index = filteredTransactions.findIndex(tx => tx.id === currentId);
    return {
      currentIndex: index === -1 ? 0 : index + 1,
      totalCount: filteredTransactions.length
    };
  }, [currentId, filteredTransactions]);

  // 组件挂载时，如果交易数据为空，且基础数据已加载完成，再自动加载交易
  useEffect(() => {
    const appDataReady = !appDataLoading
      && accounts.length > 0
      && mainCategories.length > 0
      && subCategories.length > 0
      && budgetTypes.length > 0;
    if (appDataReady && transactions.length === 0 && !isLoading) {
      loadTransactions();
    }
  }, [appDataLoading, accounts.length, mainCategories.length, subCategories.length, budgetTypes.length, transactions.length, isLoading, loadTransactions]);

  // 当选中的交易变化时，填充表单数据
  useEffect(() => {
    if (currentTransaction) {
      // 填充表单数据 - 金额使用绝对值
      setFormData({
        amount: Math.abs(currentTransaction.amount).toFixed(2),
        account: currentTransaction.account_id ? String(currentTransaction.account_id) : "",
        date: currentTransaction.datetime ? parseDateTime(currentTransaction.datetime) : null,
        name: currentTransaction.name || "",
        merchant: currentTransaction.merchant || "",
        status: currentTransaction.status || undefined,
      });

      // 填充四联选择器状态
      setChainState({
        txType: currentTransaction.transaction_type || undefined,
        main: currentTransaction.main_category_id ? String(currentTransaction.main_category_id) : undefined,
        sub: currentTransaction.sub_category_id ? String(currentTransaction.sub_category_id) : undefined,
        budget: currentTransaction.budget_type_id ? String(currentTransaction.budget_type_id) : undefined,
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
      setShowErrorModal(true);
    }
  }, [error]);

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
      setLocalError(result.error || '未知错误');
      setShowErrorModal(true);
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
                stats={statusStats}
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
          <div className="flex-1 min-h-0 overflow-y-auto">
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
              <div ref={mainContentRef} className="w-full p-6 space-y-6">
                
                {/* 账单附加区 */}
                <div>
                  <h2 className="text-sm font-semibold mb-4">合并账单</h2>
                  <div className="text-xs text-gray-500 dark:text-gray-500">此区域暂时留空</div>
                </div>

                <Divider />

                {/* 主要填写区 */}
                <div>
                  <h2 className="text-sm font-semibold mb-4">账单信息</h2>
                  
                  {/* 交易输入组件 */}
                  <div className="mb-8">
                    <TxFieldInputs 
                      selectedTxType={chainState.txType} 
                      formData={formData}
                      onChange={handleFormChange}
                    />
                  </div>

                  {/* 分隔线 */}
                  <Divider className="my-8" />

                  {/* 四联选择器组件 */}
                  <FourChainSelector 
                    mode={selectorMode}
                    value={chainState}
                    onStateChange={setChainState}
                    onSelectionChange={setChainSelection}
                  />
                </div>

                <Divider />

                {/* 拆账区 */}
                <div>
                  <h2 className="text-sm font-semibold mb-4">拆账区</h2>
                  <div className="text-xs text-gray-500 dark:text-gray-500">此区域暂时留空</div>
                </div>

                <Divider />

                {/* 调试信息区 */}
                <div>
                  <h2 className="text-sm font-semibold mb-4">调试信息 - selectedTxWithRelations</h2>
                  <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto max-h-96">
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

      {/* 错误提示 Modal */}
      <Modal 
        isOpen={showErrorModal} 
        onClose={() => {
          setShowErrorModal(false);
          setLocalError(null);
        }}
        placement="center"
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <span className="text-danger">{localError ? '操作失败' : '数据加载失败'}</span>
          </ModalHeader>
          <ModalBody>
            <p className="text-default-600">{localError || error}</p>
            {!localError && (
              <p className="text-sm text-default-400 mt-2">
                请检查您的网络连接或重新登录。如果问题持续存在，请联系管理员。
              </p>
            )}
          </ModalBody>
          <ModalFooter>
            <Button 
              color="danger" 
              variant="light" 
              onPress={() => {
                setShowErrorModal(false);
                setLocalError(null);
              }}
            >
              关闭
            </Button>
            {!localError && (
              <Button 
                color="primary" 
                onPress={() => {
                  setShowErrorModal(false);
                  setLocalError(null);
                  window.location.reload();
                }}
              >
                刷新页面
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}