import type { TransactionWithRelations } from "@/types";
import type { ExportResult, TransactionExporter } from "@/lib/exporters/types";

import {
  amountEquals,
  calculateAmount,
  formatAmountParts,
} from "@/lib/transaction/transaction-display";
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

function txRef(tx: TransactionWithRelations, indexInGroup: number, groupLen: number): string {
  if (groupLen <= 1) return `#${tx.id}`;
  return `#${tx.id} · 分账第${indexInGroup + 1}条`;
}

function validateRequiredFields(group: ReadonlyArray<TransactionWithRelations>): string[] {
  const hints: string[] = [];
  const n = group.length;
  group.forEach((tx, i) => {
    const ref = txRef(tx, i, n);
    if (!tx.account?.name?.trim()) hints.push(`${ref} 账户不能为空`);
    if (!tx.transaction_type) hints.push(`${ref} 记录类型不能为空`);
    if (!tx.main_category?.label?.trim()) hints.push(`${ref} 主类别不能为空`);
    if (!tx.sub_category?.label?.trim()) hints.push(`${ref} 子类别不能为空`);
    if (!Number.isFinite(tx.amount)) hints.push(`${ref} 金额无效`);
    if (!tx.datetime?.trim()) {
      hints.push(`${ref} 日期时间不能为空`);
    } else if (!parseTxTime(tx.datetime)) {
      hints.push(`${ref} 日期时间不合法`);
    }
  });
  return hints;
}

function validateTransferPairs(group: ReadonlyArray<TransactionWithRelations>): string[] {
  const hints: string[] = [];
  const n = group.length;
  if (!group.some((s) => s.transaction_type === "转入" || s.transaction_type === "转出")) {
    return [];
  }

  let i = 0;
  while (i < n) {
    const type1 = group[i].transaction_type;
    if (type1 !== "转入" && type1 !== "转出") {
      i += 1;
      continue;
    }
    if (i + 1 >= n) {
      hints.push(
        `${txRef(group[i], i, n)} 为「${type1}」，缺少「${type1 === "转入" ? "转出" : "转入"}」记录。`,
      );
      i += 1;
      continue;
    }
    const type2 = group[i + 1].transaction_type;
    if ((type2 !== "转入" && type2 !== "转出") || type1 === type2) {
      hints.push(
        `转入与转出记录必须相邻。${txRef(group[i], i, n)} 为「${type1}」，${txRef(group[i + 1], i + 1, n)} 为「${type2}」。`,
      );
      i += 1;
      continue;
    }
    const cur = group[i];
    const next = group[i + 1];
    if (!amountEquals(cur.amount, next.amount)) {
      hints.push(
        `转入与转出金额必须相同：${txRef(cur, i, n)} ￥${formatAmountParts(cur.amount).digits}，${txRef(next, i + 1, n)} ￥${formatAmountParts(next.amount).digits}`,
      );
    }
    if (cur.account?.id === next.account?.id) {
      hints.push(
        `转入与转出账户不能相同：${txRef(cur, i, n)} 与 ${txRef(next, i + 1, n)} 均为 ${cur.account?.name ?? ""}`,
      );
    }
    const t1 = parseTxTime(cur.datetime);
    const t2 = parseTxTime(next.datetime);
    if (!t1 || !t2 || !t1.equals(t2)) {
      hints.push(
        `${txRef(cur, i, n)} 与 ${txRef(next, i + 1, n)} 的日期与时间须一致。其中一个是 ${t1?.toFormat("yyyy/MM/dd HH:mm")}，另一个是 ${t2?.toFormat("yyyy/MM/dd HH:mm")}`,
      );
    }
    i += 2;
  }

  return hints;
}

function validateGroup(group: ReadonlyArray<TransactionWithRelations>): string[] {
  return [...validateRequiredFields(group), ...validateTransferPairs(group)];
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

  async generate(groups): Promise<ExportResult> {
    try {
      const issues: string[] = [];
      for (const group of groups) {
        issues.push(...validateGroup(group));
      }
      if (issues.length > 0) {
        return { ok: false, message: issues.join("\n") };
      }

      const now = new Date();
      const filename = `MOZE账单导出-${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}.csv`;

      const lines: string[] = [toCsvLine(MOZE_HEADERS)];
      for (const group of groups) {
        for (const tx of group) {
          lines.push(toCsvLine(buildMozeRow(tx)));
        }
      }

      const content = new Blob([`\uFEFF${lines.join("\r\n")}`], {
        type: "text/csv;charset=utf-8",
      });

      return {
        ok: true,
        artifact: {
          filename,
          mimeType: "text/csv;charset=utf-8",
          extension: "csv",
          content,
        },
      };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : "导出失败",
      };
    }
  },
};
