"use client";

import { useEffect, useMemo, useState } from "react";
import { Divider, Tab, Tabs } from "@heroui/react";

import { useCommandListener } from "@/lib/commands";
import { useTransactionEditor } from "@/components/context/transaction-editor-context";
import { SplitHintBadge } from "@/components/homepage/action-bar/split-hint-badge";
import { SplitEntryArea } from "@/components/homepage/split-area/split-entry-area";
import { TxParentArea } from "@/components/homepage/tx-parent-area";
import { getExitSplits } from "@/lib/transaction/transaction-split-merge";

type TabKey = "tx-info" | "parent" | "split";

function getDefaultTab(childrenCount: number, splitCount: number, hasParent: boolean): TabKey {
  if (splitCount > 0 && !hasParent) return "split";
  if (childrenCount > 0 || hasParent) return "parent";
  return "tx-info";
}

export function TxSupplementTabs() {
  const editor = useTransactionEditor();
  const tx = editor.currentTransaction;
  const childTransactions = editor.currentChildTransactions;

  const childrenCount = tx?.children_ids?.length ?? 0;
  const splitCount = tx?.splits?.length ?? 0;
  const hasSplitTab = !!tx && !tx.parent_id;

  const splitHint = useMemo(() => {
    if (!tx || tx.parent_id) return null;
    const exitCount = tx.splits?.length ?? 0;
    const entryCount = childTransactions.length + 1;
    if (exitCount > 1) {
      return { type: "info" as const, message: `该账单会拆分为${exitCount}条记录` };
    }
    if (exitCount === 1 && entryCount > 1) {
      return { type: "info" as const, message: "该账单会合并为1条记录" };
    }
    if (exitCount === 1 && entryCount === 1) {
      return { type: "warn" as const, message: "该账单经过分账修改" };
    }
    if (exitCount === 0 && entryCount > 1) {
      if (getExitSplits(tx, childTransactions).length === 0) {
        return { type: "info" as const, message: "该账单正负相抵不会被导出" };
      }
      return { type: "warn" as const, message: "该账单会默认按账户进行合并" };
    }
    return null;
  }, [childTransactions, tx]);

  const defaultTab = useMemo(
    () => getDefaultTab(childrenCount, splitCount, !!tx?.parent_id),
    [childrenCount, tx?.parent_id, splitCount],
  );
  const [tab, setTab] = useState<TabKey>(defaultTab);
  const activeTab = hasSplitTab || tab !== "split" ? tab : "tx-info";

  useEffect(() => {
    setTab(defaultTab);
  }, [tx?.id, defaultTab]);

  useCommandListener("open-attach-selection", () => setTab("parent"));

  useCommandListener("select-tab", (key: TabKey) => {
    if (key === "split" && !hasSplitTab) return;
    setTab(key);
  });

  if (!tx) return null;

  return (
    <div className="relative">
      <Tabs
        aria-label="交易补充信息"
        selectedKey={activeTab}
        onSelectionChange={(key) => setTab(key as TabKey)}
        destroyInactiveTabPanel={false}
        variant="underlined"
        classNames={{ base: "mb-0", panel: "mb-0 px-0 py-0" }}
      >
        <Tab key="tx-info" title={<span className="flex items-center gap-1">交易信息</span>}>
          <div className="py-1" />
        </Tab>
        <Tab
          key="parent"
          title={
            <span className="flex items-center gap-1">
              {`附加交易${childrenCount > 0 ? `(${childrenCount})` : ""}`}
            </span>
          }
        >
          <div className="py-3 flex flex-col space-y-3">
            <TxParentArea />
            <Divider />
          </div>
        </Tab>
        {hasSplitTab && (
          <Tab
            key="split"
            title={
              <span className="flex items-center gap-1">
                {`分账${splitCount > 0 ? `(${splitCount})` : ""}`}
              </span>
            }
          >
            <div className="py-3 flex flex-col space-y-3">
              <SplitEntryArea isActive={activeTab === "split"} />
              <Divider />
            </div>
          </Tab>
        )}
      </Tabs>
      {splitHint && (
        <div className="absolute right-0 top-0 flex h-[40px] items-center">
          <SplitHintBadge splitHint={splitHint} />
        </div>
      )}
    </div>
  );
}
