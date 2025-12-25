import type { 
  TransactionWithRelations, 
  TransactionStatus, 
  TransactionType,
  Account,
  MainCategory,
  SubCategory,
  BudgetType
} from '@/types';

const TRANSACTION_TYPES: TransactionType[] = ["支出", "收入", "转出", "转入", "应收款项", "应付款项"];
const TRANSACTION_STATUSES: TransactionStatus[] = [
  "待处理",
  "经自动处理取消",
  "经自动处理填写",
  "稍后处理",
  "取消",
  "已完成"
];

const MOCK_NAMES = [
  "超市购物",
  "餐饮消费",
  "交通出行",
  "工资收入",
  "话费充值",
  "电费",
  "水费",
  "房租",
  "网购",
  "转账",
  "投资收益",
  "退款",
  "红包",
  "报销",
  "零食",
];

const MOCK_MERCHANTS = [
  "沃尔玛",
  "肯德基",
  "滴滴出行",
  "中国移动",
  "国家电网",
  "淘宝",
  "京东",
  "美团",
  "支付宝",
  "微信",
];

/**
 * 生成随机日期（最近90天内）
 */
function randomDate(): string {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 90);
  const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  return date.toISOString();
}

/**
 * 生成随机金额
 */
function randomAmount(): number {
  return Math.floor(Math.random() * 50000) / 100; // 0.00 到 500.00
}

/**
 * 随机选择数组元素
 */
function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * 生成模拟交易数据
 * @param count 生成数量
 * @param accounts 账户列表（从 AppDataProvider 获取）
 * @param mainCategories 主类别列表（从 AppDataProvider 获取）
 * @param subCategories 子类别列表（从 AppDataProvider 获取）
 * @param budgetTypes 预算计划列表（从 AppDataProvider 获取）
 * @param withChildren 是否生成带子记录的数据（默认部分生成）
 */
export function generateMockTransactions(
  count: number = 50,
  accounts: Account[],
  mainCategories: MainCategory[],
  subCategories: SubCategory[],
  budgetTypes: BudgetType[],
  withChildren: boolean = true
): TransactionWithRelations[] {
  const transactions: TransactionWithRelations[] = [];
  let currentId = 1;

  // 如果没有基础数据，返回空数组
  if (accounts.length === 0) {
    console.warn('没有可用的账户数据，无法生成模拟交易');
    return [];
  }

  // 生成父记录
  const parentCount = withChildren ? Math.floor(count * 0.7) : count; // 70%为父记录或独立记录
  const parentRecords: TransactionWithRelations[] = [];
  
  for (let i = 0; i < parentCount; i++) {
    // 随机选择账户
    const account = randomChoice(accounts);
    
    // 随机选择主类别（可选）
    const mainCategory = Math.random() > 0.2 && mainCategories.length > 0 
      ? randomChoice(mainCategories) 
      : null;
    
    // 随机选择子类别（可选，且需要与主类别匹配）
    const subCategory = Math.random() > 0.3 && subCategories.length > 0 && mainCategory
      ? randomChoice(subCategories.filter(sc => sc.main_category_id === mainCategory.id)) || null
      : null;
    
    // 随机选择预算计划（可选）
    const budgetType = Math.random() > 0.5 && budgetTypes.length > 0
      ? randomChoice(budgetTypes)
      : null;

    const transaction: TransactionWithRelations = {
      id: currentId++,
      user_id: 'test-user-id',
      account_id: account.id,
      account,
      amount: randomAmount(),
      transaction_type: randomChoice(TRANSACTION_TYPES),
      status: randomChoice(TRANSACTION_STATUSES),
      datetime: randomDate(),
      name: randomChoice(MOCK_NAMES),
      merchant: Math.random() > 0.3 ? randomChoice(MOCK_MERCHANTS) : null,
      main_category_id: mainCategory?.id || null,
      main_category: mainCategory || undefined,
      sub_category_id: subCategory?.id || null,
      sub_category: subCategory || undefined,
      budget_type_id: budgetType?.id || null,
      budget_type: budgetType || undefined,
      original_amount: null,
      parent_id: null,
      raw_info: null,
      remark: Math.random() > 0.7 ? '测试备注' : null,
      source: 'mock',
      title: null,
      children: [],
    };

    transactions.push(transaction);
    parentRecords.push(transaction);
  }

  // 为部分父记录生成子记录
  if (withChildren) {
    const childrenCount = count - parentCount;
    const parentsWithChildren = parentRecords.slice(0, Math.min(childrenCount, parentRecords.length));
    
    parentsWithChildren.forEach(parent => {
      // 随机生成1-2个子记录
      const numChildren = Math.random() > 0.5 ? 1 : 2;
      
      for (let j = 0; j < numChildren && currentId <= count; j++) {
        // 随机选择主类别（可选）
        const mainCategory = Math.random() > 0.2 && mainCategories.length > 0 
          ? randomChoice(mainCategories) 
          : null;
        
        // 随机选择子类别（可选，且需要与主类别匹配）
        const subCategory = Math.random() > 0.3 && subCategories.length > 0 && mainCategory
          ? randomChoice(subCategories.filter(sc => sc.main_category_id === mainCategory.id)) || null
          : null;
        
        // 随机选择预算计划（可选）
        const budgetType = Math.random() > 0.5 && budgetTypes.length > 0
          ? randomChoice(budgetTypes)
          : null;

        const child: TransactionWithRelations = {
          id: currentId++,
          user_id: 'test-user-id',
          account_id: parent.account_id,
          account: parent.account,
          amount: randomAmount(),
          transaction_type: parent.transaction_type,
          status: "附加到其他交易",
          datetime: parent.datetime,
          name: `${parent.name}-拆分${j + 1}`,
          merchant: parent.merchant,
          main_category_id: mainCategory?.id || null,
          main_category: mainCategory || undefined,
          sub_category_id: subCategory?.id || null,
          sub_category: subCategory || undefined,
          budget_type_id: budgetType?.id || null,
          budget_type: budgetType || undefined,
          original_amount: null,
          parent_id: parent.id,  // 设置 parent_id 引用父记录
          raw_info: null,
          remark: null,
          source: 'mock',
          title: null,
          children: [],
        };

        // 直接添加到扁平数组，不再维护 children
        transactions.push(child);
      }
    });
  }

  return transactions;
}


