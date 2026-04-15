"use client";

import type { AppDataValue } from "@/types";

import { QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";
import { addToast } from "@heroui/react";

import {
  createAccount,
  createBudgetType,
  createMainCategory,
  createMatchingRule,
  createSubCategory,
  deleteAccount,
  deleteBudgetType,
  deleteMainCategory,
  deleteMatchingRule,
  deleteSubCategory,
  updateAccount,
  updateBudgetType,
  updateMainCategory,
  updateMatchingRule,
  updateSubCategory,
} from "@/app/actions/data";
import { appDataQueryKey } from "@/components/context/app-data-context";

type ActionResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

type EntityWithId = {
  id: number;
};

type AppDataListKey = keyof AppDataValue;
type AppDataListItem<K extends AppDataListKey> = AppDataValue[K][number] & EntityWithId;

type SettingsEntityMutationOptions<
  K extends AppDataListKey,
  TPayload,
  TDeletePayload extends { id: number },
> = {
  listKey: K;
  create: (payload: TPayload) => Promise<ActionResult<AppDataListItem<K>>>;
  update: (id: number, payload: TPayload) => Promise<ActionResult<AppDataListItem<K>>>;
  remove: (id: number) => Promise<ActionResult<null>>;
  messages: {
    createError: string;
    createSuccess: string;
    deleteError: string;
    deleteErrorTitle: string;
    deleteSuccess: (variables: TDeletePayload) => string;
    saveErrorTitle: string;
    updateError: string;
    updateSuccess: string;
  };
};

const emptyAppData: AppDataValue = {
  accounts: [],
  mainCategories: [],
  subCategories: [],
  budgetTypes: [],
  matchingRules: [],
};

function unwrapMutationResult<T>(result: ActionResult<T>, fallbackMessage: string) {
  if (!result.success) {
    throw new Error(result.error || fallbackMessage);
  }

  if (result.data === undefined) {
    throw new Error(fallbackMessage);
  }

  return result.data;
}

function unwrapDeleteResult(result: ActionResult<null>, fallbackMessage: string) {
  if (!result.success) {
    throw new Error(result.error || fallbackMessage);
  }
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

function upsertItem<T extends EntityWithId>(items: T[], nextItem: T) {
  const itemIndex = items.findIndex((item) => item.id === nextItem.id);

  if (itemIndex === -1) {
    return [...items, nextItem];
  }

  return items.map((item) => (item.id === nextItem.id ? nextItem : item));
}

function removeItem<T extends EntityWithId>(items: T[], id: number) {
  return items.filter((item) => item.id !== id);
}

function upsertAppDataItem<K extends AppDataListKey>(
  items: AppDataValue[K],
  nextItem: AppDataListItem<K>,
) {
  return upsertItem(items as AppDataListItem<K>[], nextItem) as AppDataValue[K];
}

function removeAppDataItem<K extends AppDataListKey>(items: AppDataValue[K], id: number) {
  return removeItem(items as AppDataListItem<K>[], id) as AppDataValue[K];
}

function setAppDataQueryData(
  queryClient: QueryClient,
  updater: (current: AppDataValue) => AppDataValue,
) {
  queryClient.setQueryData<AppDataValue>(appDataQueryKey, (current) =>
    updater(current ?? emptyAppData),
  );
}

function updateAppDataList<K extends AppDataListKey>(
  queryClient: QueryClient,
  key: K,
  updater: (items: AppDataValue[K]) => AppDataValue[K],
) {
  setAppDataQueryData(queryClient, (current) => ({
    ...current,
    [key]: updater(current[key]),
  }));
}

function invalidateAppDataInBackground(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: appDataQueryKey }).catch(() => undefined);
}

function useSettingsEntityMutations<
  K extends AppDataListKey,
  TPayload,
  TDeletePayload extends { id: number },
