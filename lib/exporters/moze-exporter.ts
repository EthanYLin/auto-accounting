import type { TransactionWithRelations } from "@/types";
import type { ExportArtifact, TransactionExporter } from "@/lib/exporters/types";

import { calculateAmount } from "@/lib/transaction/transaction-display";
import { parseTxTime } from "@/lib/transaction/transaction-datetime";

const MOZE_HEADERS = [
  "账户",
  "币种",
  "记录类型",
  "主类别",
  "子类别",
  "金额",
  "手续费",
  "折扣",
  "名称",
  "商家",
  "日期",
  "时间",
  "项目",
  "描述",
  "标签",
  "对象",
] as const;

function escapeCsvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatDateParts(datetime: string | null): { date: string; time: string } {
  const dt = parseTxTime(datetime);
  if (!dt) return { date: "", time: "" };

  return {
    date: dt.toFormat("yyyy/M/d"),
    time: dt.toFormat("HH:mm"),
  };
}

function buildMozeRow(tx: TransactionWithRelations): string[] {
  const { date, time } = formatDateParts(tx.datetime);

  return [
    tx.account.name ?? "",
    "",
    tx.transaction_type ?? "",
    tx.main_category?.label ?? "",
    tx.sub_category?.label ?? "",
    String(calculateAmount(tx)),
    "",
    "",
    tx.name?.trim() ?? "",
    tx.merchant?.trim() ?? "",
    date,
    time,
    tx.budget_type?.name ?? "",
    "",
    "",
    "",
  ];
}

function toCsvLine(values: ReadonlyArray<string>): string {
  return values.map(escapeCsvCell).join(",");
}

export const mozeExporter: TransactionExporter = {
  description(): string {
    return "导出为 MOZE 可导入 CSV";
  },

  async generate(groups): Promise<ExportArtifact> {
    const now = new Date();
    const filename = `MOZE账单导出-${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}.csv`;
    const transactions = groups.flatMap((group) => group);
    const lines = [
      toCsvLine(MOZE_HEADERS),
      ...transactions.map((tx) => toCsvLine(buildMozeRow(tx))),
    ];
    const content = new Blob([`\uFEFF${lines.join("\r\n")}`], {
      type: "text/csv;charset=utf-8",
    });

    return {
      filename,
      mimeType: "text/csv;charset=utf-8",
      extension: "csv",
      content,
    };
  },
};
