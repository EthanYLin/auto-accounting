/**
 * 复旦校园卡账单导入相关类型
 */

/** 复旦校园卡消费记录 */
export interface FudanCampusCardRecord {
  /** 记录唯一标识（服务端返回或前端生成） */
  id: string;
  /** 交易时间 (YYYY-MM-DDTHH:mm:ss.SSS) */
  datetime: string;
  /** 交易细节 */
  detail?: string;
  /** 商家 */
  merchant?: string;
  /** 金额 */
  amount: number;
  /** 类别 */
  category?: string;
}
