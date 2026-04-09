"use client";

import type { SettingsDeleteRequest } from "@/components/settings/delete-confirm-dialog";
import type { MatchingRule } from "@/types";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@heroui/react";
import { Divider } from "@heroui/react";
import { Input } from "@heroui/react";
import { Select, SelectItem } from "@heroui/react";
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/react";
import { Controller } from "react-hook-form";

import { TRANSACTION_TYPES } from "@/constants/transaction-type";
import { useAppData } from "@/components/context/app-data-context";
import {
  defaultMatchingRuleFormValues,
  getMatchingRuleFormValues,
  matchingRuleFormSchema,
  toMatchingRulePayload,
  type MatchingRuleFormValues,
} from "@/components/settings/settings-form-schemas";
import {
  SettingsFormDrawer,
  useSettingsDrawerForm,
} from "@/components/settings/settings-form-drawer";
import { useMatchingRuleMutations } from "@/components/settings/settings-mutations";
import {
  SettingsEmptyState,
  SettingsLoadingState,
  SettingsSectionCard,
  getSingleSelectionValue,
} from "@/components/settings/settings-ui";

function formatAmountRule(rule: MatchingRule) {
  if (rule.f_original_amount_ge === null && rule.f_original_amount_le === null) {
    return null;
  } else {
    return `金额限制: ${rule.f_original_amount_ge || "不限"} - ${rule.f_original_amount_le || "不限"}`;
  }
}

function joinRuleTarget(values: Array<string | null | undefined>) {
  return values.filter((v): v is string => !!v).join(" - ");
}

