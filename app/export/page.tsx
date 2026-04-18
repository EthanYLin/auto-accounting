"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  NoSymbolIcon,
} from "@heroicons/react/24/outline";
import { Button, Select, SelectItem, Spinner } from "@heroui/react";
import { motion } from "framer-motion";

import { useAppData } from "@/components/context/app-data-context";
import { useTransactionStore } from "@/components/context/transaction-store-context";
import { mozeExporter } from "@/lib/exporters/moze-exporter";
import { exportTransactions } from "@/lib/transaction/transaction-export";

const EXPORTERS = [
  {
    key: "MOZE",
    exporter: mozeExporter,
  },
] as const;
type ExporterKey = (typeof EXPORTERS)[number]["key"];
const DEFAULT_EXPORTER_KEY: ExporterKey = EXPORTERS[0].key;
const COMPLETED_STATUSES = new Set(["已完成"]);
const PENDING_STATUSES = new Set(["待处理", "稍后处理", "经自动处理填写"]);
const CANCELLED_STATUSES = new Set(["取消", "经自动处理取消"]);

const revealTransition = {
  duration: 0.42,
  ease: [0.22, 1, 0.36, 1] as const,
};

type StatItemProps = {
  label: string;
  value: number;
  description: string;
  accentClassName: string;
  icon: React.ComponentType<React.ComponentProps<"svg">>;
};

function StatItem({ label, value, description, accentClassName, icon: Icon }: StatItemProps) {
  return (
    <motion.div
      className="group relative overflow-hidden px-1 py-1 transition-colors duration-200"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={revealTransition}
    >
      <div
        className={`pointer-events-none absolute inset-y-1 left-0 w-[2px] rounded-full bg-current opacity-70 ${accentClassName}`}
      />
      <div className="flex items-start justify-between gap-3 pl-2">
        <div className="space-y-1.5">
          <p className="text-xs font-medium tracking-wide text-default-500">{label}</p>
          <p className="text-[26px] font-semibold leading-none tracking-tight text-foreground">
            {value}
          </p>
          <p className="max-w-[20rem] text-xs leading-5 text-default-500">{description}</p>
        </div>
        <div
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/85 ring-1 ring-black/5 dark:bg-black/20 ${accentClassName}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </motion.div>
  );
}

export default function ExportPage() {
  const { isLoading: isAppLoading } = useAppData();
  const { transactions, isFetching, hasLoaded } = useTransactionStore();
  const [selectedFormat, setSelectedFormat] = useState<ExporterKey>(DEFAULT_EXPORTER_KEY);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => {
    return transactions.reduce(
      (acc, transaction) => {
        if (transaction.status && COMPLETED_STATUSES.has(transaction.status)) {
          acc.completed += 1;
        }
        if (transaction.status && PENDING_STATUSES.has(transaction.status)) {
          acc.pending += 1;
        }
        if (transaction.status && CANCELLED_STATUSES.has(transaction.status)) {
          acc.cancelled += 1;
        }
        return acc;
      },
      { completed: 0, pending: 0, cancelled: 0 },
    );
  }, [transactions]);
  const exportedTxGroups = useMemo(() => exportTransactions(transactions), [transactions]);
  const selectedExporter = useMemo(
    () => EXPORTERS.find((format) => format.key === selectedFormat) ?? EXPORTERS[0],
    [selectedFormat],
  );

  const isLoading = isAppLoading || (isFetching && !hasLoaded);

  async function handleExport(): Promise<void> {
    if (!selectedExporter || isLoading || isExporting) return;

    setIsExporting(true);
    setError(null);

    try {
      const result = await selectedExporter.exporter.generate(exportedTxGroups);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      const { artifact } = result;
      const url = URL.createObjectURL(artifact.content);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = artifact.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "导出失败");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-6">
      <motion.div
        className="flex flex-col gap-7"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={revealTransition}
      >
        <section className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">账单导出</h1>
          <p className="text-sm leading-6 text-default-500">选择导出格式，并确认交易数量。</p>
        </section>

        <section>
          {isLoading ? (
            <div className="flex min-h-40 items-center justify-center">
              <Spinner size="sm" />
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] md:items-start">
              <motion.section
                className="flex h-full flex-col justify-between space-y-4 border-y border-default-200/80 py-5"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...revealTransition, delay: 0.05 }}
              >
                <div className="flex h-full flex-col justify-between gap-6">
                  <StatItem
                    label="已完成的交易"
                    value={stats.completed}
                    description="状态为“已完成”的交易。"
                    accentClassName="text-emerald-500"
                    icon={CheckCircleIcon}
                  />
                  <StatItem
                    label="待处理的交易"
                    value={stats.pending}
                    description="包括“待处理”“稍后处理”“经自动处理填写”。"
                    accentClassName="text-amber-500"
                    icon={ClockIcon}
                  />
                  <StatItem
                    label="已取消的交易"
                    value={stats.cancelled}
                    description="包括“取消”“经自动处理取消”。"
                    accentClassName="text-default-500"
                    icon={NoSymbolIcon}
                  />
                </div>
              </motion.section>

              <motion.section
                className="flex h-full flex-col rounded-[28px] border border-default-200/70 bg-default-50/35 p-5"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...revealTransition, delay: 0.1 }}
              >
                <h2 className="text-sm font-semibold text-foreground mb-5">导出选项</h2>

                <Select
                  aria-label="请选择导出格式"
                  label="请选择导出格式"
                  labelPlacement="outside"
                  placeholder="请选择导出格式"
                  selectedKeys={[selectedFormat]}
                  size="sm"
                  variant="underlined"
                  onSelectionChange={(keys) => {
                    const value = Array.from(keys)[0];
                    if (value) setSelectedFormat(value as ExporterKey);
                  }}
                >
                  {EXPORTERS.map((format) => (
                    <SelectItem key={format.key}>{format.key}</SelectItem>
                  ))}
                </Select>

                <div className="mt-auto space-y-3 border-t border-default-200/80 pt-4">
                  <p className="text-sm leading-6 text-default-500">
                    只会导出{" "}
                    <span className="mx-1 text-[28px] font-semibold tracking-tight text-foreground">
                      {stats.completed}
                    </span>
                    条已完成的交易
                  </p>
                  <Button
                    className="min-w-32"
                    fullWidth
                    color="primary"
                    radius="full"
                    size="md"
                    isDisabled={isLoading || stats.completed === 0}
                    isLoading={isExporting}
                    startContent={!isExporting && <ArrowDownTrayIcon className="h-4 w-4" />}
                    onPress={handleExport}
                  >
                    导出
                  </Button>
                </div>
              </motion.section>
            </div>
          )}
        </section>

        {error ? (
          <motion.section
            className="rounded-2xl border border-danger-200/80 bg-danger-50/80 px-4 py-3 dark:border-danger-400/25 dark:bg-danger-950/35"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={revealTransition}
            role="alert"
          >
            <div className="flex gap-3">
              <div className="mt-0.5 shrink-0 text-danger">
                <ExclamationTriangleIcon aria-hidden className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-semibold text-danger-700 dark:text-danger-400">
                  导出未成功
                </p>
                <div className="max-h-64 overflow-y-auto rounded-lg bg-danger-100/50 px-3 py-2 dark:bg-danger-950/50">
                  <p className="whitespace-pre-wrap break-words text-sm leading-6 text-danger-600 dark:text-danger-300">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          </motion.section>
        ) : null}
      </motion.div>
    </div>
  );
}
