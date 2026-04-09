"use client";

import React from "react";
import { Tabs, Tab } from "@heroui/react";
import Image from "next/image";

import { AlipayImport } from "@/components/upload/alipay-import";
import { CustomImport } from "@/components/upload/custom-import";
import { FudanImport } from "@/components/upload/fudan-import";
import { WeChatImport } from "@/components/upload/wechat-import";

export default function ExcelUploadPage() {
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <h1 className="text-3xl font-bold mb-6">账单导入</h1>

      <Tabs
        aria-label="账单类型"
        className="w-full"
        classNames={{
          tab: "w-auto shrink-0",
        }}
      >
        <Tab
          key="wechat"
          title={
            <div className="flex items-center gap-2">
              <Image alt="微信" className="w-5 h-5" height={20} src="/wechat-pay.svg" width={20} />
              <span>微信支付</span>
            </div>
          }
        >
          <WeChatImport />
        </Tab>

        <Tab
          key="alipay"
          title={
            <div className="flex items-center gap-2">
              <Image alt="支付宝" className="w-5 h-5" height={20} src="/alipay.svg" width={20} />
              <span>支付宝</span>
            </div>
          }
        >
          <AlipayImport onImportSuccess={() => {}} />
        </Tab>

        <Tab
          key="fudan"
          title={
            <div className="flex items-center gap-2">
              <Image alt="复旦" className="w-5 h-5" height={20} src="/fudan.svg" width={20} />
              <span>复旦校园卡</span>
            </div>
          }
        >
          <FudanImport />
        </Tab>

        <Tab
          key="custom"
          title={
            <div className="flex items-center gap-2">
              <span>自定义导入</span>
            </div>
          }
        >
          <CustomImport />
        </Tab>
      </Tabs>
    </div>
  );
}
