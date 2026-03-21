"use client";

import type { ReactNode } from "react";

import {
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
} from "@heroui/react";

export function SplitDrawerShell({
  isOpen,
  title,
  totalSigned,
  canSave,
  onSave,
  onCancel,
  children,
}: {
  isOpen: boolean;
  title: string;
  totalSigned: number;
  canSave: boolean;
  onSave: () => void;
  onCancel: () => void;
  children: ReactNode;
}) {
  return (
    <Drawer
      isOpen={isOpen}
      hideCloseButton
      placement="bottom"
      size="xl"
      scrollBehavior="inside"
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DrawerContent>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <DrawerHeader className="flex flex-col gap-1 border-b border-divider px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-lg font-semibold">{title}</span>
              <span className="text-lg font-semibold tabular-nums">￥{totalSigned.toFixed(2)}</span>
            </DrawerHeader>

            <DrawerBody className="flex-none gap-6 px-6 py-4">{children}</DrawerBody>
          </div>

          <DrawerFooter className="shrink-0 border-t border-divider px-6 py-4">
            <Button fullWidth color="primary" size="md" isDisabled={!canSave} onPress={onSave}>
              保存
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
