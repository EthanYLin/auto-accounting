"use client";

import type { ImportResult } from "@/lib/wechat-import/types";
import type { Transaction } from "@/types";

import React, { useState, useCallback } from "react";
import { ChevronRightIcon, EllipsisHorizontalIcon } from "@heroicons/react/24/outline";
import { Alert } from "@heroui/react";
import Image from "next/image";

import { useAppData } from "@/components/context/app-data-context";
import { FileUpload } from "@/components/upload/file-upload";

interface AlipayImportProps {
  onImportSuccess: (transactions: Transaction[]) => void;
}

export function AlipayImport({ onImportSuccess }: AlipayImportProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const appData = useAppData();

  const parseAlipayFile = useCallback(
    async (file: File) => {
      setIsProcessing(true);
      setError(null);
      setResult(null);

      try {
        // 检查文件类型
        if (!file.name.toLowerCase().endsWith(".csv")) {
          throw new Error("请选择CSV文件（.csv格式）");
        }

        // TODO: 实现支付宝CSV文件解析逻辑
        // 这里暂时用模拟数据
        await new Promise((resolve) => setTimeout(resolve, 2000)); // 模拟处理时间

        const transactions: Transaction[] = [];
        setResult({ importedCount: 0, transactions: [] });
        onImportSuccess(transactions);
      } catch (err) {
        setError(err instanceof Error ? err.message : "解析CSV文件失败");
      } finally {
        setIsProcessing(false);
      }
    },
    [appData, onImportSuccess],
  );

  return (
    <div className="space-y-6">
      {/* 支付宝文件上传 */}
      <FileUpload
        onFileSelect={parseAlipayFile}
        accept=".csv"
        isLoading={appData.isLoading || (!appData.hasLoaded && appData.error === null)}
        isProcessing={isProcessing}
        isError={!!appData.error}
        errorMessage={appData.error ?? "基础数据加载失败"}
        description="拖拽支付宝账单文件到这里"
        supportedFormats="支付宝账单(.csv)"
        logo={<Image alt="支付宝" className="w-16 h-16" height={64} src="/alipay.svg" width={64} />}
      />

      {!error && !result && !isProcessing && (
        <Alert
          title="支付宝账单获取流程"
          description={
            <div className="space-y-2">
              <span className="inline-flex flex-wrap items-center gap-x-1">
                <span>我的</span>
                <ChevronRightIcon aria-hidden className="size-[1em] shrink-0 text-current" />
                <span>账单</span>
                <ChevronRightIcon aria-hidden className="size-[1em] shrink-0 text-current" />
                <span>右上角</span>
                <EllipsisHorizontalIcon aria-hidden className="size-[1em] shrink-0 text-current" />
                <ChevronRightIcon aria-hidden className="size-[1em] shrink-0 text-current" />
                <span>开具交易流水证明</span>
                <ChevronRightIcon aria-hidden className="size-[1em] shrink-0 text-current" />
                <span>用于个人对账</span>
                <ChevronRightIcon aria-hidden className="size-[1em] shrink-0 text-current" />
                <span>打开「展示交易对手」及「展示商品说明」选项</span>
              </span>
            </div>
          }
        />
      )}

      {/* 错误提示 */}
      {error && <Alert color="danger">{error}</Alert>}

      {/* 导入结果 */}
      {result && <Alert color="success">成功导入 {result.importedCount} 条交易记录！</Alert>}
    </div>
  );
}
