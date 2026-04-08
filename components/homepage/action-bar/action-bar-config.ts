"use client";

import {
  ArchiveBoxIcon,
  ArrowUturnLeftIcon,
  BookmarkIcon,
  CheckIcon,
  ClockIcon,
  CloudArrowUpIcon,
  ForwardIcon,
  MapPinIcon,
  PlusIcon,
  TrashIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

export const QUICK_ACTION_ITEMS = [
  { key: "auto-switch", label: "保存后自动切换", section: 1, icon: CheckIcon },
  { key: "save", label: "保存交易", section: 1, icon: BookmarkIcon },
  { key: "save-cancel", label: "保存并设为取消", section: 1, icon: XCircleIcon },
  { key: "save-later", label: "保存并稍后处理", section: 1, icon: ClockIcon },
  {
    key: "cloud-upload",
    label: "保存所有未提交更改($dirtyCount)",
    section: 1,
    icon: CloudArrowUpIcon,
  },
  { key: "new", label: "新建交易", section: 2, icon: PlusIcon },
  { key: "next-pending", label: "跳转到下一条待处理的交易", section: 2, icon: ForwardIcon },
  { key: "locate-current", label: "定位到当前交易", section: 2, icon: MapPinIcon },
  { key: "discard-current", label: "丢弃当前更改", section: 3, icon: ArrowUturnLeftIcon },
  {
    key: "discard-all",
    label: "丢弃所有未提交更改($dirtyCount)",
    section: 3,
    icon: ArchiveBoxIcon,
  },
  { key: "delete", label: "删除交易", section: 3, icon: TrashIcon },
] as const;

export type QuickActionKey = (typeof QUICK_ACTION_ITEMS)[number]["key"];
export type QuickActionIcon = (typeof QUICK_ACTION_ITEMS)[number]["icon"];
export type QuickActionExecutor = (key: QuickActionKey) => void;

export interface DangerConfirm {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

export type SplitHint = { type: "info" | "warn"; message: string } | null;
