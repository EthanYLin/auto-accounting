import { Button, Kbd } from "@heroui/react";
import { CheckCircleIcon, ForwardIcon } from "@heroicons/react/24/outline";

interface PrimarySaveButtonProps {
  saveButtonOverride: boolean;
  disabled: boolean;
  onPress: () => void;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
}

export function PrimarySaveButton({
  saveButtonOverride,
  disabled,
  onPress,
  fullWidth,
  size = "sm",
}: PrimarySaveButtonProps) {
  return (
    <Button
      color={saveButtonOverride ? "danger" : "primary"}
      variant="shadow"
      size={size}
      disabled={disabled}
      fullWidth={fullWidth}
      startContent={
        saveButtonOverride ? (
          <ForwardIcon className="h-4 w-4" />
        ) : (
          <CheckCircleIcon className="h-4 w-4" />
        )
      }
      className="font-medium"
      onPress={onPress}
    >
      {saveButtonOverride ? "仍切换到下一条" : "保存并完成"}
      <Kbd
        keys={["command"]}
        className="text-[10px] ml-1 bg-white/20 border-white/30 text-white shadow-none hidden lg:inline-flex"
      >
        ↵
      </Kbd>
    </Button>
  );
}
