"use client";

import React, { useState } from 'react';
import { Tabs, Tab } from '@heroui/tabs';

import { WeChatImport } from '@/app/upload/wechat-import';
import { AlipayImport } from '@/app/upload/alipay-import';
import type { Transaction } from '@/types';

export default function ExcelUploadPage() {
  // 存储导入的交易记录
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <h1 className="text-3xl font-bold mb-6">账单导入</h1>
      
      <Tabs aria-label="账单类型" className="w-full">

        <Tab 
          key="wechat" 
          title={
            <div className="flex items-center gap-2 w-20">
              <img src="/wechat-pay.svg" alt="微信" className="w-5 h-5" />
              <span>微信支付</span>
            </div>
          }
        >
          <WeChatImport onImportSuccess={(importedTransactions) => setTransactions(prev => [...prev, ...importedTransactions])} />
        </Tab>

        <Tab 
          key="alipay" 
          title={
            <div className="flex items-center gap-2">
              <img src="/alipay.svg" alt="支付宝" className="w-5 h-5" />
              <span>支付宝</span>
            </div>
          }
        >
          <AlipayImport onImportSuccess={(importedTransactions) => setTransactions(prev => [...prev, ...importedTransactions])} />
        </Tab>

        <Tab 
          key="fudan" 
          title={
            <div className="flex items-center gap-2 w-25">
              <img src="/fudan.svg" alt="复旦" className="w-5 h-5" />
              <span>复旦校园卡</span>
            </div>
          }
        >

        </Tab>
        
      </Tabs>
    </div>
  );
}