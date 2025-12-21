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
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { ActionBar } from "@/components/homepage/action-bar";
import { useAppData } from "@/components/context/app-data-context";
import type { TxFieldInputsData } from "@/components/homepage/tx-field-inputs";
import type { FourChainSelection, FourChainState } from "@/components/homepage/four-chain-selector";

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
  const [chainState, setChainState] = useState<FourChainState>({}); // 管理四联选择器的内部状态
  const [currentId, setCurrentId] = useState(1);
  const totalCount = 25; // 假数据：总共25条记录
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [selectorMode, setSelectorMode] = useState<"listbox" | "select">("select");
  
  // 搜索框状态
  const [searchQuery, setSearchQuery] = useState("");
  
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
          
          {/* 搜索框 */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
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
          <div className="p-4 space-y-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
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
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">账单概览区</h3>
              {/* 示例文字用于测试滚动 */}
              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-4">
                <p>
                  这是一段用于测试滚动效果的示例文字。当内容足够长时，这个区域应该可以独立滚动，
                  而不会影响到其他区域的布局。账单概览区将展示所有待处理和已处理的账单记录。
                </p>
                <p>
                  每一条账单记录都包含了详细的交易信息，包括交易时间、交易金额、交易对方、
                  交易类型等关键数据。用户可以通过点击账单记录来快速切换到对应的编辑界面。
                </p>
                <p>
                  系统支持多种支付方式的账单导入，包括支付宝、微信支付、银行卡等。
                  导入的账单会自动进行分类和标记，帮助用户更好地管理个人或企业的财务记录。
                </p>
                <p>
                  账单状态分为多种类型：未完成状态表示账单还未被处理；稍后处理状态表示用户
                  暂时跳过了该账单；已完成状态表示账单已经被正确分类和记账；终自动处理复号
                  和终自动处理跑过状态表示系统自动处理的结果。
                </p>
                <p>
                  用户可以使用搜索功能快速定位特定的账单记录，支持按名称、金额、日期等多个
                  维度进行搜索。搜索结果会实时更新，帮助用户快速找到需要的信息。
                </p>
                <p>
                  在账单编辑界面，用户可以修改账单的各项属性，包括交易类型、经济业务、会计科目、
                  交易对手等。系统提供了智能推荐功能，根据历史记录和交易特征自动推荐合适的分类。
                </p>
                <p>
                  账单数据支持批量操作，用户可以一次性处理多条相似的账单记录。系统还提供了
                  撤销和重做功能，避免误操作带来的数据错误。
                </p>
                <p>
                  所有的账单数据都会实时同步到云端，确保数据的安全性和可靠性。用户可以在
                  不同设备上访问同一账户，实现跨平台的无缝使用体验。
                </p>
                <p>
                  系统还提供了丰富的数据统计和分析功能，帮助用户了解收支情况、消费习惯等。
                  这些统计数据可以导出为Excel或PDF格式，方便用户进行进一步的分析和报告。
                </p>
                <p>
                  为了保护用户隐私，所有的敏感数据都经过加密处理。系统采用了业界领先的
                  安全技术，确保用户的财务信息不会被泄露或滥用。
                </p>
                <p>
                  账单概览区的设计遵循了简洁直观的原则，让用户能够快速浏览和定位所需信息。
                  通过合理的信息层级和视觉设计，提升了整体的使用体验。
                </p>
                <p>
                  未来我们还将持续优化和改进功能，添加更多实用的特性，如智能分类、
                  自动对账、预算管理等，让记账变得更加简单高效。
                </p>
                <p>
                  感谢您使用自动记账系统！如果您在使用过程中遇到任何问题或有任何建议，
                  欢迎随时联系我们。我们会认真听取每一位用户的反馈，不断改进产品。
                </p>
              </div>
            </div>
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
                <h2 className="text-sm font-semibold mb-4">账单附加区</h2>
                <div className="text-xs text-gray-500 dark:text-gray-500">此区域暂时留空</div>
              </div>

              <Divider />

              {/* 主要填写区 */}
              <div>
                <h2 className="text-sm font-semibold mb-4">主要填写区</h2>
                
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