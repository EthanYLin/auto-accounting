"use client";

import type { SplitHint } from "./action-bar-config";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ExclamationTriangleIcon, InformationCircleIcon } from "@heroicons/react/24/outline";

interface SplitHintBadgeProps {
  splitHint?: SplitHint;
}

export function SplitHintBadge({ splitHint }: SplitHintBadgeProps) {
  const [labelVisible, setLabelVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (labelVisible) {
      timerRef.current = setTimeout(() => setLabelVisible(false), 2000);
    }
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [labelVisible]);

  useEffect(() => {
    setLabelVisible(false);
  }, [splitHint?.message]);

  if (!splitHint) return null;

  const isWarn = splitHint.type === "warn";
  const colorClasses = isWarn
    ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
    : "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";

  const toggle = () => setLabelVisible((v) => !v);
  const dismiss = () => setLabelVisible(false);

  return (
    <div className="relative flex items-center" onBlur={dismiss}>
      <div
        role="button"
        tabIndex={0}
        aria-label={splitHint.message}
        className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium cursor-pointer sm:w-auto sm:gap-1.5 sm:px-3 sm:cursor-default focus:outline-none ${colorClasses}`}
        onClick={toggle}
        onKeyDown={(e) => e.key === "Enter" && toggle()}
      >
        {isWarn ? (
          <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
        ) : (
          <InformationCircleIcon className="h-4 w-4 flex-shrink-0" />
        )}
        <span className="hidden sm:inline">{splitHint.message}</span>
      </div>

      <motion.span
        initial={false}
        animate={labelVisible ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.85, y: 4 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className={`absolute right-0 top-full mt-1.5 pointer-events-none z-[9999] whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium shadow-md sm:hidden ${colorClasses}`}
      >
        {splitHint.message}
      </motion.span>
    </div>
  );
}
