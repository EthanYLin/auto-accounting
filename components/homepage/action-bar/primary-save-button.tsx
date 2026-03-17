import { Button } from "@heroui/button";
import { CheckCircleIcon, ForwardIcon } from "@heroicons/react/24/outline";

interface PrimarySaveButtonProps {
  saveButtonOverride: boolean;
  disabled: boolean;
  onPress: () => void;
}

export function PrimarySaveButton({
  saveButtonOverride,
  disabled,
  onPress,
}: PrimarySaveButtonProps) {
  return (
    <Button
      color={saveButtonOverride ? "danger" : "primary"}
      variant="shadow"
      size="sm"
      disabled={disabled}
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
    </Button>
  );
}
