/**
 * 复旦校园卡消费记录查询模块（仅限服务端使用）
 *
 * 依赖 node-html-parser 解析 HTML，不可在客户端导入。
 */
import type { FudanCampusCardRecord } from "./types";
import type { FetchSession } from "./FudanCAS";

import { DateTime } from "luxon";
import { parse as parseHtml } from "node-html-parser";

import { casLogin } from "./FudanCAS";

import {
  TRANSACTION_DATETIME_FORMAT,
  TRANSACTION_TIME_ZONE,
} from "@/lib/transaction/transaction-datetime";

const SERVICE_URL = "https://ecard.fudan.edu.cn/epay/consume/query";

/**
 * 根据交易小时数判断类别。
 */
function hourToCategory(hour: number): string {
  if (hour <= 14) return "午餐";
  return hour <= 21 ? "晚餐" : "夜宵";
}

/**
 * 将 "2026.03.10" 与 "08:30" 拼合为 ISO 8601 本地时间字符串。
 *
 * @param datePart  形如 "2026.03.10" 的日期字符串
 * @param timePart  形如 "08:30" 的时间字符串
 */
function toIsoDatetime(datePart: string, timePart: string): string | null {
  const dt = DateTime.fromFormat(`${datePart} ${timePart}`, "yyyy.MM.dd HH:mm", {
    zone: TRANSACTION_TIME_ZONE,
  });
  return dt.isValid ? dt.toFormat(TRANSACTION_DATETIME_FORMAT) : null;
}

/**
 * 解析消费记录表格中的一行，返回结构化记录；字段不完整时返回 null。
 *
 * 表格列顺序：
 *   [0] 交易日期与时间  [1] 交易细节  [2] 商家  [3] 金额  [4..] 其他列
 *   或者
 *   [0] 交易日期  [1] 交易时间  [2] 交易细节  [3] 商家  [4] 金额  [5..] 其他列
 */
function parseTransactionRow(cells: string[], rowIndex: number): FudanCampusCardRecord | null {
  if (cells.length < 4) return null;

  let datePart: string;
  let timePart: string;
  let detail: string;
  let merchant: string;
  let amountRaw: string;

  // 尝试判断第一格是否同时含日期与时间（格式 "YYYY.MM.DDHH:MM"）
  const combined = cells[0].replace(/\s+/g, "");
  const combinedMatch = combined.match(/^(\d{4}\.\d{2}\.\d{2})(\d{2}:\d{2})$/);

  if (combinedMatch) {
    // 情况 A：日期与时间合并
    datePart = combinedMatch[1];
    timePart = combinedMatch[2];
    detail = cells[1];
    merchant = cells[2];
    amountRaw = cells[3];
  } else {
    // 情况 B：日期与时间分列
    if (cells.length < 5) return null;
    datePart = cells[0].trim();
    timePart = cells[1].trim();
    detail = cells[2];
    merchant = cells[3];
    amountRaw = cells[4];
  }

  const isoDatetime = toIsoDatetime(datePart, timePart);
  if (!isoDatetime) return null;

  const amountNum = parseFloat(amountRaw.replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(amountNum)) return null;

  // 充值记录不导入
  if (detail?.includes("充值")) return null;
  const amount = -Math.abs(amountNum);
  const hour = parseInt(timePart.split(":")[0], 10);

  return {
    datetime: isoDatetime,
    detail: detail || undefined,
    merchant: merchant || undefined,
    amount,
    category: hourToCategory(hour),
    id: `fudan-${rowIndex}`,
  };
}

// ─────────────────────────────────────────────
// 内部 HTTP 请求函数
// ─────────────────────────────────────────────

/** 从校园卡服务页面提取 CSRF Token */
async function getCsrf(session: FetchSession): Promise<string | null> {
  try {
    const response = await session.fetch(SERVICE_URL);
    const html = await response.text();
    const doc = parseHtml(html);
    const csrfMeta = doc.querySelector('meta[name="_csrf"]');
    return csrfMeta?.getAttribute("content") ?? null;
  } catch {
    return null;
  }
}

/** 查询某一页的消费记录，返回原始 HTML；失败时返回 null */
async function fetchPage(
  session: FetchSession,
  csrf: string,
  page: number,
  startDate: string,
  endDate: string,
): Promise<string | null> {
  try {
    const form = new URLSearchParams({
      pageNo: String(page),
      tabNo: "1",
      "pager.offset": "0",
      tradename: "",
      starttime: startDate,
      endtime: endDate,
      timetype: "1",
      _tradedirect: "on",
      _csrf: csrf,
    });

    const response = await session.fetch(SERVICE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Apifox/1.0.0 (https://www.apifox.cn)",
      },
      body: form.toString(),
    });

    return await response.text();
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// 对外导出的结果类型与主函数
// ─────────────────────────────────────────────

export type FudanCardResult =
  | { success: true; records: FudanCampusCardRecord[] }
  | { success: false; error: string };

/**
 * 登录并查询复旦校园卡消费记录。
 *
 * @param uid        统一身份认证账号
 * @param pwd        统一身份认证密码
 * @param startDate  开始日期，格式 "YYYY-MM-DD"
 * @param endDate    结束日期，格式 "YYYY-MM-DD"
 */
export async function queryFudanCardRecords(
  uid: string,
  pwd: string,
  startDate: string,
  endDate: string,
): Promise<FudanCardResult> {
  // ── 1. CAS 登录 ───────────────────────────────────────────────────
  const loginResult = await casLogin(SERVICE_URL, uid, pwd);
  if (!loginResult.success) {
    return { success: false, error: loginResult.error };
  }

  const { session, locationValue } = loginResult;

  // ── 2. 用票据完成服务端 SSO 回调 ──────────────────────────────────
  await session.fetch(locationValue);

  // ── 3. 获取 CSRF Token ────────────────────────────────────────────
  const csrf = await getCsrf(session);
  if (!csrf) {
    return { success: false, error: "获取 CSRF Token 失败" };
  }

  // ── 4. 分页查询，直到无更多数据 ───────────────────────────────────
  const records: FudanCampusCardRecord[] = [];
  let page = 1;
  let rowIndex = 0;

  while (true) {
    const html = await fetchPage(session, csrf, page, startDate, endDate);
    if (!html) {
      return { success: false, error: `第 ${page} 页数据获取失败` };
    }

    const doc = parseHtml(html);
    const table = doc.querySelector("table");
    if (!table) break; // 无数据表格，结束

    const rows = table.querySelectorAll("tr");
    if (rows.length <= 1) break; // 只有表头，结束

    // 跳过第一行（表头）
    for (const tr of rows.slice(1)) {
      const cells = tr.querySelectorAll("td").map((td) => td.text.trim());
      const record = parseTransactionRow(cells, ++rowIndex);
      if (record) records.push(record);
    }

    page++;
  }

  return { success: true, records };
}
