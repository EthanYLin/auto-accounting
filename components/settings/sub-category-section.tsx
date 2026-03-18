"use client";

import type { SettingsDeleteRequest } from "@/components/settings/delete-confirm-dialog";
import type { BudgetType, MainCategory, SubCategory } from "@/types";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@heroui/react";
import { Input } from "@heroui/react";
import { Select, SelectItem } from "@heroui/react";
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/react";
import { Controller } from "react-hook-form";

import { useAppData } from "@/components/context/app-data-context";
import {
  defaultSubCategoryFormValues,
  getSubCategoryFormValues,
  subCategoryFormSchema,
  toSubCategoryPayload,
  type SubCategoryFormValues,
} from "@/components/settings/settings-form-schemas";
import {
  SettingsFormDrawer,
  useSettingsDrawerForm,
} from "@/components/settings/settings-form-drawer";
import { useSubCategoryMutations } from "@/components/settings/settings-mutations";
import {
  SettingsEmptyState,
  SettingsLoadingState,
  SettingsSectionCard,
  getSingleSelectionValue,
} from "@/components/settings/settings-ui";

export function SubCategorySection({
  mainCategories,
  subCategories,
  budgetTypes,
  isLoading,
  onRequestDelete,
}: {
  mainCategories: MainCategory[];
  subCategories: SubCategory[];
  budgetTypes: BudgetType[];
  isLoading: boolean;
  onRequestDelete: (request: SettingsDeleteRequest) => void;
}) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedMainCategoryFilter, setSelectedMainCategoryFilter] = useState("all");
  const [editingCategory, setEditingCategory] = useState<SubCategory | null>(null);
  const { mainCategoryMap, budgetTypeMap } = useAppData();
  const { saveSubCategory, deleteSubCategory, isSaving } = useSubCategoryMutations();

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setEditingCategory(null);
  };

  useEffect(() => {
    if (
      selectedMainCategoryFilter !== "all" &&
      !mainCategories.some((item) => String(item.id) === selectedMainCategoryFilter)
    ) {
      setSelectedMainCategoryFilter("all");
    }
  }, [mainCategories, selectedMainCategoryFilter]);

  const filteredSubCategories = useMemo(() => {
    if (selectedMainCategoryFilter === "all") {
      return subCategories;
    }

    return subCategories.filter(
      (item) => String(item.main_category_id) === selectedMainCategoryFilter,
    );
  }, [selectedMainCategoryFilter, subCategories]);

  const mainCategoryFilterOptions = useMemo(
    () => [
      { key: "all", label: "全部主类别" },
      ...mainCategories.map((item) => ({
        key: String(item.id),
        label: item.label,
      })),
    ],
    [mainCategories],
  );

  return (
    <>
      <SettingsSectionCard
        actions={
          <Button
            color="primary"
            onPress={() => {
              setEditingCategory(null);
              setIsDrawerOpen(true);
            }}
          >
            新增子类别
          </Button>
        }
        count={filteredSubCategories.length}
        title="子类别"
      >
        {isLoading ? (
          <SettingsLoadingState />
        ) : subCategories.length === 0 ? (
          <SettingsEmptyState title="还没有子类别" />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <Select
                disallowEmptySelection
                aria-label="筛选主类别"
                className="w-full sm:max-w-xs"
                items={mainCategoryFilterOptions}
                label="按主类别筛选"
                selectedKeys={[selectedMainCategoryFilter]}
                size="sm"
                onSelectionChange={(keys) =>
                  setSelectedMainCategoryFilter(getSingleSelectionValue(keys))
                }
              >
                {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
              </Select>
            </div>

            {filteredSubCategories.length === 0 ? (
              <SettingsEmptyState title="没有匹配的子类别" />
            ) : (
              <Table removeWrapper aria-label="子类别列表">
                <TableHeader>
                  <TableColumn>ID</TableColumn>
                  <TableColumn>名称</TableColumn>
                  <TableColumn>所属主类别</TableColumn>
                  <TableColumn>预算计划</TableColumn>
                  <TableColumn>图标</TableColumn>
                  <TableColumn align="end">操作</TableColumn>
                </TableHeader>
                <TableBody items={filteredSubCategories}>
                  {(item) => (
                    <TableRow key={item.id}>
                      <TableCell>#{item.id}</TableCell>
                      <TableCell>{item.label}</TableCell>
                      <TableCell>
                        {mainCategoryMap.get(item.main_category_id)?.label ??
                          `#${item.main_category_id}`}
                      </TableCell>
                      <TableCell>
                        {item.budget_type_id
                          ? (budgetTypeMap.get(item.budget_type_id)?.name ??
                            `#${item.budget_type_id}`)
                          : "未绑定"}
                      </TableCell>
                      <TableCell>{item.icon}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="light"
                            onPress={() => {
                              setEditingCategory(item);
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
                                title: "删除子类别",
                                description: `确定删除子类别“${item.label}”吗？`,
                                onConfirm: () =>
                                  deleteSubCategory({
                                    id: item.id,
                                    label: item.label,
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
            )}
          </div>
        )}
      </SettingsSectionCard>

      <SubCategoryDrawer
        budgetTypes={budgetTypes}
        category={editingCategory}
        isOpen={isDrawerOpen}
        isSaving={isSaving}
        mainCategories={mainCategories}
        onClose={closeDrawer}
        onSubmit={async (values) => {
          await saveSubCategory(toSubCategoryPayload(values), editingCategory?.id);
          closeDrawer();
        }}
      />
    </>
  );
}

function SubCategoryDrawer({
  isOpen,
  category,
  mainCategories,
  budgetTypes,
  isSaving,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  category: SubCategory | null;
  mainCategories: MainCategory[];
  budgetTypes: BudgetType[];
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (values: SubCategoryFormValues) => Promise<void>;
}) {
  const { form, submitError, handleSubmit } = useSettingsDrawerForm({
    resolver: zodResolver(subCategoryFormSchema),
    defaultValues: defaultSubCategoryFormValues,
    item: category,
    isOpen,
    getResetValues: (nextCategory) => getSubCategoryFormValues(nextCategory ?? undefined, null),
    onSubmit,
    submitErrorMessage: "子类别保存失败",
  });

  return (
    <SettingsFormDrawer
      bodyClassName="space-y-4"
      isOpen={isOpen}
      isSaving={isSaving}
      size="lg"
      submitError={submitError}
      title={category ? "编辑子类别" : "新增子类别"}
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <Controller
        control={form.control}
        name="label"
        render={({ field, fieldState }) => (
          <Input
            errorMessage={fieldState.error?.message}
            isInvalid={Boolean(fieldState.error)}
            label="名称"
            placeholder="如 午餐"
            value={field.value}
            onBlur={field.onBlur}
            onValueChange={field.onChange}
          />
        )}
      />
      <Controller
        control={form.control}
        name="main_category_id"
        render={({ field, fieldState }) => (
          <Select
            errorMessage={fieldState.error?.message}
            isInvalid={Boolean(fieldState.error)}
            label="所属主类别"
            placeholder="请选择"
            selectedKeys={field.value ? [field.value] : []}
            onSelectionChange={(keys) => field.onChange(getSingleSelectionValue(keys))}
          >
            {mainCategories.map((item) => (
              <SelectItem
                key={String(item.id)}
                textValue={`${item.label}（${item.transaction_type}）`}
              >
                {item.label}（{item.transaction_type}）
              </SelectItem>
            ))}
          </Select>
        )}
      />
      <Controller
        control={form.control}
        name="budget_type_id"
        render={({ field, fieldState }) => (
          <Select
            errorMessage={fieldState.error?.message}
            isInvalid={Boolean(fieldState.error)}
            label="预算计划"
            placeholder="可留空"
            selectedKeys={field.value ? [field.value] : []}
            onSelectionChange={(keys) => field.onChange(getSingleSelectionValue(keys))}
          >
            {budgetTypes.map((item) => (
              <SelectItem key={String(item.id)}>{item.name}</SelectItem>
            ))}
          </Select>
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
      <Controller
        control={form.control}
        name="back_color"
        render={({ field, fieldState }) => (
          <Input
            errorMessage={fieldState.error?.message}
            isInvalid={Boolean(fieldState.error)}
            label="背景色"
            placeholder="如 bg-blue-100"
            value={field.value}
            onBlur={field.onBlur}
            onValueChange={field.onChange}
          />
        )}
      />
      <Controller
        control={form.control}
        name="fore_color"
        render={({ field, fieldState }) => (
          <Input
            errorMessage={fieldState.error?.message}
            isInvalid={Boolean(fieldState.error)}
            label="前景色"
            placeholder="如 text-blue-800"
            value={field.value}
            onBlur={field.onBlur}
            onValueChange={field.onChange}
          />
        )}
      />
    </SettingsFormDrawer>
  );
}
