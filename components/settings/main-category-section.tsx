"use client";

import type { SettingsDeleteRequest } from "@/components/settings/delete-confirm-dialog";
import type { MainCategory } from "@/types";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@heroui/react";
import { Input } from "@heroui/react";
import { Select, SelectItem } from "@heroui/react";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";
import { Controller } from "react-hook-form";

import { TRANSACTION_TYPES } from "@/constants/transaction-type";
import {
  defaultMainCategoryFormValues,
  getMainCategoryFormValues,
  mainCategoryFormSchema,
  toMainCategoryPayload,
  type MainCategoryFormValues,
} from "@/components/settings/settings-form-schemas";
import {
  SettingsFormDrawer,
  useSettingsDrawerForm,
} from "@/components/settings/settings-form-drawer";
import { useMainCategoryMutations } from "@/components/settings/settings-mutations";
import {
  SettingsEmptyState,
  SettingsLoadingState,
  SettingsSectionCard,
  getSingleSelectionValue,
} from "@/components/settings/settings-ui";

export function MainCategorySection({
  mainCategories,
  isLoading,
  onRequestDelete,
}: {
  mainCategories: MainCategory[];
  isLoading: boolean;
  onRequestDelete: (request: SettingsDeleteRequest) => void;
}) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MainCategory | null>(
    null,
  );
  const { saveMainCategory, deleteMainCategory, isSaving } =
    useMainCategoryMutations();

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setEditingCategory(null);
  };

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
            新增主类别
          </Button>
        }
        count={mainCategories.length}
        title="主类别"
      >
        {isLoading ? (
          <SettingsLoadingState />
        ) : mainCategories.length === 0 ? (
          <SettingsEmptyState title="还没有主类别" />
        ) : (
          <Table removeWrapper aria-label="主类别列表">
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>名称</TableColumn>
              <TableColumn>交易类型</TableColumn>
              <TableColumn>图标</TableColumn>
              <TableColumn align="end">操作</TableColumn>
            </TableHeader>
            <TableBody items={mainCategories}>
              {(item) => (
                <TableRow key={item.id}>
                  <TableCell>#{item.id}</TableCell>
                  <TableCell>{item.label}</TableCell>
                  <TableCell>{item.transaction_type}</TableCell>
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
                            title: "删除主类别",
                            description: `确定删除主类别“${item.label}”吗？`,
                            onConfirm: () =>
                              deleteMainCategory({
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
      </SettingsSectionCard>

      <MainCategoryDrawer
        category={editingCategory}
        isOpen={isDrawerOpen}
        isSaving={isSaving}
        onClose={closeDrawer}
        onSubmit={async (values) => {
          await saveMainCategory(
            toMainCategoryPayload(values),
            editingCategory?.id,
          );
          closeDrawer();
        }}
      />
    </>
  );
}

function MainCategoryDrawer({
  isOpen,
  category,
  isSaving,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  category: MainCategory | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (values: MainCategoryFormValues) => Promise<void>;
}) {
  const { form, submitError, handleSubmit } = useSettingsDrawerForm({
    resolver: zodResolver(mainCategoryFormSchema),
    defaultValues: defaultMainCategoryFormValues,
    item: category,
    isOpen,
    getResetValues: (nextCategory) =>
      getMainCategoryFormValues(nextCategory ?? undefined),
    onSubmit,
    submitErrorMessage: "主类别保存失败",
  });

  return (
    <SettingsFormDrawer
      bodyClassName="space-y-4"
      isOpen={isOpen}
      isSaving={isSaving}
      size="lg"
      submitError={submitError}
      title={category ? "编辑主类别" : "新增主类别"}
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
            placeholder="如 饮食"
            value={field.value}
            onBlur={field.onBlur}
            onValueChange={field.onChange}
          />
        )}
      />
      <Controller
        control={form.control}
        name="transaction_type"
        render={({ field, fieldState }) => (
          <Select
            errorMessage={fieldState.error?.message}
            isInvalid={Boolean(fieldState.error)}
            label="交易类型"
            selectedKeys={[field.value]}
            onSelectionChange={(keys) =>
              field.onChange(getSingleSelectionValue(keys))
            }
          >
            {TRANSACTION_TYPES.map((type) => (
              <SelectItem key={type.type}>{type.type}</SelectItem>
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
            placeholder="如 bg-yellow-100"
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
            placeholder="如 text-yellow-800"
            value={field.value}
            onBlur={field.onBlur}
            onValueChange={field.onChange}
          />
        )}
      />
    </SettingsFormDrawer>
  );
}
