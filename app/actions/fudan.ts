"use server";

import type { FudanCampusCardRecord } from "@/lib/fudan-import/types";

import { queryFudanCardRecords } from "@/lib/fudan-import/FudanCard";

export type QueryFudanRecordsResult =
  | { success: true; records: FudanCampusCardRecord[] }
  | { success: false; error: string };

/**
 * Server Action：查询复旦校园卡消费记录。
 *
 * @param uid        统一身份认证账号
 * @param pwd        统一身份认证密码
 * @param startDate  开始日期，格式 "YYYY-MM-DD"
 * @param endDate    结束日期，格式 "YYYY-MM-DD"
 */
export async function queryFudanRecords(
  uid: string,
  pwd: string,
  startDate: string,
  endDate: string,
): Promise<QueryFudanRecordsResult> {
  if (!uid.trim() || !pwd.trim()) {
    return { success: false, error: "请填写统一身份认证账号和密码" };
  }
  if (!startDate || !endDate) {
    return { success: false, error: "请选择完整的日期范围" };
  }

  return queryFudanCardRecords(uid, pwd, startDate, endDate);
}