>({
  listKey,
  create,
  update,
  remove,
  messages,
}: SettingsEntityMutationOptions<K, TPayload, TDeletePayload>) {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (payload: TPayload) =>
      unwrapMutationResult(await create(payload), messages.createError),
    onSuccess: (entity) => {
      updateAppDataList(queryClient, listKey, (items) => upsertAppDataItem(items, entity));
      addToast({ title: messages.createSuccess, color: "success" });
      invalidateAppDataInBackground(queryClient);
    },
    onError: (error) => {
      addToast({
        title: messages.saveErrorTitle,
        description: getErrorMessage(error, messages.createError),
        color: "danger",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: TPayload }) =>
      unwrapMutationResult(await update(id, payload), messages.updateError),
    onSuccess: (entity) => {
      updateAppDataList(queryClient, listKey, (items) => upsertAppDataItem(items, entity));
      addToast({ title: messages.updateSuccess, color: "success" });
      invalidateAppDataInBackground(queryClient);
    },
    onError: (error) => {
      addToast({
        title: messages.saveErrorTitle,
        description: getErrorMessage(error, messages.updateError),
        color: "danger",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (variables: TDeletePayload) => {
      unwrapDeleteResult(await remove(variables.id), messages.deleteError);
    },
    onSuccess: (_data, variables) => {
      updateAppDataList(queryClient, listKey, (items) => removeAppDataItem(items, variables.id));
      addToast({
        title: messages.deleteSuccess(variables),
        color: "success",
      });
      invalidateAppDataInBackground(queryClient);
    },
    onError: (error) => {
      addToast({
        title: messages.deleteErrorTitle,
        description: getErrorMessage(error, messages.deleteError),
        color: "danger",
      });
    },
  });

  return {
    save(payload: TPayload, entityId?: number) {
      return entityId
        ? updateMutation.mutateAsync({ id: entityId, payload })
        : createMutation.mutateAsync(payload);
    },
    deleteItem: deleteMutation.mutateAsync,
    isSaving: createMutation.isPending || updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useAccountMutations() {
  const { save, deleteItem, isSaving, isDeleting } = useSettingsEntityMutations({
    listKey: "accounts",
    create: createAccount,
    update: updateAccount,
    remove: deleteAccount,
    messages: {
      createError: "创建账户失败",
      createSuccess: "账户已创建",
      deleteError: "删除账户失败",
      deleteErrorTitle: "账户删除失败",
      deleteSuccess: (variables: { id: number; name: string }) => `账户“${variables.name}”已删除`,
      saveErrorTitle: "账户保存失败",
      updateError: "更新账户失败",
      updateSuccess: "账户已更新",
    },
  });

  return {
    saveAccount: save,
    deleteAccount: deleteItem,
    isSaving,
    isDeleting,
  };
}

export function useBudgetMutations() {
  const { save, deleteItem, isSaving, isDeleting } = useSettingsEntityMutations({
    listKey: "budgetTypes",
    create: ({ name, icon }: { name: string; icon?: string }) => createBudgetType(name, icon),
    update: (id, { name, icon }: { name: string; icon?: string }) =>
      updateBudgetType(id, name, icon),
    remove: deleteBudgetType,
    messages: {
      createError: "创建预算计划失败",
      createSuccess: "预算计划已创建",
      deleteError: "删除预算计划失败",
      deleteErrorTitle: "预算计划删除失败",
      deleteSuccess: (variables: { id: number; name: string }) =>
        `预算计划“${variables.name}”已删除`,
      saveErrorTitle: "预算计划保存失败",
      updateError: "更新预算计划失败",
      updateSuccess: "预算计划已更新",
    },
  });

  return {
    saveBudget: save,
    deleteBudget: deleteItem,
    isSaving,
    isDeleting,
  };
}

export function useMainCategoryMutations() {
  const { save, deleteItem, isSaving, isDeleting } = useSettingsEntityMutations({
    listKey: "mainCategories",
    create: createMainCategory,
    update: updateMainCategory,
    remove: deleteMainCategory,
    messages: {
      createError: "创建主类别失败",
      createSuccess: "主类别已创建",
      deleteError: "删除主类别失败",
      deleteErrorTitle: "主类别删除失败",
      deleteSuccess: (variables: { id: number; label: string }) =>
        `主类别“${variables.label}”已删除`,
      saveErrorTitle: "主类别保存失败",
      updateError: "更新主类别失败",
      updateSuccess: "主类别已更新",
    },
  });

  return {
    saveMainCategory: save,
    deleteMainCategory: deleteItem,
    isSaving,
    isDeleting,
  };
}

export function useSubCategoryMutations() {
  const { save, deleteItem, isSaving, isDeleting } = useSettingsEntityMutations({
    listKey: "subCategories",
    create: createSubCategory,
    update: updateSubCategory,
    remove: deleteSubCategory,
    messages: {
      createError: "创建子类别失败",
      createSuccess: "子类别已创建",
      deleteError: "删除子类别失败",
      deleteErrorTitle: "子类别删除失败",
      deleteSuccess: (variables: { id: number; label: string }) =>
        `子类别“${variables.label}”已删除`,
      saveErrorTitle: "子类别保存失败",
      updateError: "更新子类别失败",
      updateSuccess: "子类别已更新",
    },
  });

  return {
    saveSubCategory: save,
    deleteSubCategory: deleteItem,
    isSaving,
    isDeleting,
  };
}

export function useMatchingRuleMutations() {
  const { save, deleteItem, isSaving, isDeleting } = useSettingsEntityMutations({
    listKey: "matchingRules",
    create: createMatchingRule,
    update: updateMatchingRule,
    remove: deleteMatchingRule,
    messages: {
      createError: "创建匹配规则失败",
      createSuccess: "匹配规则已创建",
      deleteError: "删除匹配规则失败",
      deleteErrorTitle: "匹配规则删除失败",
      deleteSuccess: () => "匹配规则已删除",
      saveErrorTitle: "匹配规则保存失败",
      updateError: "更新匹配规则失败",
      updateSuccess: "匹配规则已更新",
    },
  });

  return {
    saveMatchingRule: save,
    deleteMatchingRule: deleteItem,
    isSaving,
    isDeleting,
  };
}
