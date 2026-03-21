"use client";

import { Button, Input } from "@heroui/react";

export function SplitNamePanel({
  nameSuggestions,
  name,
  onChangeName,
  onPickSuggestion,
}: {
  nameSuggestions: string[];
  name: string;
  onChangeName: (next: string) => void;
  onPickSuggestion: (tag: string) => void;
}) {
  return (
    <div className="flex h-full flex-col rounded-medium border border-divider p-4">
      <div className="mb-3 flex h-8 items-center gap-2">
        <span className="shrink-0 text-sm font-medium text-default-700">名称</span>
        {nameSuggestions.length > 0 ? (
          <div className="ml-2 min-w-0 flex-1 overflow-x-auto">
            <div className="flex w-max items-center gap-2">
              {nameSuggestions.map((tag) => (
                <Button
                  key={tag}
                  size="sm"
                  variant="flat"
                  color="default"
                  className="max-w-[220px] min-w-0 flex-shrink-0"
                  onPress={() => onPickSuggestion(tag)}
                >
                  <span className="truncate">{tag}</span>
                </Button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <Input
          aria-label="名称"
          placeholder="输入名称…"
          value={name}
          onValueChange={onChangeName}
          size="md"
        />
      </div>
    </div>
  );
}
