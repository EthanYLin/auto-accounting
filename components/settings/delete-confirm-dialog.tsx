"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@heroui/react";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";

export type SettingsDeleteRequest = {
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void>;
};

export function DeleteConfirmDialog({
  request,
  onClose,
}: {
  request: SettingsDeleteRequest | null;
  onClose: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!request) {
      setIsSubmitting(false);
    }
  }, [request]);

  const handleConfirm = useCallback(async () => {
    if (!request || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await request.onConfirm();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  }, [request, isSubmitting, onClose]);

  return (
    <Modal
      isDismissable={!isSubmitting}
      isKeyboardDismissDisabled={isSubmitting}
      isOpen={Boolean(request)}
      size="sm"
      onClose={onClose}
    >
      <ModalContent
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void handleConfirm();
          }
        }}
      >
        <ModalHeader>{request?.title ?? "确认删除"}</ModalHeader>
        <ModalBody>
          <p className="text-sm text-default-600">{request?.description}</p>
        </ModalBody>
        <ModalFooter>
          <Button isDisabled={isSubmitting} variant="light" onPress={onClose}>
            取消
          </Button>
          <Button color="danger" isLoading={isSubmitting} onPress={handleConfirm}>
            {request?.confirmLabel ?? "确认删除"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
