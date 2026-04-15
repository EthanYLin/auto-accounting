import type { DangerConfirm, QuickActionIcon, QuickActionKey } from "./action-bar-config";

import React from "react";
import { Button, ButtonGroup, Kbd } from "@heroui/react";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownSection,
  DropdownTrigger,
} from "@heroui/react";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { CheckIcon, ChevronDownIcon, XMarkIcon } from "@heroicons/react/24/outline";

import { QUICK_ACTION_ITEMS } from "./action-bar-config";

interface QuickActionsDropdownButtonProps {
  currentQuickActionIcon: QuickActionIcon;
  currentQuickActionLabel: string;
  autoSwitch: boolean;
  dirtyCount: number;
  disabledKeys: QuickActionKey[];
  isCurrentQuickActionDisabled: boolean;
  dangerConfirm: DangerConfirm;
  onCurrentQuickAction: () => void;
  onDropdownAction: (key: QuickActionKey) => void;
  className?: string;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
}

const SAVE_ACTION_ITEMS = QUICK_ACTION_ITEMS.filter((item) => item.section === 1);
const NAVIGATION_ACTION_ITEMS = QUICK_ACTION_ITEMS.filter((item) => item.section === 2);
const DANGER_ACTION_ITEMS = QUICK_ACTION_ITEMS.filter((item) => item.section === 3);

const ITEM_KBD: Partial<Record<string, React.ReactNode>> = {
  save: (
    <Kbd keys={["command"]} className="text-[10px] hidden md:inline-flex">
      S
    </Kbd>
  ),
  "save-cancel": (
    <Kbd keys={["command"]} className="text-[10px] hidden md:inline-flex">
      E
    </Kbd>
  ),
  "save-later": (
    <Kbd keys={["command", "shift"]} className="text-[10px] hidden md:inline-flex">
      S
    </Kbd>
  ),
  new: (
    <Kbd keys={["option"]} className="text-[10px] hidden md:inline-flex">
      N
    </Kbd>
  ),
  "locate-current": (
    <Kbd keys={[]} className="text-[10px] w-4 h-4 p-0 hidden md:flex items-center justify-center">
      L
    </Kbd>
  ),
  delete: (
    <Kbd keys={["option"]} className="text-[10px] hidden md:inline-flex">
      ⌫
    </Kbd>
  ),
};

export function QuickActionsDropdownButton({
  currentQuickActionIcon: CurrentQuickActionIcon,
  currentQuickActionLabel,
  autoSwitch,
  dirtyCount,
  disabledKeys,
  isCurrentQuickActionDisabled,
  dangerConfirm,
  onCurrentQuickAction,
  onDropdownAction,
  className,
  fullWidth,
  size = "sm",
}: QuickActionsDropdownButtonProps) {
  return (
    <>
      <ButtonGroup size={size} variant="flat" className={className} fullWidth={fullWidth}>
        <Button
          className={fullWidth ? "flex-1" : undefined}
          startContent={<CurrentQuickActionIcon className="h-4 w-4" />}
          isDisabled={isCurrentQuickActionDisabled}
          onPress={onCurrentQuickAction}
          aria-label={currentQuickActionLabel}
        >
          {currentQuickActionLabel}
        </Button>

        <Dropdown placement="bottom-end">
          <DropdownTrigger>
            <Button isIconOnly aria-label="更多操作">
              <ChevronDownIcon className="h-3.5 w-3.5" />
            </Button>
          </DropdownTrigger>
          <DropdownMenu
            aria-label="快捷操作"
            onAction={(key) => {
              const item = QUICK_ACTION_ITEMS.find((i) => i.key === key);
              item && onDropdownAction(item.key);
            }}
            disallowEmptySelection
            disabledKeys={disabledKeys}
            itemClasses={{ base: "py-2", title: "text-xs font-medium" }}
          >
            <DropdownSection showDivider title="保存操作">
              {SAVE_ACTION_ITEMS.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <DropdownItem
                    key={item.key}
                    startContent={
                      item.key === "auto-switch" ? (
                        autoSwitch ? (
                          <CheckIcon className="h-4 w-4" />
                        ) : (
                          <XMarkIcon className="h-4 w-4" />
                        )
                      ) : (
                        <ItemIcon className="h-4 w-4" />
                      )
                    }
                    endContent={ITEM_KBD[item.key]}
                  >
                    {item.key === "auto-switch"
                      ? `已${autoSwitch ? "开启" : "关闭"} ${item.label}`
                      : item.label.replace("$dirtyCount", String(dirtyCount))}
                  </DropdownItem>
                );
              })}
            </DropdownSection>

            <DropdownSection showDivider title="导航操作">
              {NAVIGATION_ACTION_ITEMS.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <DropdownItem
                    key={item.key}
                    startContent={<ItemIcon className="h-4 w-4" />}
                    endContent={ITEM_KBD[item.key]}
                  >
                    {item.label.replace("$dirtyCount", String(dirtyCount))}
                  </DropdownItem>
                );
              })}
            </DropdownSection>

            <DropdownSection
              title="丢弃操作"
              classNames={{ heading: "text-danger" }}
              itemClasses={{
                base: "text-danger data-[hover=true]:bg-danger/10",
                title: "text-danger",
              }}
            >
              {DANGER_ACTION_ITEMS.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <DropdownItem
                    key={item.key}
                    color="danger"
                    startContent={<ItemIcon className="h-4 w-4" />}
                    endContent={ITEM_KBD[item.key]}
                  >
                    {item.label.replace("$dirtyCount", String(dirtyCount))}
                  </DropdownItem>
                );
              })}
            </DropdownSection>
          </DropdownMenu>
        </Dropdown>
      </ButtonGroup>

      <Modal isOpen={dangerConfirm.isOpen} onClose={dangerConfirm.onClose} size="sm">
        <ModalContent
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              dangerConfirm.onConfirm();
            }
          }}
        >
          <ModalHeader>{dangerConfirm.title}</ModalHeader>
          <ModalBody>
            <p className="text-sm text-gray-600 dark:text-zinc-400">{dangerConfirm.description}</p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={dangerConfirm.onClose}>
              取消
            </Button>
            <Button color="danger" onPress={dangerConfirm.onConfirm}>
              {dangerConfirm.confirmLabel}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
