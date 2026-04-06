import { DateTime } from "luxon";

export const TRANSACTION_TIME_ZONE = "Asia/Shanghai";
export const TRANSACTION_DATETIME_FORMAT = "yyyy-MM-dd'T'HH:mm:ss";

const LOCAL_TRANSACTION_INPUT_FORMATS = [
  "yyyy-MM-dd'T'HH:mm:ss",
  "yyyy-MM-dd'T'HH:mm",
  "yyyy-MM-dd'T'HH:mm:ss.SSS",
  "yyyy-MM-dd HH:mm:ss",
  "yyyy-MM-dd HH:mm",
  "yyyy-MM-dd HH:mm:ss.SSS",
] as const;

export function parseTxTime(value: string | Date | DateTime | null | undefined): DateTime | null {
  if (value == null) return null;

  if (DateTime.isDateTime(value)) {
    return value.isValid ? value.setZone(TRANSACTION_TIME_ZONE) : null;
  }

  if (value instanceof Date) {
    const dt = DateTime.fromJSDate(value, { zone: TRANSACTION_TIME_ZONE });
    return dt.isValid ? dt : null;
  }

  const trimmed = value.trim();
  if (!trimmed) return null;

  for (const format of LOCAL_TRANSACTION_INPUT_FORMATS) {
    const dt = DateTime.fromFormat(trimmed, format, { zone: TRANSACTION_TIME_ZONE });
    if (dt.isValid) return dt;
  }

  const iso = DateTime.fromISO(trimmed, { setZone: true });
  return iso.isValid ? iso.setZone(TRANSACTION_TIME_ZONE) : null;
}

export function formatTxTime(value: string | Date | DateTime | null | undefined): string | null {
  const dt = parseTxTime(value);
  return dt ? dt.toFormat(TRANSACTION_DATETIME_FORMAT) : null;
}

export function displayTxTime(
  value: string | Date | DateTime | null | undefined,
  format: "long" | "short" | "full" = "long",
): string {
  const dt = parseTxTime(value);
  if (!dt) return "-";

  if (format === "full") return dt.toFormat("yyyy-MM-dd HH:mm:ss");
  return format === "long" ? dt.toFormat("yyyy-MM-dd HH:mm") : dt.toFormat("MM-dd HH:mm");
}

export function compareTxTime(
  a: string | Date | DateTime | null | undefined,
  b: string | Date | DateTime | null | undefined,
): number {
  const timeA = parseTxTime(a)?.toMillis() ?? null;
  const timeB = parseTxTime(b)?.toMillis() ?? null;

  if (timeA === null && timeB === null) return 0;
  if (timeA === null) return -1;
  if (timeB === null) return 1;
  return timeA < timeB ? -1 : timeA > timeB ? 1 : 0;
}