export function RuleSection({
  matchingRules,
  isLoading,
  onRequestDelete,
}: {
  matchingRules: MatchingRule[];
  isLoading: boolean;
  onRequestDelete: (request: SettingsDeleteRequest) => void;
}) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<MatchingRule | null>(null);
  const { mainCategoryMap, subCategoryMap, budgetTypeMap } = useAppData();
  const { saveMatchingRule, deleteMatchingRule, isSaving } = useMatchingRuleMutations();

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setEditingRule(null);
  };

  return (
    <>
      <SettingsSectionCard
        actions={
          <Button
            color="primary"
            onPress={() => {
              setEditingRule(null);
              setIsDrawerOpen(true);
            }}
          >
            新增规则
          </Button>
        }
        count={matchingRules.length}
        title="匹配规则"
      >
        {isLoading ? (
          <SettingsLoadingState />
        ) : matchingRules.length === 0 ? (
          <SettingsEmptyState title="还没有匹配规则" />
        ) : (
          <Table removeWrapper aria-label="匹配规则列表">
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>规则</TableColumn>
              <TableColumn>目标赋值</TableColumn>
              <TableColumn align="end">操作</TableColumn>
            </TableHeader>
            <TableBody items={matchingRules}>
              {(rule) => {
                const amountRule = formatAmountRule(rule);
                const targetSummary = joinRuleTarget([
                  rule.t_tx_type,
                  rule.t_main_category_id
                    ? (mainCategoryMap.get(rule.t_main_category_id)?.label ??
                      `${rule.t_main_category_id}`)
                    : null,
                  rule.t_sub_category_id
                    ? (subCategoryMap.get(rule.t_sub_category_id)?.label ??
                      `${rule.t_sub_category_id}`)
                    : null,
                  rule.t_budget_type_id
                    ? (budgetTypeMap.get(rule.t_budget_type_id)?.name ?? `${rule.t_budget_type_id}`)
                    : null,
                ]);
                const namingSummary = joinRuleTarget([rule.t_name, rule.t_merchant]);

                return (
                  <TableRow key={rule.id}>
                    <TableCell>#{rule.id}</TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <p className="font-mono text-xs text-foreground">{rule.f_title}</p>
                        {rule.f_time && (
                          <p className="text-xs text-default-500">
                            时间规则: <span className="font-mono">{rule.f_time}</span>
                          </p>
                        )}
                        {amountRule && <p className="text-xs text-default-500">{amountRule}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm text-default-600">
                        <p className="break-words">{targetSummary}</p>
                        <p className="break-words">{namingSummary}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="light"
                          onPress={() => {
                            setEditingRule(rule);
                            setIsDrawerOpen(true);
                          }}
                        >
                          编辑
                        </Button>
                        <Button
                          color="danger"
                          size="sm"
                          variant="flat"
                          onPress={() => {
                            onRequestDelete({
                              title: "删除匹配规则",
                              description: `确定删除匹配规则 #${rule.id} 吗？`,
                              onConfirm: () => deleteMatchingRule({ id: rule.id }),
                            });
                          }}
                        >
                          删除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              }}
            </TableBody>
          </Table>
        )}
      </SettingsSectionCard>

      <RuleDrawer
        isOpen={isDrawerOpen}
        isSaving={isSaving}
        rule={editingRule}
        onClose={closeDrawer}
        onSubmit={async (values) => {
          await saveMatchingRule(toMatchingRulePayload(values), editingRule?.id);
          closeDrawer();
        }}
      />
    </>
  );
}

function RuleDrawer({
  isOpen,
  rule,
  isSaving,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  rule: MatchingRule | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (values: MatchingRuleFormValues) => Promise<void>;
}) {
  const { form, submitError, handleSubmit } = useSettingsDrawerForm({
    resolver: zodResolver(matchingRuleFormSchema),
    defaultValues: defaultMatchingRuleFormValues,
    item: rule,
    isOpen,
    getResetValues: (nextRule) => getMatchingRuleFormValues(nextRule ?? undefined),
    onSubmit,
    submitErrorMessage: "匹配规则保存失败",
  });
  const { budgetTypes, getMainCategoriesByType, getSubCategoriesByMain } = useAppData();

  const selectedTransactionType = form.watch("t_tx_type");
  const selectedMainCategoryId = form.watch("t_main_category_id");

  const filteredMainCategories = useMemo(
    () => getMainCategoriesByType(selectedTransactionType),
    [getMainCategoriesByType, selectedTransactionType],
  );
  const filteredSubCategories = useMemo(
    () => getSubCategoriesByMain(selectedMainCategoryId ? Number(selectedMainCategoryId) : ""),
    [getSubCategoriesByMain, selectedMainCategoryId],
  );

  useEffect(() => {
    const currentMainCategoryId = form.getValues("t_main_category_id");

    if (
      currentMainCategoryId &&
      !filteredMainCategories.some((item) => String(item.id) === currentMainCategoryId)
    ) {
      form.setValue("t_main_category_id", "", { shouldDirty: true });
      form.setValue("t_sub_category_id", "", { shouldDirty: true });
    }
  }, [filteredMainCategories, form]);

  useEffect(() => {
    const currentSubCategoryId = form.getValues("t_sub_category_id");

    if (
      currentSubCategoryId &&
      !filteredSubCategories.some((item) => String(item.id) === currentSubCategoryId)
    ) {
      form.setValue("t_sub_category_id", "", { shouldDirty: true });
    }
  }, [filteredSubCategories, form]);

  return (
    <SettingsFormDrawer
      bodyClassName="space-y-6"
      isOpen={isOpen}
      isSaving={isSaving}
      scrollBehavior="inside"
      size="2xl"
      submitError={submitError}
      title={rule ? "编辑匹配规则" : "新增匹配规则"}
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <section className="space-y-4 rounded-3xl border border-default-200 bg-default-50/30 p-4">
        <div>
          <h3 className="font-medium">过滤条件</h3>
          <p className="mt-1 text-sm text-default-500">定义导入账单在什么条件下命中当前规则。</p>
        </div>
        <Controller
          control={form.control}
          name="f_title"
          render={({ field, fieldState }) => (
            <Input
              isRequired
              description="必填，用于匹配账单 title 字段。"
              errorMessage={fieldState.error?.message}
              isInvalid={Boolean(fieldState.error)}
              label="导入描述 (正则表达式)"
              placeholder="例如：(麦当劳|McDonalds)"
              value={field.value}
              onBlur={field.onBlur}
              onValueChange={field.onChange}
            />
          )}
        />
        <div className="grid gap-3 md:grid-cols-2">
          <Controller
            control={form.control}
            name="f_original_amount_ge"
            render={({ field, fieldState }) => (
              <Input
                errorMessage={fieldState.error?.message}
                isInvalid={Boolean(fieldState.error)}
                label="最小金额"
                placeholder="例如 10.00"
                step="0.01"
                type="number"
                value={field.value}
                onBlur={field.onBlur}
                onValueChange={field.onChange}
              />
            )}
          />
          <Controller
            control={form.control}
            name="f_original_amount_le"
            render={({ field, fieldState }) => (
              <Input
                errorMessage={fieldState.error?.message}
                isInvalid={Boolean(fieldState.error)}
                label="最大金额"
                placeholder="例如 100.00"
                step="0.01"
                type="number"
                value={field.value}
                onBlur={field.onBlur}
                onValueChange={field.onChange}
              />
            )}
          />
        </div>
        <Controller
          control={form.control}
          name="f_time"
          render={({ field, fieldState }) => (
            <Input
              description="选填，留空表示不限制时间。"
              errorMessage={fieldState.error?.message}
              isInvalid={Boolean(fieldState.error)}
              label="时间 (正则表达式)"
              placeholder="例如：(0[6-9]|10):\\d{2}"
              value={field.value}
              onBlur={field.onBlur}
              onValueChange={field.onChange}
            />
          )}
        />
      </section>

      <Divider />

      <section className="space-y-4 rounded-3xl border border-default-200 bg-content1 p-4">
        <div>
          <h3 className="font-medium">目标赋值</h3>
          <p className="mt-1 text-sm text-default-500">规则命中后，把这些信息写入交易。</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Controller
            control={form.control}
            name="t_tx_type"
            render={({ field, fieldState }) => (
              <Select
                errorMessage={fieldState.error?.message}
                isInvalid={Boolean(fieldState.error)}
                label="交易类型"
                placeholder="不设置则不修改"
                selectedKeys={field.value ? [field.value] : []}
                onSelectionChange={(keys) => field.onChange(getSingleSelectionValue(keys))}
              >
                {TRANSACTION_TYPES.map((type) => (
                  <SelectItem key={type.type}>{type.type}</SelectItem>
                ))}
              </Select>
            )}
          />
          <Controller
            control={form.control}
            name="t_main_category_id"
            render={({ field, fieldState }) => (
              <Select
                errorMessage={fieldState.error?.message}
                isDisabled={!selectedTransactionType}
                isInvalid={Boolean(fieldState.error)}
                label="主类别"
                placeholder={selectedTransactionType ? "不设置则不修改" : "请先选择交易类型"}
                selectedKeys={field.value ? [field.value] : []}
                onSelectionChange={(keys) => field.onChange(getSingleSelectionValue(keys))}
              >
                {filteredMainCategories.map((item) => (
                  <SelectItem key={String(item.id)}>{item.label}</SelectItem>
                ))}
              </Select>
            )}
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Controller
            control={form.control}
            name="t_sub_category_id"
            render={({ field, fieldState }) => (
              <Select
                errorMessage={fieldState.error?.message}
                isDisabled={!selectedMainCategoryId}
                isInvalid={Boolean(fieldState.error)}
                label="子类别"
                placeholder={selectedMainCategoryId ? "不设置则不修改" : "请先选择主类别"}
                selectedKeys={field.value ? [field.value] : []}
                onSelectionChange={(keys) => field.onChange(getSingleSelectionValue(keys))}
              >
                {filteredSubCategories.map((item) => (
                  <SelectItem key={String(item.id)}>{item.label}</SelectItem>
                ))}
              </Select>
            )}
          />
          <Controller
            control={form.control}
            name="t_budget_type_id"
            render={({ field, fieldState }) => (
              <Select
                errorMessage={fieldState.error?.message}
                isInvalid={Boolean(fieldState.error)}
                label="预算计划"
                placeholder="不设置则不修改"
                selectedKeys={field.value ? [field.value] : []}
                onSelectionChange={(keys) => field.onChange(getSingleSelectionValue(keys))}
              >
                {budgetTypes.map((item) => (
                  <SelectItem key={String(item.id)}>{item.name}</SelectItem>
                ))}
              </Select>
            )}
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Controller
            control={form.control}
            name="t_name"
            render={({ field, fieldState }) => (
              <Input
                description="选填，命中后覆盖交易名称。"
                errorMessage={fieldState.error?.message}
                isInvalid={Boolean(fieldState.error)}
                label="名称"
                placeholder="例如：早餐"
                value={field.value}
                onBlur={field.onBlur}
                onValueChange={field.onChange}
              />
            )}
          />
          <Controller
            control={form.control}
            name="t_merchant"
            render={({ field, fieldState }) => (
              <Input
                description="选填，命中后覆盖交易商家。"
                errorMessage={fieldState.error?.message}
                isInvalid={Boolean(fieldState.error)}
                label="商家"
                placeholder="例如：麦当劳"
                value={field.value}
                onBlur={field.onBlur}
                onValueChange={field.onChange}
              />
            )}
          />
        </div>
      </section>
    </SettingsFormDrawer>
  );
}
