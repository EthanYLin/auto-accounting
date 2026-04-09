"use client";

import { useEffect, useMemo, useState } from "react";
import { Divider, Kbd, Tab, Tabs } from "@heroui/react";

import { useCommandListener } from "@/lib/commands";
import { useTransactionEditor } from "@/components/context/transaction-editor-context";
import { SplitEntryArea } from "@/components/homepage/split-area/split-entry-area";
import { TxParentArea } from "@/components/homepage/tx-parent-area";

type TabKey = "tx-info" | "parent" | "split";

function getDefaultTab(childrenCount: number, splitCount: number, hasParent: boolean): TabKey {
  if (splitCount > 0 && !hasParent) return "split";
  if (childrenCount > 0 || hasParent) return "parent";
  return "tx-info";
}

export function TxSupplementTabs() {
  const editor = useTransactionEditor();
  const tx = editor.currentTransaction;

  const childrenCount = tx?.children_ids?.length ?? 0;
  const splitCount = tx?.splits?.length ?? 0;
  const hasSplitTab = !!tx && !tx.parent_id;

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
    <Tabs
      aria-label="交易补充信息"
      selectedKey={activeTab}
      onSelectionChange={(key) => setTab(key as TabKey)}
      destroyInactiveTabPanel={false}
      variant="underlined"
      classNames={{ base: "mb-0", panel: "mb-0 px-0 py-0" }}
    >
      <Tab
        key="tx-info"
        title={
          <span className="flex items-center gap-1">
            交易信息
            <Kbd keys={[]} className="text-[10px] w-4 h-4 p-0 flex items-center justify-center">
              1
            </Kbd>
          </span>
        }
      >
        <div className="py-1" />
      </Tab>
      <Tab
        key="parent"
        title={
          <span className="flex items-center gap-1">
            {`附加交易${childrenCount > 0 ? `(${childrenCount})` : ""}`}
            <Kbd keys={[]} className="text-[10px] w-4 h-4 p-0 flex items-center justify-center">
              2
            </Kbd>
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
              <Kbd keys={[]} className="text-[10px] w-4 h-4 p-0 flex items-center justify-center">
                3
              </Kbd>
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
  );
}
