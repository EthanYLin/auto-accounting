"use client";

import { Listbox, ListboxItem } from "@heroui/listbox";

// 图标组件
const IconComponent = ({ icon, backColor, foreColor }: { icon: string; backColor?: string; foreColor?: string }) => (
  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs mr-2 ${backColor || ''} ${foreColor || ''}`}>
    {icon}
  </span>
);

// 通用的选项接口
export interface GenericOption {
  key: string;
  label: string;
  icon?: string;
  backColor?: string;
  foreColor?: string;
  textValue?: string;
}

// 通用 Listbox 组件的 props
export interface GenericListboxProps<T = string> {
  title: string;
  options: GenericOption[];
  selectedKey?: T;
  onSelectionChange: (key: T) => void;
  disabled?: boolean;
  emptyContent?: string;
  className?: string;
  containerClassName?: string;
  height?: string;
  ariaLabel?: string;
}

export function GenericListbox<T = string>({
  title,
  options,
  selectedKey,
  onSelectionChange,
  disabled = false,
  emptyContent = "无可用选项",
  className = "w-48",
  containerClassName = "",
  height = "h-60",
  ariaLabel
}: GenericListboxProps<T>) {
  return (
    <div className={className}>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{title}</p>
      <div className={`border border-gray-200 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800 shadow-sm ${disabled ? "opacity-50" : ""} ${containerClassName}`}>
        <Listbox
          aria-label={ariaLabel || title}
          variant="flat"
          selectionMode="single"
          selectedKeys={selectedKey ? [selectedKey as string] : []}
          onSelectionChange={(keys) => {
            if (disabled) return;
            const key = Array.from(keys)[0] as T;
            onSelectionChange(key);
          }}
          className={`${height} overflow-y-auto`}
          emptyContent={emptyContent}
        >
          {options.map((option) => {
            const isSelected = selectedKey === option.key;
            return (
              <ListboxItem 
                key={option.key}
                textValue={option.textValue || option.label}
                className={isSelected && option.backColor ? option.backColor : ""}
                color={isSelected && option.backColor ? (option.backColor as any) : "default"}
                startContent={
                  option.icon ? (
                    <IconComponent 
                      icon={option.icon} 
                      backColor={option.backColor}
                      foreColor={option.foreColor}
                    />
                  ) : null
                }
              >
                <span className={`font-medium ${option.foreColor || ''}`}>
                  {option.label}
                </span>
              </ListboxItem>
            );
          })}
        </Listbox>
      </div>
    </div>
  );
}
