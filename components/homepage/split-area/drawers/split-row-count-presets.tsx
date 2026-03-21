"use client";

import type { InputProps } from "@heroui/react";

import { useEffect, useRef } from "react";
import { Button, Input } from "@heroui/react";

type PresetKey = "2" | "3" | "4" | "custom";

export function SplitRowCountPresets({
  preset,
  customCountStr,
  onPresetChange,
  onCustomCountStrChange,
  onCustomCountBlur,
}: {
  preset: PresetKey;
  customCountStr: string;
  onPresetChange: (next: PresetKey) => void;
  onCustomCountStrChange: (next: string) => void;
  onCustomCountBlur: (raw: string) => void;
}) {
  const customCountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (preset !== "custom") return;
    // 下一帧聚焦，确保切换显示输入后 DOM 已稳定。
    const rafId = requestAnimationFrame(() => {
      customCountInputRef.current?.focus();
      customCountInputRef.current?.select();
    });
    return () => cancelAnimationFrame(rafId);
  }, [preset]);

  return (
    <div className="flex h-full flex-col rounded-medium border border-divider p-4">
      <div className="mb-3 flex h-8 items-center">
        <span className="text-sm font-medium text-default-700">分账</span>
      </div>
      <div className="grid flex-1 grid-cols-4 gap-1.5">
        {(["2", "3", "4"] as const).map((key) => {
          const isSelected = preset === key;
          return (
            <Button
              key={key}
              fullWidth
              radius="md"
              size="md"
              variant={isSelected ? "solid" : "flat"}
              color={isSelected ? "primary" : "default"}
              className="min-w-0 font-medium"
              onPress={() => onPresetChange(key)}
            >
              {key}
            </Button>
          );
        })}

        <div className="min-w-0">
          {preset === "custom" ? (
            <Input
              ref={customCountInputRef as InputProps["ref"]}
              aria-label="自定义分账笔数"
              size="md"
              type="number"
              min={2}
              step={1}
              color="primary"
              value={customCountStr}
              classNames={{ input: "text-center font-medium" }}
              onValueChange={onCustomCountStrChange}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                }
              }}
              onBlur={() => {
                onCustomCountBlur(customCountStr);
              }}
            />
          ) : (
            <Button
              fullWidth
              radius="md"
              size="md"
              variant="flat"
              color="default"
              className="min-w-0 font-medium"
              onPress={() => onPresetChange("custom")}
            >
              自定义
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
