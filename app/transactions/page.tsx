"use client";

import type { TransactionOverviewListHandle } from "@/components/homepage/left-panel/transaction-overview-list";

import { Suspense, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Button, Spinner } from "@heroui/react";
import { ArrowDownTrayIcon, Bars3Icon, DocumentPlusIcon } from "@heroicons/react/24/outline";

import { dispatchCommand, useCommandListener } from "@/lib/commands";
import { useTransactionEditorHotkeys } from "@/lib/hooks/use-transaction-editor-hotkeys";
import { ActionBar } from "@/components/homepage/action-bar";
import { TxFieldInputs } from "@/components/homepage/tx-field-inputs";
import { TxImportInfo } from "@/components/homepage/tx-import-info";
import { TransactionEditorFourChainSelector } from "@/components/homepage/common/four-chain-selector";
import { TransactionSidebar } from "@/components/homepage/left-panel/transaction-sidebar";
import { TxSupplementTabs } from "@/components/homepage/tx-supplement-tabs";
import { useAppData } from "@/components/context/app-data-context";
import { useError } from "@/components/context/error-context";
import { useTransactionEditor } from "@/components/context/transaction-editor-context";
import { useTransactionStore } from "@/components/context/transaction-store-context";
import { useTransactionFilter } from "@/lib/hooks/use-transaction-filter";
import { useTransactionNavigation } from "@/lib/hooks/use-transaction-navigation";

export default function TransactionsRoutePageWrapper() {
  return (
    <Suspense>
      <TransactionsRoutePage />
    </Suspense>
  );
}

function TransactionsRoutePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showError } = useError();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const transactionListRef = useRef<TransactionOverviewListHandle>(null);
  const [routeTxId, setRouteTxId] = useState<number | null>(null);
  const appData = useAppData();
  const store = useTransactionStore();
  const editor = useTransactionEditor();
  const isEditorLoading =
    !appData.hasLoaded ||
    (appData.accounts.length > 0 && !store.hasLoaded) ||
    editor.isCreatingTransaction;

  useEffect(() => {
    if (appData.error) {
      showError(
        "数据加载失败",
        `${appData.error}\n\n请检查您的网络连接或重新登录。如果问题持续存在，请联系管理员。`,
      );
    }
  }, [appData.error, showError]);

  useEffect(() => {
    if (store.error) {
      showError("交易数据错误", store.error);
    }
  }, [store.error, showError]);

  const search = useTransactionFilter(store.transactions, editor.currentTransaction?.id);

  useEffect(() => {
    editor.setFilteredTransactions(search.filteredTransactions);
  }, [search.filteredTransactions, editor.setFilteredTransactions]);

  const navigation = useTransactionNavigation({
    filteredTransactions: search.filteredTransactions,
    currentIndex: editor.currentIndex,
    totalCount: editor.totalCount,
    onSelectTransaction: editor.selectTransaction,
    onLocateCurrent: (id) => transactionListRef.current?.scrollToTransaction(id),
  });

  useEffect(() => {
    const rawId = searchParams.get("id");
    if (!rawId) {
      setRouteTxId(null);
      return;
    }

    const parsedId = Number(rawId);
    setRouteTxId(Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null);
  }, [searchParams]);

  useEffect(() => {
    if (routeTxId === null) return;
    if (store.transactions.some((tx) => tx.id === routeTxId) && editor.currentId !== routeTxId) {
      editor.selectTransaction(routeTxId);
      return;
    }
    if (!store.isFetching && appData.hasLoaded) {
      setRouteTxId(null);
    }
  }, [
    appData.hasLoaded,
    editor.currentId,
    editor.selectTransaction,
    routeTxId,
    store.isFetching,
    store.transactions,
  ]);

  useEffect(() => {
    if (routeTxId === null) return;
    if (editor.currentTransaction?.id !== routeTxId) return;
    if (!search.filteredTransactions.some((tx) => tx.id === routeTxId)) return;

    navigation.locateCurrent();
    setRouteTxId(null);
  }, [
    editor.currentTransaction?.id,
    navigation.locateCurrent,
    routeTxId,
    search.filteredTransactions,
  ]);

  const hasAutoSelectedRef = useRef(false);

  useEffect(() => {
    if (!appData.hasLoaded || !store.hasLoaded) return;
    if (hasAutoSelectedRef.current) return;
    hasAutoSelectedRef.current = true;

    if (routeTxId !== null) return;
    if (editor.currentId !== null) return;

    const TARGET_STATUSES = new Set(["待处理", "经自动处理填写", "经自动处理取消"]);
    const firstTarget = search.filteredTransactions.find(
      (tx) => tx.status !== null && TARGET_STATUSES.has(tx.status),
    );
    if (firstTarget) {
      editor.selectTransaction(firstTarget.id);
      transactionListRef.current?.scrollToTransaction(firstTarget.id);
    }
  }, [appData.hasLoaded, store.hasLoaded]);

  useTransactionEditorHotkeys();

  useCommandListener("focus-search", () => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  });

  const handleImport = () => router.push("/upload");
  const handleCreate = async () => {
    const result = await editor.createEmptyTransaction();
    if (result.success && result.data) {
      editor.selectTransaction(result.data.id);
    } else {
      showError("操作失败", result.error || "未知错误");
    }
  };

  useCommandListener("create", () => void handleCreate());

  const { currentTransaction, currentIndex } = editor;

  return (
    <motion.div
      className="flex flex-1 w-full min-h-0 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
    >
      <TransactionSidebar
        searchInputRef={searchInputRef}
        transactionListRef={transactionListRef}
        search={search}
        currentTransactionId={currentTransaction?.id}
        onSelectTransaction={editor.selectTransaction}
      />

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {currentTransaction !== null && currentIndex > 0 && (
          <ActionBar
            sidebarToggle={
              <Button
                isIconOnly
                variant="light"
                size="sm"
                onPress={() => dispatchCommand("toggle-sidebar")}
                aria-label="切换侧栏"
                className="md:hidden flex-shrink-0"
              >
                <Bars3Icon className="h-5 w-5" />
              </Button>
            }
          />
        )}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {isEditorLoading ? (
            <div className="flex h-full items-center justify-center">
              <Spinner size="sm" />
            </div>
          ) : store.transactions.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="mb-2 text-lg text-gray-500 dark:text-zinc-400">暂无账单</p>
                <p className="mb-6 text-sm text-gray-400 dark:text-zinc-500">请先新建或导入账单</p>
                <div className="flex justify-center gap-3">
                  <Button
                    size="sm"
                    color="default"
                    variant="flat"
                    startContent={<DocumentPlusIcon className="h-4 w-4" />}
                    onPress={handleCreate}
                  >
                    新建记录
                  </Button>
                  <Button
                    size="sm"
                    color="default"
                    variant="flat"
                    startContent={<ArrowDownTrayIcon className="h-4 w-4" />}
                    onPress={handleImport}
                  >
                    导入账单
                  </Button>
                </div>
              </div>
            </div>
          ) : currentTransaction === null ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="mb-2 text-lg text-gray-500 dark:text-zinc-400">未选择账单</p>
                <p className="mb-6 text-sm text-gray-400 dark:text-zinc-500">
                  请先在左侧选择一个账单
                </p>
                <div className="flex justify-center gap-3">
                  <Button
                    size="sm"
                    color="default"
                    variant="flat"
                    startContent={<Bars3Icon className="h-4 w-4" />}
                    onPress={() => dispatchCommand("toggle-sidebar")}
                    className="md:hidden"
                  >
                    打开列表
                  </Button>
                  <Button
                    size="sm"
                    color="default"
                    variant="flat"
                    startContent={<DocumentPlusIcon className="h-4 w-4" />}
                    onPress={handleCreate}
                  >
                    新建记录
                  </Button>
                  <Button
                    size="sm"
                    color="default"
                    variant="flat"
                    startContent={<ArrowDownTrayIcon className="h-4 w-4" />}
                    onPress={handleImport}
                  >
                    导入账单
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full space-y-5 px-5 py-2">
              {editor.validationAlert && (
                <Alert
                  color={editor.validationAlert.type}
                  variant="flat"
                  title={editor.validationAlert.title}
                  description={
                    <ul className="mt-0.5 space-y-0.5">
                      {editor.validationAlert.hints.map((hint, i) => (
                        <li key={`${i}-${hint}`}>• {hint}</li>
                      ))}
                    </ul>
                  }
                />
              )}

              <TxSupplementTabs />

              <div className="min-w-0">
                <TxImportInfo key={currentTransaction.id} />

                <section aria-labelledby="tx-detail-section-title" className="mt-5 min-w-0 sm:mt-6">
                  <h2
                    id="tx-detail-section-title"
                    className="mb-3 text-sm font-semibold text-foreground-600 dark:text-zinc-400 sm:mb-3.5"
                  >
                    交易明细
                  </h2>
                  <TxFieldInputs
                    key={currentTransaction.id}
                    selectedTxType={currentTransaction.transaction_type || undefined}
                  />
                </section>

                <section
                  aria-labelledby="tx-classification-section-title"
                  className="mt-6 min-w-0 sm:mt-8"
                >
                  <h2
                    id="tx-classification-section-title"
                    className="mb-1.5 text-sm font-semibold text-foreground-600 dark:text-zinc-400 sm:mb-2"
                  >
                    交易分类
                  </h2>
                  <div className="lg:block hidden">
                    <TransactionEditorFourChainSelector mode="listbox" />
                  </div>
                  <div className="lg:hidden block">
                    <TransactionEditorFourChainSelector mode="select" />
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>
      </main>
    </motion.div>
  );
}
