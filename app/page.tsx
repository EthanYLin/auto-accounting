"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@heroui/skeleton";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { BottomActionBar } from "@/components/bottom-action-bar";
import { useAppData } from "@/contexts/app-data-context";
import type { TransactionType } from "@/types";
import type { TxFieldInputsData } from "@/components/tx-field-inputs";

// 使用 dynamic import 替代 NoSSR
const CategorySelector = dynamic(
  () => import("@/components/category-selector").then(mod => ({ default: mod.CategorySelector })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full max-w-6xl">
        <div className="flex gap-4 justify-center mb-6 flex-wrap">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-48">
              <Skeleton className="h-4 w-16 rounded mb-2" /> {/* 标签 */}
              <Skeleton className="h-64 w-full rounded-lg" /> {/* 选择框*/}
            </div>
          ))}
        </div>
      </div>
    )
  }
);

// 交易输入组件
const TxFieldInputs = dynamic(
  () => import("@/components/tx-field-inputs").then(mod => ({ default: mod.TxFieldInputs })),
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
  const { accounts, mainCategories, subCategories, budgetTypes, error, isLoading } = useAppData();
  const [selectedTxType, setSelectedTxType] = useState<TransactionType | undefined>();
  const [currentId, setCurrentId] = useState(1);
  const totalCount = 25; // 假数据：总共25条记录
  const [showErrorModal, setShowErrorModal] = useState(false);

  // 表单数据状态
  const [formData, setFormData] = useState<TxFieldInputsData>({
    amount: "",
    account: "",
    date: null,
    name: "",
    merchant: ""
  });

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
              selectedTxType={selectedTxType} 
              formData={formData}
              onChange={handleFormChange}
            />
          </div>

          {/* 分隔线 */}
          <div className="border-t border-gray-200 dark:border-gray-600 my-8"></div>

          {/* 类别选择器组件 */}
          <div>
            <CategorySelector onTxTypeChange={setSelectedTxType} />
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded text-xs text-gray-800 dark:bg-gray-700 dark:text-gray-200">
            <div><b>TxFieldInputs 数据：</b></div>
            <pre className="whitespace-pre-wrap break-all">
              {JSON.stringify(formData, null, 2)}
            </pre>
          </div>

        </div>

        {/* 数据库数据显示区域 */}
        <div className="w-full max-w-6xl mt-8 space-y-4">
          {/* 账户数据 */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-600">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
              账户列表 ({accounts.length})
            </h3>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full rounded" />
                <Skeleton className="h-8 w-full rounded" />
              </div>
            ) : accounts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-4">ID</th>
                      <th className="text-left py-2 px-4">账户名称</th>
                      <th className="text-left py-2 px-4">用户ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((account) => (
                      <tr key={account.id} className="border-b border-gray-100 dark:border-gray-700">
                        <td className="py-2 px-4">{account.id}</td>
                        <td className="py-2 px-4 font-medium">{account.name}</td>
                        <td className="py-2 px-4 text-xs text-gray-500">{account.user_id.slice(0, 8)}...</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">暂无账户数据</p>
            )}
          </div>

          {/* 主类别数据 */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-600">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
              主类别列表 ({mainCategories.length})
            </h3>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full rounded" />
                <Skeleton className="h-8 w-full rounded" />
              </div>
            ) : mainCategories.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-4">ID</th>
                      <th className="text-left py-2 px-4">图标</th>
                      <th className="text-left py-2 px-4">名称</th>
                      <th className="text-left py-2 px-4">交易类型</th>
                      <th className="text-left py-2 px-4">颜色</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mainCategories.map((category) => (
                      <tr key={category.id} className="border-b border-gray-100 dark:border-gray-700">
                        <td className="py-2 px-4">{category.id}</td>
                        <td className="py-2 px-4 text-lg">{category.icon}</td>
                        <td className="py-2 px-4 font-medium">{category.label}</td>
                        <td className="py-2 px-4">
                          <span className="px-2 py-1 rounded text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                            {category.transaction_type}
                          </span>
                        </td>
                        <td className="py-2 px-4">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-6 h-6 rounded border border-gray-300"
                              style={{ backgroundColor: category.back_color }}
                            />
                            <span className="text-xs text-gray-500">{category.back_color}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">暂无主类别数据</p>
            )}
          </div>

          {/* 子类别数据 */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-600">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
              子类别列表 ({subCategories.length})
            </h3>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full rounded" />
                <Skeleton className="h-8 w-full rounded" />
              </div>
            ) : subCategories.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-4">ID</th>
                      <th className="text-left py-2 px-4">图标</th>
                      <th className="text-left py-2 px-4">名称</th>
                      <th className="text-left py-2 px-4">主类别ID</th>
                      <th className="text-left py-2 px-4">预算计划ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subCategories.map((category) => (
                      <tr key={category.id} className="border-b border-gray-100 dark:border-gray-700">
                        <td className="py-2 px-4">{category.id}</td>
                        <td className="py-2 px-4 text-lg">{category.icon}</td>
                        <td className="py-2 px-4 font-medium">{category.label}</td>
                        <td className="py-2 px-4">{category.main_category_id}</td>
                        <td className="py-2 px-4">{category.budget_type_id || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">暂无子类别数据</p>
            )}
          </div>

          {/* 预算计划数据 */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-600 mb-24">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
              预算计划列表 ({budgetTypes.length})
            </h3>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full rounded" />
                <Skeleton className="h-8 w-full rounded" />
              </div>
            ) : budgetTypes.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-4">ID</th>
                      <th className="text-left py-2 px-4">名称</th>
                      <th className="text-left py-2 px-4">用户ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {budgetTypes.map((budget) => (
                      <tr key={budget.id} className="border-b border-gray-100 dark:border-gray-700">
                        <td className="py-2 px-4">{budget.id}</td>
                        <td className="py-2 px-4 font-medium">{budget.name}</td>
                        <td className="py-2 px-4 text-xs text-gray-500">{budget.user_id.slice(0, 8)}...</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">暂无预算计划数据</p>
            )}
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