"use client";

import type { ComponentProps, ReactNode } from "react";
import type { DefaultValues, FieldValues, Resolver } from "react-hook-form";

import { useEffect, useRef, useState } from "react";
import {
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
} from "@heroui/react";
import { useForm } from "react-hook-form";

import {
  SettingsFormError,
  getErrorMessage,
} from "@/components/settings/settings-ui";

type UseSettingsDrawerFormOptions<TValues extends FieldValues, TItem> = {
  resolver: Resolver<TValues>;
  defaultValues: DefaultValues<TValues>;
  item: TItem | null;
  isOpen: boolean;
  getResetValues: (item: TItem | null) => TValues;
  onSubmit: (values: TValues) => Promise<void>;
  submitErrorMessage: string;
};

export function useSettingsDrawerForm<
  TValues extends FieldValues,
  TItem = never,
>({
  resolver,
  defaultValues,
  item,
  isOpen,
  getResetValues,
  onSubmit,
  submitErrorMessage,
}: UseSettingsDrawerFormOptions<TValues, TItem>) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useForm<TValues>({
    resolver,
    defaultValues,
  });
  const getResetValuesRef = useRef(getResetValues);

  getResetValuesRef.current = getResetValues;

  useEffect(() => {
    form.reset(getResetValuesRef.current(item));
    setSubmitError(null);
  }, [form, isOpen, item]);

  const handleSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await onSubmit(values);
      form.reset(defaultValues);
    } catch (error) {
      setSubmitError(getErrorMessage(error, submitErrorMessage));
    }
  });

  return {
    form,
    submitError,
    handleSubmit,
  };
}

type SettingsFormDrawerProps = {
  title: ReactNode;
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: ComponentProps<"form">["onSubmit"];
  submitError: string | null;
  children: ReactNode;
  bodyClassName?: string;
  cancelLabel?: string;
  scrollBehavior?: ComponentProps<typeof Drawer>["scrollBehavior"];
  size?: ComponentProps<typeof Drawer>["size"];
  submitLabel?: string;
};

export function SettingsFormDrawer({
  title,
  isOpen,
  isSaving,
  onClose,
  onSubmit,
  submitError,
  children,
  bodyClassName = "space-y-4",
  cancelLabel = "取消",
  scrollBehavior,
  size = "md",
  submitLabel = "保存",
}: SettingsFormDrawerProps) {
  return (
    <Drawer
      isOpen={isOpen}
      placement="right"
      scrollBehavior={scrollBehavior}
      size={size}
      onOpenChange={(open) => {
        if (!open && !isSaving) onClose();
      }}
    >
      <DrawerContent>
        <form className="flex h-full flex-col" onSubmit={onSubmit}>
          <DrawerHeader>{title}</DrawerHeader>
          <DrawerBody className={bodyClassName}>
            <SettingsFormError message={submitError} />
            {children}
          </DrawerBody>
          <DrawerFooter>
            <Button isDisabled={isSaving} variant="light" onPress={onClose}>
              {cancelLabel}
            </Button>
            <Button color="primary" isLoading={isSaving} type="submit">
              {submitLabel}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
