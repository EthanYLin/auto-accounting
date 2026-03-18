"use client";

import type { SettingsDeleteRequest } from "@/components/settings/delete-confirm-dialog";
import type { Account } from "@/types";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@heroui/react";
import { Input } from "@heroui/react";
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/react";
import { Controller } from "react-hook-form";

import {
  accountFormSchema,
  type AccountFormValues,
  defaultAccountFormValues,
  getAccountFormValues,
  toAccountPayload,
} from "@/components/settings/settings-form-schemas";
import {
  SettingsFormDrawer,
  useSettingsDrawerForm,
} from "@/components/settings/settings-form-drawer";
import { useAccountMutations } from "@/components/settings/settings-mutations";
import {
  SettingsEmptyState,
  SettingsLoadingState,
  SettingsSectionCard,
} from "@/components/settings/settings-ui";

export function AccountSection({
  accounts,
  isLoading,
  onRequestDelete,
}: {
  accounts: Account[];
  isLoading: boolean;
  onRequestDelete: (request: SettingsDeleteRequest) => void;
}) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const { saveAccount, deleteAccount, isSaving } = useAccountMutations();

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setEditingAccount(null);
  };

  return (
    <>
      <SettingsSectionCard
        actions={
          <Button
            color="primary"
            onPress={() => {
              setEditingAccount(null);
              setIsDrawerOpen(true);
            }}
          >
            新增账户
          </Button>
        }
        count={accounts.length}
        title="账户"
      >
        {isLoading ? (
          <SettingsLoadingState />
        ) : accounts.length === 0 ? (
          <SettingsEmptyState title="还没有账户" />
        ) : (
          <Table removeWrapper aria-label="账户列表">
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>名称</TableColumn>
              <TableColumn align="end">操作</TableColumn>
            </TableHeader>
            <TableBody items={accounts}>
              {(account) => (
                <TableRow key={account.id}>
                  <TableCell>#{account.id}</TableCell>
                  <TableCell>{account.name}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="light"
                        onPress={() => {
                          setEditingAccount(account);
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
                            title: "删除账户",
                            description: `确定删除账户“${account.name}”吗？`,
                            onConfirm: () =>
                              deleteAccount({
                                id: account.id,
                                name: account.name,
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

      <AccountDrawer
        account={editingAccount}
        isOpen={isDrawerOpen}
        isSaving={isSaving}
        onClose={closeDrawer}
        onSubmit={async (values) => {
          await saveAccount(toAccountPayload(values), editingAccount?.id);
          closeDrawer();
        }}
      />
    </>
  );
}

function AccountDrawer({
  isOpen,
  account,
  isSaving,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  account: Account | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (values: AccountFormValues) => Promise<void>;
}) {
  const { form, submitError, handleSubmit } = useSettingsDrawerForm({
    resolver: zodResolver(accountFormSchema),
    defaultValues: defaultAccountFormValues,
    item: account,
    isOpen,
    getResetValues: (nextAccount) => getAccountFormValues(nextAccount ?? undefined),
    onSubmit,
    submitErrorMessage: "账户保存失败",
  });

  return (
    <SettingsFormDrawer
      bodyClassName="space-y-4"
      isOpen={isOpen}
      isSaving={isSaving}
      size="md"
      submitError={submitError}
      title={account ? "编辑账户" : "新增账户"}
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
            label="账户名称"
            placeholder="如 工商银行信用卡"
            value={field.value}
            onBlur={field.onBlur}
            onValueChange={field.onChange}
          />
        )}
      />
    </SettingsFormDrawer>
  );
}
