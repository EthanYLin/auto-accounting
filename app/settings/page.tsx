"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { addToast } from "@heroui/react";
import { Tab, Tabs } from "@heroui/react";
import { useIsFetching } from "@tanstack/react-query";

import {
  appDataQueryKey,
  useAppData,
} from "@/components/context/app-data-context";
import { AccountSection } from "@/components/settings/account-section";
import { BudgetSection } from "@/components/settings/budget-section";
import {
  DeleteConfirmDialog,
  type SettingsDeleteRequest,
} from "@/components/settings/delete-confirm-dialog";
import { MainCategorySection } from "@/components/settings/main-category-section";
import { RuleSection } from "@/components/settings/rule-section";
import { SubCategorySection } from "@/components/settings/sub-category-section";
import { getErrorMessage } from "@/components/settings/settings-ui";

export default function SettingsPage() {
  const [deleteRequest, setDeleteRequest] =
    useState<SettingsDeleteRequest | null>(null);
  const {
    accounts,
    budgetTypes,
    mainCategories,
    subCategories,
    matchingRules,
    hasLoaded,
    isLoading,
    error: loadError,
    refetchData,
  } = useAppData();

  const isRefreshing = useIsFetching({ queryKey: appDataQueryKey }) > 0;
  const isInitialLoading = isLoading && !hasLoaded;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">配置中心</h1>
        </div>
        <Button
          color="primary"
          isLoading={isRefreshing}
          variant="flat"
          onPress={async () => {
            try {
              await refetchData();
            } catch (error) {
              addToast({
                title: "刷新失败",
                description: getErrorMessage(error, "配置数据刷新失败"),
                color: "danger",
              });
            }
          }}
        >
          刷新全部
        </Button>
      </div>

      {loadError && (
        <section className="rounded-3xl border border-warning/25 bg-warning-50 px-5 py-4 text-sm text-warning-800">
          <p className="font-medium">配置数据加载失败</p>
          <p className="mt-2">{loadError}</p>
        </section>
      )}

      {(hasLoaded || isInitialLoading) && (
        <Tabs
          aria-label="配置项"
          className="w-full"
          color="primary"
          destroyInactiveTabPanel={false}
          variant="solid"
        >
          <Tab key="account" title="账户">
            <AccountSection
              accounts={accounts}
              isLoading={isInitialLoading}
              onRequestDelete={setDeleteRequest}
            />
          </Tab>
          <Tab key="main-category" title="主类别">
            <MainCategorySection
              isLoading={isInitialLoading}
              mainCategories={mainCategories}
              onRequestDelete={setDeleteRequest}
            />
          </Tab>
          <Tab key="sub-category" title="子类别">
            <SubCategorySection
              budgetTypes={budgetTypes}
              isLoading={isInitialLoading}
              mainCategories={mainCategories}
              subCategories={subCategories}
              onRequestDelete={setDeleteRequest}
            />
          </Tab>
          <Tab key="budget" title="预算计划">
            <BudgetSection
              budgetTypes={budgetTypes}
              isLoading={isInitialLoading}
              onRequestDelete={setDeleteRequest}
            />
          </Tab>
          <Tab key="rule" title="规则">
            <RuleSection
              isLoading={isInitialLoading}
              matchingRules={matchingRules}
              onRequestDelete={setDeleteRequest}
            />
          </Tab>
        </Tabs>
      )}

      <DeleteConfirmDialog
        request={deleteRequest}
        onClose={() => setDeleteRequest(null)}
      />
    </div>
  );
}
