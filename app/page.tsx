"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@heroui/skeleton";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Divider } from "@heroui/divider";
import { Accordion, AccordionItem } from "@heroui/accordion";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { ActionBar } from "@/components/homepage/action-bar";
import { useAppData } from "@/components/context/app-data-context";
import type { TxFieldInputsData } from "@/components/homepage/tx-field-inputs";
import type { FourChainSelection } from "@/components/homepage/four-chain-selector";

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
  const [chainSelection, setChainSelection] = useState<FourChainSelection>(null);
  const [currentId, setCurrentId] = useState(1);
  const totalCount = 25; // 假数据：总共25条记录
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [selectorMode, setSelectorMode] = useState<"listbox" | "select">("select");
  
  // 搜索框状态
  const [searchQuery, setSearchQuery] = useState("");
  
  // 自动切换状态
  const [autoSwitch, setAutoSwitch] = useState(false);
  
  // 四联选择器容器的引用
  const selectorContainerRef = useRef<HTMLDivElement>(null);

  // 表单数据状态
  const [formData, setFormData] = useState<TxFieldInputsData>({
    amount: "",
    account: "",
    date: null,
    name: "",
    merchant: ""
  });
  
  // Mock 数据 - 状态统计
  const mockStats = {
    pending: 8,
    needsProcessing: 9,
    completed: 20,
    autoProcessed: 20,
    cancelled: 20,
    autoProcessingPassed: 20
  };

  // 动态检测容器宽度并设置选择器模式
  useEffect(() => {
    const container = selectorContainerRef.current;
    if (!container) return;

    // 四个 listbox 每个最小 192px，加上间距约 48px，总共约 816px
    // 为了安全起见，设置阈值为 850px
    const MIN_WIDTH_FOR_LISTBOX = 850;

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
      <div className="flex h-screen overflow-hidden">
        
        {/* 左侧 Sidebar */}
        <aside className="w-80 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col overflow-hidden">
          
          {/* 搜索框 */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <Input
              placeholder="搜索名称, 金额..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              startContent={<MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />}
              variant="bordered"
              size="sm"
            />
          </div>

          {/* 状态看板 */}
          <div className="p-4 space-y-3 border-b border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-2">
              <Card shadow="sm" className="border border-gray-200 dark:border-gray-700">
                <CardBody className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">未完成</span>
                    <Chip size="sm" color="warning" variant="flat">{mockStats.pending}</Chip>
                  </div>
                </CardBody>
              </Card>
              
              <Card shadow="sm" className="border border-gray-200 dark:border-gray-700">
                <CardBody className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">稍后处理</span>
                    <Chip size="sm" color="default" variant="flat">{mockStats.needsProcessing}</Chip>
                  </div>
                </CardBody>
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Card shadow="sm" className="border border-gray-200 dark:border-gray-700">
                <CardBody className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">已完成</span>
                    <Chip size="sm" color="success" variant="flat">{mockStats.completed}</Chip>
                  </div>
                </CardBody>
              </Card>
              
              <Card shadow="sm" className="border border-gray-200 dark:border-gray-700">
                <CardBody className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400 truncate">终自动处理复号</span>
                    <Chip size="sm" color="primary" variant="flat">{mockStats.autoProcessed}</Chip>
                  </div>
                </CardBody>
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Card shadow="sm" className="border border-gray-200 dark:border-gray-700">
                <CardBody className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">已取消</span>
                    <Chip size="sm" color="danger" variant="flat">{mockStats.cancelled}</Chip>
                  </div>
                </CardBody>
              </Card>
              
              <Card shadow="sm" className="border border-gray-200 dark:border-gray-700">
                <CardBody className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400 truncate">终自动处理跑过</span>
                    <Chip size="sm" color="secondary" variant="flat">{mockStats.autoProcessingPassed}</Chip>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>

          {/* 账单概览区 - 占据剩余空间 */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">账单概览区</h3>
              {/* 留空，暂不设计 */}
              <div className="text-xs text-gray-500 dark:text-gray-500">此区域暂时留空</div>
            </div>
          </div>
        </aside>

        {/* 右侧主要区域 */}
        <main className="flex-1 flex flex-col overflow-hidden">
          
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

          {/* 主内容区域 - 可滚动 */}
          <div className="flex-1 overflow-y-auto">
            <div className="w-full p-6">
              
              <Accordion 
                variant="light"
                selectionMode="multiple"
                defaultExpandedKeys={["main"]}
              >
                {/* 账单附加区 */}
                <AccordionItem 
                  key="attachment"
                  aria-label="账单附加区"
                  title={<span className="text-sm font-semibold">账单附加区</span>}
                >
                  <div className="px-4 pb-4">
                    <div className="text-xs text-gray-500 dark:text-gray-500">此区域暂时留空</div>
                  </div>
                </AccordionItem>

                {/* 主要填写区 */}
                <AccordionItem 
                  key="main"
                  aria-label="主要填写区"
                  title={<span className="text-sm font-semibold">主要填写区</span>}
                >
                  <div className="px-4 pb-4">
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
                    <div ref={selectorContainerRef}>
                      <FourChainSelector 
                        mode={selectorMode}
                        onSelectionChange={setChainSelection}
                      />
                    </div>
                  </div>
                </AccordionItem>

                {/* 拆账区 */}
                <AccordionItem 
                  key="split"
                  aria-label="拆账区"
                  title={<span className="text-sm font-semibold">拆账区</span>}
                >
                  <div className="px-4 pb-4">
                    <div className="text-xs text-gray-500 dark:text-gray-500">此区域暂时留空</div>
                  </div>
                </AccordionItem>
              </Accordion>

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