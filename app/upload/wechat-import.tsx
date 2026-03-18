"use client";

import React, { useState, useCallback } from 'react';
import { Alert } from '@heroui/react';
import * as XLSX from 'xlsx';

import { FileUpload } from '@/app/upload/file-upload';
import { importFromWeChatExcel } from '@/lib/wechat-import';
import type { ExcelData, ImportResult } from '@/lib/wechat-import/types';
import type { Transaction } from '@/types';

interface WeChatImportProps {
  onImportSuccess: (transactions: Transaction[]) => void;
}

export function WeChatImport({ onImportSuccess }: WeChatImportProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const parseWeChatFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      // 检查文件类型
      if (!file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls')) {
        throw new Error('请选择Excel文件（.xlsx或.xls格式）');
      }

      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      
      // 获取第一个工作表
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      if (!worksheet) {
        throw new Error('未找到工作表');
      }

      // 将工作表转换为JSON，包含所有行
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1, 
        defval: '' 
      }) as any[][];

      // 检查是否有足够的行数
      if (jsonData.length < 18) {
        throw new Error('Excel文件行数不足，需要至少18行数据');
      }

      // 忽略前16行，第17行(索引16)作为标题，第18行开始(索引17)是数据
      const headers = jsonData[16] || [];
      const rows = jsonData.slice(17);

      const parsedData: ExcelData = {
        headers: headers.map((h: any) => String(h)),
        rows: rows
      };

      // 解析完成后自动开始导入
      const transactions = await importFromWeChatExcel(parsedData);
      setResult({ importedCount: transactions.transactions.length });
      onImportSuccess(transactions.transactions as Transaction[]);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '解析Excel文件失败');
    } finally {
      setIsProcessing(false);
    }
  }, [onImportSuccess]);

  return (
    <div className="space-y-6">
      {/* 微信支付文件上传 */}
      <FileUpload
        onFileSelect={parseWeChatFile}
        accept=".xlsx,.xls"
        isLoading={isProcessing}
        description="拖拽微信支付账单文件到这里"
        supportedFormats="微信支付账单(.xlsx/.xls)"
        logo={
          <img 
            src="/wechat-pay.svg" 
            alt="微信支付" 
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
