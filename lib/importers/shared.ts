import type {
  AppDataValue,
  MainCategory,
  NewTransactionData,
  SubCategory,
  TransactionType,
} from "@/types";

import { ColumnKey as WechatColumnKey } from "../wechat-import/types";
import { ColumnKey as AlipayColumnKey } from "../alipay-import/types";

// ─── 辅助函数 ──────────────────────────────────────────────────────────────────

/** 从 raw_info 中读取微信账单原始字段值 */
export function getWxRawField(tx: NewTransactionData, field: WechatColumnKey): string | null {
  const raw = tx.raw_info;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const val = (raw as Record<string, unknown>)[field];
  if (val === undefined || val === null) return null;
  const str = String(val).trim();
  return str === "" ? null : str;
}

/** 从 raw_info 中读取支付宝账单原始字段值 */
export function getAlipayRawField(tx: NewTransactionData, field: AlipayColumnKey): string | null {
  const raw = tx.raw_info;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const val = (raw as Record<string, unknown>)[field];
  if (val === undefined || val === null) return null;
  const str = String(val).trim();
  return str === "" ? null : str;
}

/** 追加备注，自动处理空值和空格 */
export function appendRemark(existing: string | null, addition: string): string {
  if (!existing || existing.trim() === "") return addition;
  return `${existing.trim()} ${addition}`;
}

/**
 * 按 transaction_type 和 label 查找主/子分类，找不到则保持 undefined。
 */
export function resolveCategories(
  appData: AppDataValue,
  txType: TransactionType | null,
  mainLabel: string,
  subLabel: string,
): { main_category?: MainCategory; sub_category?: SubCategory } {
  const mainCat = appData.mainCategories.find(
    (mc) => mc.label === mainLabel && (!txType || mc.transaction_type === txType),
  );
  const subCat = mainCat
    ? appData.subCategories.find(
        (sc) => sc.label === subLabel && sc.main_category_id === mainCat.id,
      )
    : undefined;

  return { main_category: mainCat, sub_category: subCat };
}

/**
 * 从微信状态字符串中提取退款金额数字。
 * 支持 "已退款（¥77.00）" / "已退款(￥77.00)" / "已退款¥77.00" 等格式，忽略 ¥/￥ 符号差异。
 * 返回 null 表示无法解析。
 */
export function parseRefundAmount(status: string): number | null {
  // 移除所有括号、¥、￥ 后提取数字
  const match = status.match(/已退款[（(]?[¥￥]?([\d.]+)[）)]?/);
  if (!match) return null;
  const num = parseFloat(match[1]);
  return isNaN(num) ? null : num;
}
