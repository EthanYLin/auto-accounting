"use client";

import { useState } from "react";
import { Accordion, AccordionItem, Kbd } from "@heroui/react";
import { InformationCircleIcon } from "@heroicons/react/24/outline";

import { useCommandListener } from "@/lib/commands";
import { useTransactionEditor } from "@/components/context/transaction-editor-context";

export function TxImportInfo() {
  const editor = useTransactionEditor();
  const tx = editor.currentTransaction;
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  useCommandListener("toggle-import-info", () => {
    setSelectedKeys((prev) => (prev.length > 0 ? [] : ["import-info"]));
  });

  if (!tx) return null;

  const rawInfo = tx.raw_info as Record<string, string> | null;

  return (
    <div className="w-full min-w-0 mb-2">
      <Accordion
        fullWidth
        variant="light"
        selectedKeys={selectedKeys}
        onSelectionChange={(keys) =>
          setSelectedKeys(keys === "all" ? ["import-info"] : Array.from(keys, String))
        }
        className="w-full max-w-full"
        itemClasses={{
          base: "w-full",
          trigger: "gap-3 py-2",
          content: "pb-4 pt-2 text-foreground",
          heading: "w-full",
          title: "text-xs font-medium leading-snug",
          subtitle: "text-[11px] leading-snug text-foreground-500",
          titleWrapper: "gap-0.5",
        }}
      >
        <AccordionItem
          key="import-info"
          aria-label="导入信息"
          title={tx.title || "导入信息"}
          subtitle={
            <span className="flex items-center gap-1">
              点按展开导入信息{" "}
              <Kbd
                keys={[]}
                className="text-[10px] w-4 h-4 p-0 hidden md:flex items-center justify-center"
              >
                Q
              </Kbd>
            </span>
          }
          startContent={
            <InformationCircleIcon className="w-4 h-4 shrink-0 text-default-500" aria-hidden />
          }
        >
          <div className="space-y-4">
            {/* 状态 */}
            <div>
              <h3 className="text-sm font-semibold text-foreground-600 dark:text-zinc-400 mb-1">
                状态
              </h3>
              <p className="text-sm">{tx.status || "无"}</p>
            </div>

            {/* 交易ID */}
            <div>
              <h3 className="text-sm font-semibold text-foreground-600 dark:text-zinc-400 mb-1">
                交易ID
              </h3>
              <p className="text-sm font-mono tabular-nums">#{tx.id}</p>
            </div>

            {/* 来源 */}
            <div>
              <h3 className="text-sm font-semibold text-foreground-600 mb-1">来源</h3>
              <p className="text-sm">{tx.source || "无"}</p>
            </div>

            {/* 导入描述 */}
            <div>
              <h3 className="text-sm font-semibold text-foreground-600 mb-1">导入描述</h3>
              <p className="text-sm">{tx.title || "无"}</p>
            </div>

            {/* 导入备注 */}
            <div>
              <h3 className="text-sm font-semibold text-foreground-600 mb-1">导入备注</h3>
              <p className="text-sm whitespace-pre-wrap">{tx.remark || "无"}</p>
            </div>

            {/* 原始账单信息 */}
            <div>
              <h3 className="text-sm font-semibold text-foreground-600 mb-2">原始账单信息</h3>
              {rawInfo && Object.keys(rawInfo).length > 0 ? (
                (() => {
                  const filteredEntries = Object.entries(rawInfo).filter(
                    ([_, value]) => value !== null && value !== undefined && value !== "",
                  );
                  return filteredEntries.length > 0 ? (
                    <div className="bg-gray-100 dark:bg-white/[0.04] rounded-lg p-3 space-y-2">
                      {filteredEntries.map(([key, value]) => (
                        <div key={key} className="flex gap-2">
                          <span className="text-xs font-medium text-foreground-600 min-w-[100px]">
                            {key}:
                          </span>
                          <span className="text-xs text-foreground flex-1 break-all">{value}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-zinc-500">无原始信息</p>
                  );
                })()
              ) : (
                <p className="text-sm text-gray-500 dark:text-zinc-500">无原始信息</p>
              )}
            </div>
          </div>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
