"use client";

import type { FourChainState } from "@/components/homepage/common/four-chain-selector";

import { useState } from "react";
import { Button } from "@heroui/react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";

import { FourChainSelector } from "@/components/homepage/common/four-chain-selector";

interface CategorySelectModalProps {
  isOpen: boolean;
  initialChainState: FourChainState;
  onConfirm: (chainState: FourChainState) => void;
  onCancel: () => void;
}

export function CategorySelectModal({
  isOpen,
  initialChainState,
  onConfirm,
  onCancel,
}: CategorySelectModalProps) {
  // 通过父组件的 key 控制重新挂载，useState initializer 保证每次挂载时拿到正确的初始值
  const [draftChainState, setDraftChainState] = useState<FourChainState>(initialChainState);

  const handleConfirm = () => {
    onConfirm(draftChainState);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.nativeEvent.isComposing || event.key !== "Enter") return;
    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    if (!(event.target instanceof HTMLElement)) return;
    if (event.target.closest("button")) return;
    if (event.target.closest('[role="listbox"],[role="option"],[role="combobox"]')) return;
    event.preventDefault();
    handleConfirm();
  };

  return (
    <Modal isOpen={isOpen} onClose={onCancel} size="4xl" scrollBehavior="inside">
      <ModalContent onKeyDown={handleKeyDown}>
        <ModalHeader className="flex flex-col gap-1">选择类别</ModalHeader>
        <ModalBody>
          <FourChainSelector mode="listbox" value={draftChainState} onChange={setDraftChainState} />
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" color="default" onPress={onCancel}>
            取消
          </Button>
          <Button color="primary" onPress={handleConfirm}>
            确认
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
