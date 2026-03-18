"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@heroui/react";
import { Button } from "@heroui/react";
import { Input } from "@heroui/react";
import { Alert } from "@heroui/react";
import { Divider } from "@heroui/react";
import { MagnifyingGlassIcon, DocumentPlusIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { ActionBar } from "@/components/homepage/action-bar";
import { useAppData } from "@/components/context/app-data-context";
import { useTransactionStore } from "@/components/context/transaction-store-context";
import { useTransactionEditor } from "@/components/context/transaction-editor-context";
import { useError } from "@/components/context/error-context";
import { TxFieldInputs } from "@/components/homepage/tx-field-inputs";
import { TransactionEditorFourChainSelector } from "@/components/homepage/common/four-chain-selector";
import { TransactionOverviewList } from "@/components/homepage/left-panel/transaction-overview-list";
import type { TransactionOverviewListHandle } from "@/components/homepage/left-panel/transaction-overview-list";
import { StatusFilterDropdown } from "@/components/homepage/left-panel/status-filter-dropdown";
import { TxParentArea } from "@/components/homepage/tx-parent-area";
import { SplitEntryArea } from "@/components/homepage/split-area/split-entry-area";
import { useTransactionFilter } from "@/lib/hooks/use-transaction-filter";
import { useTransactionNavigation } from "@/lib/hooks/use-transaction-navigation";

export default function Home() {

  const router = useRouter();
  const { showError } = useError();
  const transactionListRef = useRef<TransactionOverviewListHandle>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const [selectorMode, setSelectorMode] = useState<"listbox" | "select">("select");

  // 全局数据
  const appData = useAppData();
  const store = useTransactionStore();
  const editor = useTransactionEditor();
  const hasLoadedAppData = appData.hasLoaded;

  useEffect(() => {
    if (appData.error) {
      showError('数据加载失败', `${appData.error}\n\n请检查您的网络连接或重新登录。如果问题持续存在，请联系管理员。`);
    }
  }, [appData.error, showError]);

  useEffect(() => {
    if (store.error) {
      showError('交易数据错误', store.error);
    }
  }, [store.error, showError]);

  // 搜索/过滤
  const search = useTransactionFilter(store.transactions);

  // 将过滤后的列表同步给 editor（供 currentIndex 计算）
  useEffect(() => {
    editor.setFilteredTransactions(search.filteredTransactions);
  }, [search.filteredTransactions, editor.setFilteredTransactions]);

  // 导航
  const navigation = useTransactionNavigation({
    filteredTransactions: search.filteredTransactions,
    currentIndex: editor.currentIndex,
    totalCount: editor.totalCount,
    onSelectTransaction: editor.selectTransaction,
    onLocateCurrent: () => transactionListRef.current?.scrollToCurrent(),
  });

  // 动态检测容器宽度并设置选择器模式
  useEffect(() => {
    const container = mainContentRef.current;
    if (!container) return;
    const MIN_WIDTH_FOR_LISTBOX = 810;
    const updateSelectorMode = () => {
      setSelectorMode(container.offsetWidth >= MIN_WIDTH_FOR_LISTBOX ? "listbox" : "select");
    };
    const resizeObserver = new ResizeObserver(() => updateSelectorMode());
    resizeObserver.observe(container);
    updateSelectorMode();
    return () => resizeObserver.disconnect();
  }, []);

  // 事件处理
  const handleImport = () => router.push('/upload');
  const handleCreate = async () => {
    const result = await store.createEmptyTransaction();
    if (result.success && result.data) {
      editor.selectTransaction(result.data.id);
    } else {
      showError('操作失败', result.error || '未知错误');
    }
  };

  const { currentTransaction, currentIndex } = editor;

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
                value={search.searchQuery}
                onValueChange={search.setSearchQuery}
                startContent={<MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />}
                variant="bordered"
                size="sm"
                className="flex-1"
              />
              <StatusFilterDropdown
                statusFilter={search.statusFilter}
                onStatusFilterChange={search.setStatusFilter}
              />
            </div>
          </div>

          {/* 账单概览区 */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <TransactionOverviewList
              ref={transactionListRef}
              currentId={currentTransaction?.id}
              onSelectTransaction={editor.selectTransaction}
              filteredTransactions={search.filteredTransactions}
              isFiltered={search.isFiltered}
              onClearFilters={search.clearFilters}
            />
          </div>
        </aside>

        {/* 右侧主要区域 */}
        <main className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">

          {/* ActionBar */}
          {currentTransaction !== null && currentIndex > 0 && (
            <ActionBar
              navigation={navigation}
            />
          )}

          {/* 主内容区域 */}
          <div ref={mainContentRef} className="flex-1 min-h-0 overflow-y-auto">
            {/* AppData 加载中 */}
            {!hasLoadedAppData ? (
              <div className="flex items-center justify-center h-full">
                <Spinner size="sm" />
              </div>
            ) : store.transactions.length === 0 ? (
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
            ) : currentTransaction === null ? (
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
                {/* 校验提示区域 */}
                {editor.validationAlert && (
                  <Alert
                    color={editor.validationAlert.type}
                    variant="flat"
                    title={editor.validationAlert.title}
                    description={
                      <ul className="space-y-0.5 mt-0.5">
                        {editor.validationAlert.hints.map((hint, i) => (
                          <li key={`${i}-${hint}`}>• {hint}</li>
                        ))}
                      </ul>
                    }
                  />
                )}

                {/* 账单附加区 */}
                <TxParentArea />

                <Divider />

                {/* 主要填写区 */}
                <div>
                  <div className="mb-5">
                    <TxFieldInputs
                      selectedTxType={currentTransaction?.transaction_type || undefined}
                    />
                  </div>

                  <div className="h-2" />

                  <TransactionEditorFourChainSelector mode={selectorMode} />
                </div>

                {/* 拆账区（子交易不显示） */}
                {currentTransaction && !currentTransaction.parent_id && (
                  <>
                    <Divider />
                    <SplitEntryArea />
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
