"use client";

import type { ReactNode } from "react";
import type { Selection } from "@react-types/shared";

import { Card, CardBody, CardHeader } from "@heroui/react";
import { Chip } from "@heroui/react";
import { Divider } from "@heroui/react";
import { Spinner } from "@heroui/react";

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
      <CardHeader className="flex flex-col gap-4 px-6 pb-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
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
      <CardBody className="px-6 py-5">{children}</CardBody>
    </Card>
  );
}

export function SettingsLoadingState({
  label = "加载中...",
}: {
  label?: string;
}) {
  return (
    <div className="flex min-h-40 items-center justify-center py-8">
      <Spinner label={label} />
    </div>
  );
}

export function SettingsEmptyState({ title }: { title: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-default-200 bg-default-50/40 px-6 py-10 text-center">
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
