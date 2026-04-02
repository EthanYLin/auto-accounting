"use client";

import type { ImportResult } from "@/lib/wechat-import/types";

import React, { useState, useCallback } from "react";
import { ChevronRightIcon, EllipsisHorizontalIcon } from "@heroicons/react/24/outline";
import { Alert } from "@heroui/react";
import Image from "next/image";
import { Checkbox } from "@heroui/react";

import { FileUpload } from "@/components/upload/file-upload";
import { useAppData } from "@/components/context/app-data-context";
import { useTransactionImport } from "@/lib/hooks/use-transaction-import";
import {
  importFromWeChatExcel,
  parseWeChatFile,
  wechatImporterDescriptions,
} from "@/lib/wechat-import";

export function WeChatImport() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [selectedImporterIndices, setSelectedImporterIndices] = useState<number[]>(() =>
    wechatImporterDescriptions.map((_, i) => i),
  );

  const appData = useAppData();
  const { createTransactions } = useTransactionImport();

  const toggleImporter = useCallback((index: number, selected: boolean) => {
    setSelectedImporterIndices((prev) => {
      if (selected) return prev.includes(index) ? prev : [...prev, index];
      return prev.filter((x) => x !== index);
    });
  }, []);

  const handleFileSelect = useCallback(
    async (file: File) => {
      setIsProcessing(true);
      setProgressMessage(null);
      setError(null);
      setResult(null);

      const onProgress = (message: string) => {
        setProgressMessage(message);
      };

      try {
        const table = await parseWeChatFile(file, onProgress);
        const importResult = await importFromWeChatExcel(
          table,
          appData,
          onProgress,
          selectedImporterIndices,
        );
        onProgress("正在保存交易记录…");
        const createResult = await createTransactions(importResult.transactions);
        if (!createResult.success) {
          setError(createResult.error ?? "保存交易记录失败");
          return;
        }

        setResult(importResult);
      } catch (err) {
        setError(err instanceof Error ? err.message : "导入失败");
      } finally {
        setIsProcessing(false);
        setProgressMessage(null);
      }
    },
    [appData, createTransactions, selectedImporterIndices],
  );

  return (
    <div className="space-y-6">
      <div className="rounded-medium border border-default-200 bg-content1 p-4">
        <p className="mb-3 text-sm font-medium text-foreground">导入后处理步骤</p>
        <ul className="flex flex-col gap-3">
          {wechatImporterDescriptions.map((description, index) => {
            const isSelected = selectedImporterIndices.includes(index);
            return (
              <li key={index} className="flex items-start gap-3">
                <Checkbox
                  classNames={{ label: "text-small" }}
                  isSelected={isSelected}
                  onValueChange={(v) => toggleImporter(index, v)}
                  size="sm"
                >
                  {description}
                </Checkbox>
              </li>
            );
          })}
        </ul>
      </div>

      <FileUpload
        onFileSelect={handleFileSelect}
        accept=".xlsx,.xls"
        isLoading={appData.isLoading || (!appData.hasLoaded && appData.error === null)}
        isProcessing={isProcessing}
        processingMessage={progressMessage ?? undefined}
        isError={!!appData.error}
        errorMessage={appData.error ?? "基础数据加载失败"}
        description="拖拽微信支付账单文件到这里"
        supportedFormats="微信支付账单(.xlsx/.xls)"
        logo={
          <Image
            alt="微信支付"
            className="w-16 h-16"
            height={64}
            src="/wechat-pay.svg"
            width={64}
          />
        }
      />

      {!error && !result && !isProcessing && (
        <Alert
          title="微信支付账单获取流程"
          description={
            <span className="inline-flex flex-wrap items-center gap-x-1">
              <span>我</span>
              <ChevronRightIcon aria-hidden className="size-[1em] shrink-0 text-current" />
              <span>服务</span>
              <ChevronRightIcon aria-hidden className="size-[1em] shrink-0 text-current" />
              <span>钱包</span>
              <ChevronRightIcon aria-hidden className="size-[1em] shrink-0 text-current" />
              <span>账单</span>
              <ChevronRightIcon aria-hidden className="size-[1em] shrink-0 text-current" />
              <span>右上角</span>
              <EllipsisHorizontalIcon aria-hidden className="size-[1em] shrink-0 text-current" />
              <ChevronRightIcon aria-hidden className="size-[1em] shrink-0 text-current" />
              <span>下载账单</span>
              <ChevronRightIcon aria-hidden className="size-[1em] shrink-0 text-current" />
              <span>用作个人对账</span>
            </span>
          }
        />
      )}

      {error && <Alert color="danger">{error}</Alert>}

      {result && <Alert color="success">成功导入 {result.importedCount} 条交易记录！</Alert>}
    </div>
  );
}
