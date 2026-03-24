"use client";

import type { FudanCampusCardRecord } from "@/lib/fudan-import/types";
import type { Json, NewTransactionData } from "@/types";
import type { RangeValue } from "@react-types/shared";

import React, { useCallback, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  Chip,
  DateRangePicker,
  Divider,
  Input,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  addToast,
} from "@heroui/react";
import { CheckCircleIcon, EyeIcon, EyeSlashIcon, MagnifyingGlassIcon, TrashIcon } from "@heroicons/react/24/outline";
import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date";

import { queryFudanRecords } from "@/app/actions/fudan";
import { useAppData } from "@/components/context/app-data-context";
import { useTransactionImport } from "@/lib/hooks/use-transaction-import";

/** 将 ISO 日期时间展示为 YYYY-MM-DD HH:mm */
function formatDateTimeDisplay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${h}:${min}`;
}

function formatAmountCny(amount: number): string {
  if (!Number.isFinite(amount)) return "—";
  return `￥${amount.toFixed(2)}`;
}

function buildNewTransactionData(
  record: FudanCampusCardRecord,
  appData: ReturnType<typeof useAppData>,
): NewTransactionData {
  const { accounts, subCategories, mainCategories, budgetTypeMap, mainCategoryMap } = appData;

  const account = accounts.find((a) => a.name === "复旦校园卡")!;

  const matchedSub = record.category
    ? subCategories.find((s) => s.label === record.category)
    : undefined;

  const matchedMain = matchedSub
    ? mainCategoryMap.get(matchedSub.main_category_id)
    : undefined;

  const matchedBudget = matchedSub?.budget_type_id != null
    ? budgetTypeMap.get(matchedSub.budget_type_id)
    : undefined;

  const { id, ...rawWithoutId } = record;

  return {
    account,
    transaction_type: "支出",
    amount: Math.abs(record.amount),
    original_amount: Math.abs(record.amount),
    datetime: record.datetime,
    name: record.category ?? null,
    title: `${record.merchant ?? "未知商家"} (${record.detail ?? "未知交易"})`,
    merchant: record.merchant ?? null,
    remark: null,
    status: "经自动处理填写",
    source: "复旦校园卡导入",
    raw_info: rawWithoutId as Json,
    main_category: matchedMain,
    sub_category: matchedSub,
    budget_type: matchedBudget,
  };
}

export function FudanImport() {
  const tz = getLocalTimeZone();
  const defaultEnd = today(tz);
  const defaultStart = defaultEnd.set({ day: 1 });

  const appData = useAppData();
  const { createTransactions } = useTransactionImport();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [range, setRange] = useState<RangeValue<CalendarDate> | null>({
    start: defaultStart,
    end: defaultEnd,
  });
  const [isQuerying, setIsQuerying] = useState(false);
  const [importStatus, setImportStatus] = useState<"idle" | "importing" | "imported">("idle");
  const [rows, setRows] = useState<FudanCampusCardRecord[]>([]);

  const removeRow = useCallback((id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const handleQuery = useCallback(async () => {
    if (!username.trim() || !password.trim()) {
      addToast({ title: "请填写账号和密码", color: "danger" });
      return;
    }
    if (!range?.start || !range?.end) {
      addToast({ title: "请选择完整的日期范围", color: "danger" });
      return;
    }

    setIsQuerying(true);
    setRows([]);
    setImportStatus("idle");

    try {
      const startDate = `${range.start.year}-${String(range.start.month).padStart(2, "0")}-${String(range.start.day).padStart(2, "0")}`;
      const endDate = `${range.end.year}-${String(range.end.month).padStart(2, "0")}-${String(range.end.day).padStart(2, "0")}`;

      const result = await queryFudanRecords(username, password, startDate, endDate);
      if (result.success) {
        setRows(result.records);
        if (result.records.length === 0) {
          addToast({ title: "该时间段内无消费记录", color: "primary" });
        }
      } else {
        addToast({ title: "查询失败", description: result.error, color: "danger" });
      }
    } catch (e) {
      addToast({
        title: "查询失败",
        description: e instanceof Error ? e.message : "请稍后重试",
        color: "danger",
      });
    } finally {
      setIsQuerying(false);
    }
  }, [username, password, range]);

  const handleQuerySubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      void handleQuery();
    },
    [handleQuery],
  );

  const handleConfirmImport = useCallback(async () => {
    if (rows.length === 0) {
      addToast({ title: "没有可导入的记录", color: "warning" });
      return;
    }

    const fudanAccount = appData.accounts.find((a) => a.name === "复旦校园卡");
    if (!fudanAccount) {
      addToast({ title: "未找到「复旦校园卡」账户，请先在账户管理中创建", color: "danger" });
      return;
    }

    setImportStatus("importing");
    try {
      const newTransactions: NewTransactionData[] = rows.map((r) =>
        buildNewTransactionData(r, appData),
      );
      const result = await createTransactions(newTransactions);
      if (result.success) {
        setImportStatus("imported");
        addToast({
          title: "导入成功",
          description: `已导入 ${rows.length} 条记录`,
          color: "success",
        });
      } else {
        setImportStatus("idle");
        addToast({ title: "导入失败", description: result.error, color: "danger" });
      }
    } catch (e) {
      setImportStatus("idle");
      throw e;
    }
  }, [rows, appData, createTransactions]);

  return (
    <div className="space-y-6 w-full">
      <Card className="border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-900">
        <CardBody className="gap-4 p-5">
          <div>
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">查询条件</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              使用复旦统一身份认证账号登录，查询指定日期范围内的校园卡消费记录。
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              系统不会存储您的账号及密码。
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleQuerySubmit}>
            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                className="w-auto"
                label="统一身份认证账号"
                labelPlacement="outside"
                placeholder="请输入学号 / 工号"
                value={username}
                variant="bordered"
                onValueChange={setUsername}
              />
              <Input
                className="w-auto"
                endContent={
                  <button
                    className="focus:outline-none text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword
                      ? <EyeSlashIcon className="w-4 h-4" />
                      : <EyeIcon className="w-4 h-4" />}
                  </button>
                }
                label="密码"
                labelPlacement="outside"
                placeholder="请输入密码"
                type={showPassword ? "text" : "password"}
                value={password}
                variant="bordered"
                onValueChange={setPassword}
              />
            </div>

            <Divider className="bg-gray-200 dark:bg-gray-700" />

            <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-start sm:items-end">
              <DateRangePicker
                className="w-auto"
                granularity="day"
                label="查询日期范围"
                labelPlacement="outside"
                value={range}
                variant="bordered"
                onChange={setRange}
              />
              <Button
                color="primary"
                isLoading={isQuerying}
                startContent={!isQuerying ? <MagnifyingGlassIcon className="w-4 h-4" /> : undefined}
                type="submit"
              >
                查询
              </Button>
            </div>
          </form>

        </CardBody>
      </Card>

      {rows.length > 0 && (
        <>
          <div className="max-w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="max-h-[400px] overflow-auto">
              <Table
                isCompact
                aria-label="复旦校园卡消费记录"
                classNames={{
                  base: "min-w-full gap-0 rounded-none p-0 shadow-none",
                  wrapper: "h-auto max-h-none rounded-none p-0 shadow-none",
                  table: "min-w-full rounded-none border-separate border-spacing-0",
                  thead:
                    "[&_tr:first-child_th:first-child]:rounded-tl-lg [&_tr:first-child_th:last-child]:rounded-tr-lg",
                }}
              >
              <TableHeader>
                <TableColumn className="min-w-[160px]">交易时间</TableColumn>
                <TableColumn className="min-w-[120px]">交易细节</TableColumn>
                <TableColumn className="min-w-[120px]">商家</TableColumn>
                <TableColumn align="end" className="min-w-[88px]">
                  金额
                </TableColumn>
                <TableColumn className="min-w-[96px]">类别</TableColumn>
                <TableColumn align="end" className="w-24">
                  操作
                </TableColumn>
              </TableHeader>
              <TableBody items={rows}>
                {(row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <span className="font-mono text-[13px]">
                        {formatDateTimeDisplay(row.datetime)}
                      </span>
                    </TableCell>
                    <TableCell>{row.detail ?? "—"}</TableCell>
                    <TableCell>{row.merchant ?? "—"}</TableCell>
                    <TableCell>
                      <span className="tabular-nums">{formatAmountCny(row.amount)}</span>
                    </TableCell>
                    <TableCell>{row.category ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button
                          isIconOnly
                          aria-label="删除此行"
                          color="danger"
                          size="sm"
                          variant="light"
                          onPress={() => removeRow(row.id)}
                        >
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            {importStatus === "imported" ? (
              <Chip
                color="primary"
                startContent={<CheckCircleIcon className="w-4 h-4" />}
                variant="light"
              >
                导入完成
              </Chip>
            ) : (
              <Button
                color="primary"
                isLoading={importStatus === "importing"}
                variant="solid"
                onPress={() => void handleConfirmImport()}
              >
                确认导入
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
