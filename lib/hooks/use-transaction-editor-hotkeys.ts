"use client";

/**
 * 交易编辑器的全局快捷键。
 *
 * 工作方式：在 window 上注册单个 keydown 监听器，按下按键时遍历 BINDINGS 配置表，
 * 匹配成功后通过 dispatchCommand 发出命令事件，由各组件自行监听处理。
 *
 * 作用域（scope）：
 *   - "non-input"  仅在焦点不在输入框/可编辑区域且无弹窗遮挡时触发
 *   - "overlay"    允许在输入框内触发，但仍被弹窗阻止（用于 ⌘S、⌘K 等全局快捷键）
 */

import { useEffect } from "react";

import { dispatchCommand } from "@/lib/commands";

/** 匹配所有可编辑元素的 CSS 选择器，用于判断焦点是否在输入区域 */
const EDITABLE_SELECTOR = [
  "input",
  "textarea",
  "select",
  '[contenteditable="true"]',
  '[contenteditable="plaintext-only"]',
  '[role="textbox"]',
  '[role="combobox"]',
  '[role="listbox"]',
  '[role="spinbutton"]',
  '[role="option"]',
  '[role="menu"]',
  '[role="menuitem"]',
  '[aria-haspopup="listbox"]',
].join(",");

/** 匹配弹窗/模态框的 CSS 选择器 */
const OVERLAY_SELECTOR = ['[role="dialog"]', "[aria-modal='true']"].join(",");

type Scope = "non-input" | "overlay";

interface HotkeyBinding {
  keys: string; // 按键组合，逗号分隔表示"或"，加号分隔修饰键，如 "meta+s,ctrl+s"
  command: string; // 要发送的命令名
  scope: Scope;
  detail?: unknown; // 附带给命令监听器的数据
}

// ==================== 全局开关 ====================
const HOTKEYS_ENABLED = true;

// ==================== 快捷键配置表 ====================

const BINDINGS: HotkeyBinding[] = [
  // 导航
  { keys: "arrowleft", command: "go-previous", scope: "non-input" },
  { keys: "arrowright", command: "go-next", scope: "non-input" },
  { keys: "l", command: "locate-current", scope: "non-input" },
  { keys: "i", command: "edit-index", scope: "non-input" },

  // 界面切换
  { keys: "meta+b,ctrl+b", command: "toggle-sidebar", scope: "overlay" },
  { keys: "q", command: "toggle-import-info", scope: "non-input" },
  { keys: "a", command: "open-attach-selection", scope: "non-input" },
  { keys: "1", command: "select-tab", scope: "non-input", detail: "tx-info" },
  { keys: "2", command: "select-tab", scope: "non-input", detail: "parent" },
  { keys: "3", command: "select-tab", scope: "non-input", detail: "split" },

  // 搜索 & 新建（允许在输入框内触发）
  { keys: "meta+k,ctrl+k", command: "focus-search", scope: "overlay" },
  { keys: "alt+n", command: "create", scope: "overlay" },

  // 保存
  { keys: "meta+s,ctrl+s", command: "save", scope: "overlay" },
  { keys: "meta+enter,ctrl+enter", command: "save-and-complete", scope: "overlay" },
  { keys: "meta+e,ctrl+e", command: "save-cancel", scope: "overlay" },
  { keys: "shift+meta+s,shift+ctrl+s", command: "save-later", scope: "overlay" },

  // 危险操作
  { keys: "alt+d", command: "discard-current", scope: "overlay" },
  { keys: "alt+backspace", command: "delete-current", scope: "non-input" },

  // 分账
  { keys: "o", command: "split-action", scope: "non-input", detail: { action: "open" } },
  { keys: "m", command: "split-action", scope: "non-input", detail: { action: "merge" } },
  { keys: "-", command: "split-action", scope: "non-input", detail: { action: "social-2" } },
  { keys: "=", command: "split-action", scope: "non-input", detail: { action: "social-3" } },
  { keys: "t", command: "split-action", scope: "non-input", detail: { action: "transfer" } },
  { keys: "c", command: "split-action", scope: "non-input", detail: { action: "recharge" } },
];

// ==================== 内部工具函数 ====================

/**
 * 判断按键事件是否匹配快捷键描述。
 * 例如 "shift+meta+s,shift+ctrl+s" 表示 ⇧⌘S 或 ⇧Ctrl+S 均匹配。
 */
function matchesKey(event: KeyboardEvent, spec: string): boolean {
  return spec.split(",").some((combo) => {
    const parts = combo.trim().toLowerCase().split("+");
    const key = parts.pop()!;
    const mods = new Set(parts);
    if (mods.has("meta") !== event.metaKey) return false;
    if (mods.has("ctrl") !== event.ctrlKey) return false;
    if (mods.has("alt") !== event.altKey) return false;
    if (mods.has("shift") !== event.shiftKey) return false;
    return event.key.toLowerCase() === key;
  });
}

/** 根据作用域判断当前焦点环境下是否允许触发快捷键 */
function canRun(scope: Scope, event: KeyboardEvent): boolean {
  const target =
    event.target instanceof HTMLElement
      ? event.target
      : document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

  // 弹窗/模态框打开时，所有快捷键均不触发
  if (target?.closest(OVERLAY_SELECTOR)) return false;
  // non-input 模式下，焦点在可编辑区域时不触发（避免抢占正常输入）
  if (scope === "non-input") {
    return !(target?.isContentEditable || target?.closest(EDITABLE_SELECTOR));
  }
  return true;
}

// ==================== Hook ====================

/** 挂载交易编辑器页面的全局快捷键，页面卸载时自动移除。 */
export function useTransactionEditorHotkeys() {
  useEffect(() => {
    if (!HOTKEYS_ENABLED) return;
    const handler = (event: KeyboardEvent) => {
      for (const binding of BINDINGS) {
        if (!matchesKey(event, binding.keys)) continue;
        if (!canRun(binding.scope, event)) return;
        event.preventDefault();
        dispatchCommand(binding.command, binding.detail);
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
