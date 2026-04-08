"use client";

/**
 * 轻量级命令总线，基于 DOM CustomEvent。
 *
 * - dispatchCommand("save")        — 发送命令
 * - useCommandListener("save", fn) — 组件按需监听，handler 通过 ref 保持最新，无需 useCallback
 *
 * 发送方与接收方完全解耦：热键、按钮、下拉菜单都可以 dispatch，
 * 而各组件只监听自己关心的命令。
 */

import { useEffect, useRef } from "react";

const PREFIX = "txcmd:";

/** 发送一条命令，可附带任意 detail 数据 */
export function dispatchCommand(name: string, detail?: unknown) {
  window.dispatchEvent(new CustomEvent(`${PREFIX}${name}`, { detail }));
}

/** 在组件中监听命令。handler 始终调用最新闭包，卸载时自动移除。 */
export function useCommandListener(name: string, handler: (detail?: any) => void) {
  const ref = useRef(handler);
  ref.current = handler;

  useEffect(() => {
    const listener = (event: Event) => ref.current((event as CustomEvent).detail);
    window.addEventListener(`${PREFIX}${name}`, listener);
    return () => window.removeEventListener(`${PREFIX}${name}`, listener);
  }, [name]);
}
