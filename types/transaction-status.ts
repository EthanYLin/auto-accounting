// 交易状态枚举

export enum TransactionStatus {
    PENDING = "待处理",
    PROCESSED_CANCELLED = "经自动处理取消",
    PROCESSED_FILLED = "经自动处理填写",
    LATER_ON = "稍后处理",
    CANCELLED = "取消",
    ATTACHED_TO_OTHER = "附加到其他交易",
    COMPLETED = "已完成",
}
