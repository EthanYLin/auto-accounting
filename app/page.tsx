"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@heroui/skeleton";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Divider } from "@heroui/divider";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { ActionBar } from "@/components/homepage/action-bar";
import { useAppData } from "@/components/context/app-data-context";
import { useTransactionCache } from "@/components/context/transaction-cache-context";
import type { TxFieldInputsData } from "@/components/homepage/tx-field-inputs";
import type { FourChainSelection, FourChainState } from "@/components/homepage/four-chain-selector";
import { TransactionOverviewList } from "@/components/homepage/transaction-overview-list";
import { StatusFilterDropdown } from "@/components/homepage/status-filter-dropdown";
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
  const { error } = useAppData();
  const { transactions, loadTransactions, isLoading } = useTransactionCache();
  const [chainSelection, setChainSelection] = useState<FourChainSelection>(null);
  const [chainState, setChainState] = useState<FourChainState>({}); // 管理四联选择器的内部状态
  const [currentId, setCurrentId] = useState(1);
  const totalCount = 25; // 假数据：总共25条记录
  const [showErrorModal, setShowErrorModal] = useState(false);
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
    merchant: ""
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

  // 组件挂载时，如果交易数据为空，自动加载一次
  useEffect(() => {
    if (transactions.length === 0 && !isLoading) {
      loadTransactions();
    }
  }, []); // 只在挂载时执行一次

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
    if (currentId > 1) {
      setCurrentId(currentId - 1);
    }
  };

  const handleNext = () => {
    if (currentId < totalCount) {
      setCurrentId(currentId + 1);
    }
  };

  const handleIdChange = (id: number) => {
    setCurrentId(id);
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
              currentId={currentId}
              onSelectTransaction={setCurrentId}
              statusFilter={statusFilter}
              searchQuery={searchQuery}
            />
          </div>
        </aside>

        {/* 右侧主要区域 */}
        <main className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
          
          {/* ActionBar - Sticky 在顶部 */}
          <ActionBar
            currentId={currentId}
            totalCount={totalCount}
            autoSwitch={autoSwitch}
            onAutoSwitchChange={setAutoSwitch}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onIdChange={handleIdChange}
            onComplete={handleComplete}
            onLater={handleLater}
            onCancel={handleCancel}
            onSave={handleSave}
          />

          {/* 主内容区域 */}
          <div className="flex-1 min-h-0 overflow-y-auto">
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
                    selectedTxType={chainSelection?.txType} 
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

            </div>
          </div>
        </main>
      </div>

      {/* 错误提示 Modal */}
      <Modal 
        isOpen={showErrorModal} 
        onClose={() => setShowErrorModal(false)}
        placement="center"
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <span className="text-danger">数据加载失败</span>
          </ModalHeader>
          <ModalBody>
            <p className="text-default-600">{error}</p>
            <p className="text-sm text-default-400 mt-2">
              请检查您的网络连接或重新登录。如果问题持续存在，请联系管理员。
            </p>
          </ModalBody>
          <ModalFooter>
            <Button 
              color="danger" 
              variant="light" 
              onPress={() => setShowErrorModal(false)}
            >
              关闭
            </Button>
            <Button 
              color="primary" 
              onPress={() => {
                setShowErrorModal(false);
                window.location.reload();
              }}
            >
              刷新页面
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}