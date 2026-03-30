"use client";

import type { ImportResult } from "@/lib/wechat-import/types";

import React, { useState, useCallback } from "react";
import { Alert } from "@heroui/react";
import Image from "next/image";

import { FileUpload } from "@/components/upload/file-upload";
import { useAppData } from "@/components/context/app-data-context";
import { useTransactionImport } from "@/lib/hooks/use-transaction-import";
import { parseWeChatFile, importFromWeChatExcel } from "@/lib/wechat-import";

export function WeChatImport() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const appData = useAppData();
  const { createTransactions } = useTransactionImport();

  const handleFileSelect = useCallback(
    async (file: File) => {
      setIsProcessing(true);
      setError(null);
      setResult(null);

      try {
        const table = await parseWeChatFile(file);
        const importResult = await importFromWeChatExcel(table, appData);
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
      }
    },
    [createTransactions],
  );

  return (
    <div className="space-y-6">
      <FileUpload
        onFileSelect={handleFileSelect}
        accept=".xlsx,.xls"
        isLoading={isProcessing}
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

      {error && <Alert color="danger">{error}</Alert>}

      {result && <Alert color="success">成功导入 {result.importedCount} 条交易记录！</Alert>}
    </div>
  );
}
