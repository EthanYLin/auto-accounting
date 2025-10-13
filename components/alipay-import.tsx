"use client";

import React, { useState, useCallback } from 'react';
import { Alert } from '@heroui/alert';

import { FileUpload } from '@/components/file-upload';
import { AllTransactions } from '@/types/transaction';
import type { ImportResult } from '@/lib/wechat-import/types';

interface AlipayImportProps {
  allTransactions: AllTransactions;
}

export function AlipayImport({ allTransactions }: AlipayImportProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const parseAlipayFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      // 检查文件类型
      if (!file.name.toLowerCase().endsWith('.csv')) {
        throw new Error('请选择CSV文件（.csv格式）');
      }

      // TODO: 实现支付宝CSV文件解析逻辑
      // 这里暂时用模拟数据
      await new Promise(resolve => setTimeout(resolve, 2000)); // 模拟处理时间
      
      setResult({ importedCount: 0 });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '解析CSV文件失败');
    } finally {
      setIsProcessing(false);
    }
  }, [allTransactions]);

  return (
    <div className="space-y-6">
      {/* 支付宝文件上传 */}
      <FileUpload
        onFileSelect={parseAlipayFile}
        accept=".csv"
        isLoading={isProcessing}
        description="拖拽支付宝账单文件到这里"
        supportedFormats="支付宝账单(.csv)"
        logo={
          <img 
            src="/alipay.svg" 
            alt="支付宝" 
            className="w-16 h-16"
          />
        }
      />

      {/* 错误提示 */}
      {error && (
        <Alert color="danger">
          {error}
        </Alert>
      )}

      {/* 导入结果 */}
      {result && (
        <Alert color="success">
          成功导入 {result.importedCount} 条交易记录！
        </Alert>
      )}
    </div>
  );
}
