"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { type TxType } from "@/types/category";
import { Skeleton } from "@heroui/skeleton";
import { BottomActionBar } from "@/components/bottom-action-bar";

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
const TransactionInput = dynamic(
  () => import("@/components/transaction-input").then(mod => ({ default: mod.TransactionInput })),
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
  const [selectedTxType, setSelectedTxType] = useState<TxType | undefined>();
  const [currentId, setCurrentId] = useState(1);
  const totalCount = 25; // 假数据：总共25条记录

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
            <TransactionInput selectedTxType={selectedTxType} />
          </div>

          {/* 分隔线 */}
          <div className="border-t border-gray-200 dark:border-gray-600 my-8"></div>

          {/* 类别选择器组件 */}
          <div>
            <CategorySelector onTxTypeChange={setSelectedTxType} />
          </div>

        </div>

      </section>

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