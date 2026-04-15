"use client";

import type { ReactNode } from "react";
import type { Selection } from "@react-types/shared";

import { Card, CardBody, CardHeader } from "@heroui/react";
import { Chip } from "@heroui/react";
import { Divider } from "@heroui/react";
import { Spinner } from "@heroui/react";
import { Button } from "@heroui/react";

export function SettingsSectionCard({
  title,
  count,
  actions,
  children,
  className,
}: {
  title: string;
  count?: number;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex items-center justify-between gap-3 px-4 pb-3 pt-4 sm:gap-4 sm:px-6 sm:pb-4 sm:pt-5">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h2 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
            {title}
          </h2>
          {typeof count === "number" && (
            <Chip color="primary" size="sm" variant="flat">
              {count}
            </Chip>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center">{actions}</div>}
      </CardHeader>
      <Divider />
      <CardBody className="px-4 py-4 sm:px-6 sm:py-5">{children}</CardBody>
    </Card>
  );
}

export function SettingsLoadingState({ label = "加载中..." }: { label?: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center py-8">
      <Spinner label={label} />
    </div>
  );
}

export function SettingsEmptyState({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-default-200 bg-default-50/40 px-4 py-8 text-center sm:rounded-3xl sm:px-6 sm:py-10">
      <p className="text-sm font-medium text-foreground">{title}</p>
    </div>
  );
}

export function SettingsFormError({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div className="rounded-2xl border border-danger/20 bg-danger-50 px-4 py-3 text-sm text-danger">
      {message}
    </div>
  );
}

export function SettingsMobileItem({
  label,
  fields,
  fieldsInline = true,
  onEdit,
  onDelete,
}: {
  label: ReactNode;
  fields?: { key: string; value: ReactNode }[];
  fieldsInline?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const activeFields = fields?.filter((f) => f.value) ?? [];
  const hasSecondary = activeFields.length > 0;

  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug text-foreground">{label}</p>
        {hasSecondary &&
          (fieldsInline ? (
            <p className="mt-1 text-xs leading-snug text-default-500">
              {activeFields.map((f) => f.value).join(" ")}
            </p>
          ) : (
            <div className="mt-1 space-y-0.5">
              {activeFields.map((f) => (
                <p key={f.key} className="text-xs leading-snug text-default-500">
                  {f.key}: {f.value}
                </p>
              ))}
            </div>
          ))}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button size="sm" variant="light" onPress={onEdit}>
          编辑
        </Button>
        <Button color="danger" size="sm" variant="light" onPress={onDelete}>
          删除
        </Button>
      </div>
    </div>
  );
}

export function SettingsMobileList({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-default-100">{children}</div>;
}

export function getSingleSelectionValue(keys: Selection) {
  if (keys === "all") {
    return "";
  }

  const [firstKey] = Array.from(keys);

  return firstKey ? String(firstKey) : "";
}

export function getErrorMessage(error: unknown, fallbackMessage = "操作失败") {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}
