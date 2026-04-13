"use client";

import type { TransactionWithRelations } from "@/types";

import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AgGridReact } from "ag-grid-react";
import {
  BackspaceIcon,
  ChevronDownIcon,
  CloudArrowUpIcon,
  MagnifyingGlassIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import {
  addToast,
  Button,
  ButtonGroup,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";

import { deleteAllTransactions } from "@/app/actions/data";
import { useTransactionEditor } from "@/components/context/transaction-editor-context";
import { useTransactionStore } from "@/components/context/transaction-store-context";
import { OverviewTransactionsGrid } from "@/components/overview/overview-transactions-grid";

export default function OverviewPage() {
  const [quickFilterDraft, setQuickFilterDraft] = useState("");
  const [appliedQuickFilter, setAppliedQuickFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [busyAction, setBusyAction] = useState<"save" | "delete" | "clear" | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isClearAllOpen, setIsClearAllOpen] = useState(false);
  const [clearAllConfirmText, setClearAllConfirmText] = useState("");
  const gridRef = useRef<AgGridReact<TransactionWithRelations>>(null);
  const editor = useTransactionEditor();
  const store = useTransactionStore();
  const { transactions } = store;
  const dirtyCount = store.getDirtyIds().length;
  const isBusy = store.saveState !== "idle" || busyAction !== null;

  const handleDeleteConfirm = useCallback(async () => {
    if (selectedIds.length === 0 || isBusy) return;
    const count = selectedIds.length;
    setBusyAction("delete");
    try {
      const result = await store.deleteTransactions(selectedIds);
      if (result.success) {
        setIsDeleteConfirmOpen(false);
        gridRef.current?.api.deselectAll();
        setSelectedIds([]);
        addToast({ title: `已删除 ${count} 笔交易`, color: "success" });
      } else {
        addToast({ title: "删除失败", description: result.error || "未知错误", color: "danger" });
      }
    } finally {
      setBusyAction(null);
    }
  }, [selectedIds, isBusy, store]);

  const handleClearAllConfirm = useCallback(async () => {
    if (isBusy || clearAllConfirmText.trim() !== String(transactions.length)) return;
    setBusyAction("clear");
    try {
      const result = await deleteAllTransactions();
      if (!result.success) {
        addToast({ title: "清空失败", description: result.error || "未知错误", color: "danger" });
        return;
      }
      gridRef.current?.api.deselectAll();
      setSelectedIds([]);
      await store.loadTransactions();
      setIsClearAllOpen(false);
      setClearAllConfirmText("");
      addToast({ title: `已清空 ${transactions.length} 笔交易`, color: "success" });
    } finally {
      setBusyAction(null);
    }
  }, [isBusy, clearAllConfirmText, transactions.length, store]);

  const revealTransition = { duration: 0.42, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <motion.div
      className="flex min-h-0 flex-1 flex-col gap-4 p-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={revealTransition}
    >
      <div>
        <h1 className="text-2xl font-bold">总览</h1>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 rounded-lg bg-content1 p-2">
        <div className="px-1 py-1">
          <div className="flex flex-col gap-3">
            <div className="flex flex-row flex-wrap items-center gap-2">
              <Button
                color="primary"
                variant={dirtyCount === 0 || isBusy ? "light" : "solid"}
                size="sm"
                className="justify-start"
                startContent={
                  busyAction !== "save" ? (
                    <CloudArrowUpIcon className="h-4 w-4" aria-hidden />
                  ) : undefined
                }
                isLoading={busyAction === "save"}
                isDisabled={dirtyCount === 0 || isBusy}
                onPress={async () => {
                  if (dirtyCount === 0 || isBusy) return;
                  setBusyAction("save");
                  try {
                    const result = await editor.saveAllDirtyToServer();
                    if (result.success) {
                      addToast({ title: `已保存 ${dirtyCount} 条修改`, color: "success" });
                    } else {
                      addToast({
                        title: "保存失败",
                        description: result.error || "未知错误",
                        color: "danger",
                      });
                    }
                  } finally {
                    setBusyAction(null);
                  }
                }}
              >
                保存修改({dirtyCount})
              </Button>
              <ButtonGroup size="sm" variant="light">
                <Button
                  color="danger"
                  variant="light"
                  className="justify-start"
                  startContent={<BackspaceIcon className="h-4 w-4" aria-hidden />}
                  isDisabled={selectedIds.length === 0 || isBusy}
                  onPress={() => {
                    if (selectedIds.length === 0 || isBusy) return;
                    setIsDeleteConfirmOpen(true);
                  }}
                >
                  删除交易({selectedIds.length})
                </Button>
                <Dropdown placement="bottom-end">
                  <DropdownTrigger>
                    <Button
                      isIconOnly
                      color="danger"
                      aria-label="更多删除操作"
                      isDisabled={transactions.length === 0 || isBusy}
                    >
                      <ChevronDownIcon className="h-4 w-4" aria-hidden />
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu
                    aria-label="更多删除操作"
                    disabledKeys={transactions.length === 0 || isBusy ? ["clear-all"] : []}
                    itemClasses={{
                      base: "text-danger data-[hover=true]:bg-danger/10",
                      title: "text-danger",
                    }}
                    onAction={(key) => {
                      if (key !== "clear-all" || transactions.length === 0 || isBusy) return;
                      setClearAllConfirmText("");
                      setIsClearAllOpen(true);
                    }}
                  >
                    <DropdownItem
                      key="clear-all"
                      color="danger"
                      startContent={<TrashIcon className="h-4 w-4" aria-hidden />}
                    >
                      清空所有交易({transactions.length})
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </ButtonGroup>
            </div>
            <div className="flex w-full flex-col gap-2 lg:flex-row lg:items-center">
              <Input
                aria-label="快速搜索表格"
                className="min-w-0 flex-1"
                classNames={{ input: "text-base sm:text-small" }}
                size="sm"
                placeholder="快速搜索（用空格分隔多个关键词）"
                value={quickFilterDraft}
                onValueChange={setQuickFilterDraft}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setAppliedQuickFilter((e.currentTarget as HTMLInputElement).value.trim());
                  }
                }}
              />
              <Button
                color="primary"
                size="sm"
                className="shrink-0"
                startContent={<MagnifyingGlassIcon className="h-4 w-4" aria-hidden />}
                onPress={() => setAppliedQuickFilter(quickFilterDraft.trim())}
              >
                搜索
              </Button>
            </div>
          </div>
        </div>
        <OverviewTransactionsGrid
          gridRef={gridRef}
          quickFilterText={appliedQuickFilter}
          onSelectionChange={setSelectedIds}
        />
      </div>
      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          if (isBusy) return;
          setIsDeleteConfirmOpen(false);
        }}
        size="sm"
      >
        <ModalContent
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleDeleteConfirm();
            }
          }}
        >
          <ModalHeader>删除交易</ModalHeader>
          <ModalBody>
            <p className="text-sm leading-6 text-default-600">
              {busyAction === "delete" ? (
                "正在删除…"
              ) : (
                <>
                  将要删除选中的{" "}
                  <span className="font-semibold text-danger">{selectedIds.length}</span>{" "}
                  笔交易。此操作无法撤销。
                </>
              )}
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              isDisabled={isBusy}
              onPress={() => setIsDeleteConfirmOpen(false)}
            >
              取消
            </Button>
            <Button
              color="danger"
              isLoading={busyAction === "delete"}
              isDisabled={selectedIds.length === 0 || isBusy}
              onPress={handleDeleteConfirm}
            >
              确认删除
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <Modal
        isOpen={isClearAllOpen}
        onClose={() => {
          if (isBusy) return;
          setIsClearAllOpen(false);
          setClearAllConfirmText("");
        }}
        size="md"
      >
        <ModalContent
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleClearAllConfirm();
            }
          }}
        >
          <ModalHeader>清空所有交易</ModalHeader>
          <ModalBody className="space-y-4">
            <p className="text-sm leading-6 text-default-600">
              这会永久删除全部{" "}
              <span className="text-3xl font-bold tracking-tight text-danger">
                {transactions.length}
              </span>{" "}
              笔交易，且无法撤销。
            </p>
            <Input
              aria-label="输入交易数量以确认删除"
              color="danger"
              variant="bordered"
              label={`请输入 ${transactions.length} 以确认`}
              value={clearAllConfirmText}
              onValueChange={setClearAllConfirmText}
            />
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              isDisabled={isBusy}
              onPress={() => {
                setIsClearAllOpen(false);
                setClearAllConfirmText("");
              }}
            >
              取消
            </Button>
            <Button
              color="danger"
              isLoading={busyAction === "clear"}
              isDisabled={isBusy || clearAllConfirmText.trim() !== String(transactions.length)}
              onPress={handleClearAllConfirm}
            >
              确认清空
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </motion.div>
  );
}
