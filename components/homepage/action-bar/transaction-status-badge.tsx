"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

import { TransactionStatusConfig } from "@/constants/transaction-status";

interface TransactionStatusBadgeProps {
  status: TransactionStatusConfig | null;
}

export function TransactionStatusBadge({ status }: TransactionStatusBadgeProps) {
  const [labelVisible, setLabelVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (labelVisible) {
      timerRef.current = setTimeout(() => setLabelVisible(false), 1500);
    }
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [labelVisible]);

  useEffect(() => {
    setLabelVisible(false);
  }, [status?.name]);

  if (!status) return null;

  const toggle = () => setLabelVisible((v) => !v);
  const dismiss = () => setLabelVisible(false);

  return (
    <div className="relative flex items-center" onBlur={dismiss}>
      <div
        role="button"
        tabIndex={0}
        aria-label={status.name}
        className={`flex items-center gap-2 rounded-lg px-3 transition-colors ${status.bgColor} py-1.5 h-8 lg:h-auto cursor-pointer lg:cursor-default focus:outline-none`}
        onClick={toggle}
        onKeyDown={(e) => e.key === "Enter" && toggle()}
      >
        <div className="relative">
          <div className={`h-2 w-2 rounded-full ${status.dotColor} shadow-sm`} />
          <div className={`absolute inset-0 h-2 w-2 rounded-full ${status.dotColor} opacity-75`} />
        </div>
        <span className={`hidden lg:inline text-sm font-medium ${status.color}`}>
          {status.name}
        </span>
      </div>

      <motion.span
        initial={false}
        animate={labelVisible ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.85, y: 4 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className={`absolute right-0 top-full mt-1.5 pointer-events-none z-[9999] whitespace-nowrap rounded-md px-2 py-1 text-sm font-medium shadow-md lg:hidden ${status.bgColor} ${status.color}`}
      >
        {status.name}
      </motion.span>
    </div>
  );
}
