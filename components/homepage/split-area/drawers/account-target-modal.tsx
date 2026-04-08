"use client";

import type { MainCategory, SubCategory } from "@/types";
import type { AccountTargetPayload } from "@/lib/split-actions";

import { useState, useEffect } from "react";
import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { Select, SelectItem } from "@heroui/react";

type AccountActionKey = "transfer-to" | "transfer-from" | "recharge-to" | "recharge-from";

interface AccountOption {
  id: number | string;
  name: string;
}

interface AccountTargetModalProps {
  isOpen: boolean;
  actionKey: AccountActionKey | null;
  sourceAccountId: string;
  accounts: AccountOption[];
  mainCategories: MainCategory[];
  subCategories: SubCategory[];
  onConfirm: (payload: AccountTargetPayload) => void;
  onCancel: () => void;
}

function getTitle(actionKey: AccountActionKey | null): string {
  switch (actionKey) {
    case "transfer-to":
      return "请选择转账的目标账户";
    case "transfer-from":
      return "请选择转账的来源账户";
    case "recharge-to":
      return "请选择充值的目标账户";
    case "recharge-from":
      return "请选择充值的来源账户";
    default:
      return "请选择账户";
  }
}

export function AccountTargetModal({
  isOpen,
  actionKey,
  sourceAccountId,
  accounts,
  mainCategories,
  subCategories,
  onConfirm,
  onCancel,
}: AccountTargetModalProps) {
  const [targetAccountId, setTargetAccountId] = useState("");

  useEffect(() => {
    if (isOpen) setTargetAccountId("");
  }, [isOpen]);

  const handleConfirm = () => {
    if (!actionKey || !targetAccountId) return;
    onConfirm({
      actionKey,
      account_id: targetAccountId,
      mainCategories,
      subCategories,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onCancel} size="md">
      <ModalContent
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleConfirm();
          }
        }}
      >
        <ModalHeader className="flex flex-col gap-1">{getTitle(actionKey)}</ModalHeader>
        <ModalBody>
          <Select
            label="账户"
            labelPlacement="outside"
            placeholder="请选择账户"
            selectedKeys={targetAccountId ? [targetAccountId] : []}
            onSelectionChange={(keys) => {
              const account = Array.from(keys)[0];
              setTargetAccountId(account ? String(account) : "");
            }}
            disallowEmptySelection
            size="md"
            variant="bordered"
          >
            {accounts
              .filter((account) => account.id.toString() !== sourceAccountId)
              .map((account) => (
                <SelectItem key={account.id.toString()}>{account.name}</SelectItem>
              ))}
          </Select>
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" color="default" onPress={onCancel}>
            取消
          </Button>
          <Button color="primary" onPress={handleConfirm} isDisabled={!targetAccountId}>
            确认
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
