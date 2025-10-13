// 交易信息 数据结构
import { TransactionType } from "@/types/transaction-type";
import { BudgetType } from "@/types/budget-type";
import { MainCategory, SubCategory, TxType } from "@/types/category";
import { TransactionStatus } from "@/types/transaction-status";
import { Account } from "@/types/account";

interface TransactionSplit {
    amount: number; // 分账金额
    mainCategory: MainCategory<TxType> | null;  // 主类别
    subCategory: SubCategory<TxType, MainCategory<TxType>> | null;  // 子类别
    budgetPlan: BudgetType | null;  // 预算计划
    name: string | null;  // 分账名称
    account: Account | null;  // 分账账户
}

class Transaction {
    // 基本信息
    id: number;       // 交易ID
    account: Account | null;  // 交易账户
    originalAmount: number | null;   // 原始交易金额(来自外部系统导入)
    amount: number;   // 交易金额
    datetime: Date | null;  // 交易日期及时间
    name: string | null;  // 交易名称
    merchant: string | null;  // 交易商户
    transactionType: TransactionType | null;  // 交易类型
    mainCategory: MainCategory<TxType> | null;  // 主类别
    subCategory: SubCategory<TxType, MainCategory<TxType>> | null;  // 子类别
    budgetPlan: BudgetType | null;  // 预算计划

    // 外部导入信息
    source: string | null;  // 来源
    rawInfo: Map<string, string> | null;  // 原始信息(来自外部系统导入)
    remark: string | null;  // 备注
    title: string | null;  // 标题(来自外部系统导入)

    // 状态信息
    status: TransactionStatus | null;  // 交易状态

    // 关联信息
    parentId: number | null;  // 父交易ID
    childIds: number[] | null;  // 子交易ID
    splits: TransactionSplit[] | null;  // 分账信息

    constructor(id: number) {
        this.id = id;
        this.account = null;
        this.originalAmount = null;
        this.amount = 0;
        this.datetime = null;
        this.name = null;
        this.merchant = null;
        this.transactionType = null;
        this.mainCategory = null;
        this.subCategory = null;
        this.budgetPlan = null;
        this.source = null;
        this.rawInfo = null;
        this.remark = null;
        this.title = null;
        this.status = null;
        this.parentId = null;
        this.childIds = null;
        this.splits = null;
    }

    /**
     * 检查金额是否已修改
     * @returns 如果原始金额与当前金额不同则返回true，否则返回false
     */
    accountChanged(): boolean {
        return this.originalAmount != null && 
               this.amount != null && 
               this.originalAmount !== this.amount;
    }
}

/**
 * 管理所有交易的容器类
 */
export class AllTransactions {
    private transactions: Transaction[];

    constructor() {
        this.transactions = [];
    }

    /**
     * 获取所有交易
     */
    get(): Transaction[] {
        return this.transactions;
    }

    /**
     * 添加交易到数组
     */
    add(transaction: Transaction): void {
        this.transactions.push(transaction);
    }

    /**
     * 创建新交易，ID为当前最大ID+1
     * @returns 新的Transaction实例
     */
    new(): Transaction {
        let maxId = 0;
        if (this.transactions.length > 0) {
            maxId = Math.max(...this.transactions.map(t => t.id));
        }
        const newId = maxId + 1;
        const newTransaction = new Transaction(newId);
        this.add(newTransaction);
        return newTransaction;
    }

    /**
     * 根据ID查找交易
     */
    find(id: number): Transaction | undefined {
        return this.transactions.find(t => t.id === id);
    }

    /**
     * 获取交易总数
     */
    count(): number {
        return this.transactions.length;
    }
}