"use client";

import { Divider, Tab, Tabs } from "@heroui/react";

import { useTransactionEditor } from "@/components/context/transaction-editor-context";
import { SplitEntryArea } from "@/components/homepage/split-area/split-entry-area";
import { TxParentArea } from "@/components/homepage/tx-parent-area";

export function TxSupplementTabs() {
  const editor = useTransactionEditor();
  const currentTransaction = editor.currentTransaction;

  if (!currentTransaction) return null;

  const childrenCount = currentTransaction.children_ids?.length ?? 0;
  const splitCount = currentTransaction.splits?.length ?? 0;

  let defaultSelectedKey;
  if (splitCount > 0 && !currentTransaction.parent_id) {
    defaultSelectedKey = "split";
  } else if (childrenCount > 0 || currentTransaction.parent_id) {
    defaultSelectedKey = "parent";
  } else {
    defaultSelectedKey = "tx-info";
  }

  return (
    <Tabs
      key={currentTransaction.id}
      aria-label="交易补充信息"
      defaultSelectedKey={defaultSelectedKey}
      destroyInactiveTabPanel={false}
      variant="underlined"
      classNames={{base: "mb-0" , panel: "mb-0 px-0 py-0"}}
    >
      <Tab key="tx-info" title="交易信息">
        <div className="py-1" />
      </Tab>
      <Tab key="parent" title={`附加交易${childrenCount > 0 ? `(${childrenCount})` : ""}`}>
        <div className="py-3 flex flex-col space-y-3">
          <TxParentArea />
          <Divider />
        </div>
      </Tab>
      {!currentTransaction.parent_id && (
        <Tab key="split" title={`分账${splitCount > 0 ? `(${splitCount})` : ""}`}>
          <div className="py-3 flex flex-col space-y-3">
            <SplitEntryArea />
            <Divider />
          </div>
        </Tab>
      )}
    </Tabs>
  );
}
