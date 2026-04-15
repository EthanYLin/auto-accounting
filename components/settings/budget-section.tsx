"use client";

import type { SettingsDeleteRequest } from "@/components/settings/delete-confirm-dialog";
import type { BudgetType } from "@/types";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@heroui/react";
import { Input } from "@heroui/react";
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/react";
import { Controller } from "react-hook-form";

import {
  budgetFormSchema,
  type BudgetFormValues,
  defaultBudgetFormValues,
  getBudgetFormValues,
  toBudgetPayload,
} from "@/components/settings/settings-form-schemas";
import {
  SettingsFormDrawer,
  useSettingsDrawerForm,
} from "@/components/settings/settings-form-drawer";
import { useBudgetMutations } from "@/components/settings/settings-mutations";
import {
  SettingsEmptyState,
  SettingsLoadingState,
  SettingsMobileItem,
  SettingsMobileList,
  SettingsSectionCard,
} from "@/components/settings/settings-ui";

export function BudgetSection({
  budgetTypes,
  isLoading,
  onRequestDelete,
}: {
  budgetTypes: BudgetType[];
  isLoading: boolean;
  onRequestDelete: (request: SettingsDeleteRequest) => void;
}) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetType | null>(null);
  const { saveBudget, deleteBudget, isSaving } = useBudgetMutations();

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setEditingBudget(null);
  };

  return (
    <>
      <SettingsSectionCard
        actions={
          <Button
            color="primary"
            onPress={() => {
              setEditingBudget(null);
              setIsDrawerOpen(true);
            }}
          >
            新增预算计划
          </Button>
        }
        count={budgetTypes.length}
        title="预算计划"
      >
        {isLoading ? (
          <SettingsLoadingState />
        ) : budgetTypes.length === 0 ? (
          <SettingsEmptyState title="还没有预算计划" />
        ) : (
          <>
            <div className="sm:hidden">
              <SettingsMobileList>
                {budgetTypes.map((budget) => (
                  <SettingsMobileItem
                    key={budget.id}
                    fields={[{ key: "图标", value: budget.icon || "—" }]}
                    fieldsInline={true}
                    label={budget.name}
                    onDelete={() => {
                      onRequestDelete({
                        title: "删除预算计划",
                        description: `确定删除预算计划"${budget.name}"吗？`,
                        onConfirm: () =>
                          deleteBudget({
                            id: budget.id,
                            name: budget.name,
                          }),
                      });
                    }}
                    onEdit={() => {
                      setEditingBudget(budget);
                      setIsDrawerOpen(true);
                    }}
                  />
                ))}
              </SettingsMobileList>
            </div>
            <div className="hidden sm:block">
              <Table removeWrapper aria-label="预算计划列表">
                <TableHeader>
                  <TableColumn>名称</TableColumn>
                  <TableColumn>图标</TableColumn>
                  <TableColumn align="end">操作</TableColumn>
                </TableHeader>
                <TableBody items={budgetTypes}>
                  {(budget) => (
                    <TableRow key={budget.id}>
                      <TableCell>{budget.name}</TableCell>
                      <TableCell>{budget.icon || "—"}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="light"
                            onPress={() => {
                              setEditingBudget(budget);
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
                                title: "删除预算计划",
                                description: `确定删除预算计划"${budget.name}"吗？`,
                                onConfirm: () =>
                                  deleteBudget({
                                    id: budget.id,
                                    name: budget.name,
                                  }),
                              });
                            }}
                          >
                            删除
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </SettingsSectionCard>

      <BudgetDrawer
        budget={editingBudget}
        isOpen={isDrawerOpen}
        isSaving={isSaving}
        onClose={closeDrawer}
        onSubmit={async (values) => {
          await saveBudget(toBudgetPayload(values), editingBudget?.id);
          closeDrawer();
        }}
      />
    </>
  );
}

function BudgetDrawer({
  isOpen,
  budget,
  isSaving,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  budget: BudgetType | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (values: BudgetFormValues) => Promise<void>;
}) {
  const { form, submitError, handleSubmit } = useSettingsDrawerForm({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: defaultBudgetFormValues,
    item: budget,
    isOpen,
    getResetValues: (nextBudget) => getBudgetFormValues(nextBudget ?? undefined),
    onSubmit,
    submitErrorMessage: "预算计划保存失败",
  });

  return (
    <SettingsFormDrawer
      bodyClassName="space-y-4"
      isOpen={isOpen}
      isSaving={isSaving}
      size="md"
      submitError={submitError}
      title={budget ? "编辑预算计划" : "新增预算计划"}
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <Controller
        control={form.control}
        name="name"
        render={({ field, fieldState }) => (
          <Input
            errorMessage={fieldState.error?.message}
            isInvalid={Boolean(fieldState.error)}
            label="预算计划名称"
            placeholder="如 基本开支"
            value={field.value}
            onBlur={field.onBlur}
            onValueChange={field.onChange}
          />
        )}
      />
      <Controller
        control={form.control}
        name="icon"
        render={({ field, fieldState }) => (
          <Input
            errorMessage={fieldState.error?.message}
            isInvalid={Boolean(fieldState.error)}
            label="图标"
            placeholder="输入 Emoji"
            value={field.value}
            onBlur={field.onBlur}
            onValueChange={field.onChange}
          />
        )}
      />
    </SettingsFormDrawer>
  );
}
