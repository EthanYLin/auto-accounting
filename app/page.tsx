"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@heroui/skeleton";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { BottomActionBar } from "@/components/homepage/bottom-action-bar";
import { useAppData } from "@/components/context/app-data-context";
import type { TxFieldInputsData } from "@/components/homepage/tx-field-inputs";
import type { FourChainSelection } from "@/components/homepage/four-chain-selector";

// 使用 dynamic import 替代 NoSSR
const FourChainSelector = dynamic(
  () => import("@/components/homepage/four-chain-selector").then(mod => ({ default: mod.FourChainSelector })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full max-w-6xl mb-6">
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
      <div className="w-full max-w-6xl">
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

  // 表单数据状态
  const [formData, setFormData] = useState<TxFieldInputsData>({
    amount: "",
    account: "",
    date: null,
    name: "",
    merchant: ""
  });

  // 检测屏幕尺寸并设置选择器模式
  useEffect(() => {
    const handleResize = () => {
      setSelectorMode(window.innerWidth >= 950 ? "listbox" : "select");
    };

    // 初始化
    handleResize();

    // 监听窗口大小变化
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
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

  // 底部操作栏事件处理函数
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
      <section className="flex flex-col items-center justify-center gap-8 py-8 md:py-10 pb-20">
        
        {/* 大的圆角矩形容器包裹两个组件 */}
        <div className="w-full max-w-6xl bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-600">
          
          {/* 交易输入组件 */}
          <div className="mb-8">
            <TxFieldInputs 
              selectedTxType={chainSelection?.txType} 
              formData={formData}
              onChange={handleFormChange}
            />
          </div>

          {/* 分隔线 */}
          <div className="border-t border-gray-200 dark:border-gray-600 my-8"></div>

          {/* 四联选择器组件 */}
          <div>
            <FourChainSelector 
              mode={selectorMode}
              onSelectionChange={setChainSelection}
            />
          </div>

          {/* 调试信息 */}
          <div className="mt-4 p-4 bg-gray-50 rounded text-xs text-gray-800 dark:bg-gray-700 dark:text-gray-200">
            <div><b>表单数据：</b></div>
            <pre className="whitespace-pre-wrap break-all">
              {JSON.stringify({
                formData,
                chainSelection: chainSelection ? {
                  txType: chainSelection.txType,
                  mainCategory: chainSelection.mainCategory?.label,
                  subCategory: chainSelection.subCategory?.label,
                  budgetType: chainSelection.budgetType?.name,
                } : null
              }, null, 2)}
            </pre>
          </div>

        </div>

      </section>

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

      {/* 底部操作栏 */}
      <BottomActionBar
        currentId={currentId}
        totalCount={totalCount}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onIdChange={handleIdChange}
        onComplete={handleComplete}
        onLater={handleLater}
        onCancel={handleCancel}
        onSave={handleSave}
      />
    </>
  );
}