// 交易分类枚举

import { TransactionType } from "@/types/transaction-type";
import { BudgetType } from "@/types/budget-type";
export type TxType = keyof typeof TransactionType;

// ========== 类型定义 ==========
interface SubCategoryConfig {
    label: string;
    budget: BudgetType | null;
    icon: string;
    backColor: string;
    foreColor: string;
}

interface MainCategoryConfig {
    label: string;
    icon: string;
    backColor: string;
    foreColor: string;
    subs: Record<string, SubCategoryConfig>;
}

interface TypeCategoryConfig {
    label: string;
    icon: string;
    backColor: string;
    foreColor: string;
    mains: Record<string, MainCategoryConfig>;
}

type CategoryTreeStructure = Record<TxType, TypeCategoryConfig>;

// ========== 三级类目树（包含配置信息）==========
export const CATEGORY_TREE = {
    EXPENSE: {
        label: TransactionType.EXPENSE,
        icon: "💸",
        backColor: "bg-green-100 dark:bg-green-500",
        foreColor: "text-green-800 dark:text-green-200",
        mains: {
            FOOD: {
                label: "饮食",
                icon: "🍽️",
                backColor: "bg-yellow-100 dark:bg-yellow-900",
                foreColor: "text-yellow-800 dark:text-yellow-200",
                subs: {
                    BREAKFAST: { label: "早餐", budget: BudgetType.BASIC, icon: "🥞", backColor: "bg-yellow-100 dark:bg-yellow-900", foreColor: "text-yellow-800 dark:text-yellow-200" },
                    LUNCH: { label: "午餐", budget: BudgetType.BASIC, icon: "🍱", backColor: "bg-yellow-100 dark:bg-yellow-900", foreColor: "text-yellow-800 dark:text-yellow-200" },
                    DINNER: { label: "晚餐", budget: BudgetType.BASIC, icon: "🍽️", backColor: "bg-yellow-100 dark:bg-yellow-900", foreColor: "text-yellow-800 dark:text-yellow-200" },
                    DESSERT: { label: "点心", budget: BudgetType.ENTERTAINMENT, icon: "🧁", backColor: "bg-yellow-100 dark:bg-yellow-900", foreColor: "text-yellow-800 dark:text-yellow-200" },
                    SUPPER: { label: "夜宵", budget: BudgetType.ENTERTAINMENT, icon: "🍜", backColor: "bg-yellow-100 dark:bg-yellow-900", foreColor: "text-yellow-800 dark:text-yellow-200" },
                    SNACKS: { label: "零食", budget: BudgetType.ENTERTAINMENT, icon: "🍿", backColor: "bg-yellow-100 dark:bg-yellow-900", foreColor: "text-yellow-800 dark:text-yellow-200" },
                    DRINKS: { label: "饮料", budget: BudgetType.BASIC, icon: "🥤", backColor: "bg-yellow-100 dark:bg-yellow-900", foreColor: "text-yellow-800 dark:text-yellow-200" },
                },
            },
            ENTERTAINMENT: {
                label: "娱乐",
                icon: "🎮",
                backColor: "bg-pink-100 dark:bg-pink-900",
                foreColor: "text-pink-800 dark:text-pink-200",
                subs: {
                    EATING_OUT: { label: "外出吃饭", budget: BudgetType.ENTERTAINMENT, icon: "🍴", backColor: "bg-pink-100 dark:bg-pink-900", foreColor: "text-pink-800 dark:text-pink-200" },
                    PARTY_KTV: { label: "聚会/唱歌", budget: BudgetType.ENTERTAINMENT, icon: "🎤", backColor: "bg-pink-100 dark:bg-pink-900", foreColor: "text-pink-800 dark:text-pink-200" },
                    ESCAPE_PARTY: { label: "密室/轰趴/剧本杀", budget: BudgetType.ENTERTAINMENT, icon: "🔍", backColor: "bg-pink-100 dark:bg-pink-900", foreColor: "text-pink-800 dark:text-pink-200" },
                    MOVIE: { label: "电影", budget: BudgetType.ENTERTAINMENT, icon: "🎬", backColor: "bg-pink-100 dark:bg-pink-900", foreColor: "text-pink-800 dark:text-pink-200" },
                    THEME_PARK: { label: "游乐园", budget: BudgetType.ENTERTAINMENT, icon: "🎢", backColor: "bg-pink-100 dark:bg-pink-900", foreColor: "text-pink-800 dark:text-pink-200" },
                    CAFE: { label: "咖啡馆", budget: BudgetType.ENTERTAINMENT, icon: "☕", backColor: "bg-pink-100 dark:bg-pink-900", foreColor: "text-pink-800 dark:text-pink-200" },
                },
            },
            SHOPPING_DIGITAL: {
                label: "购物/数码",
                icon: "🛍️",
                backColor: "bg-indigo-100 dark:bg-indigo-900",
                foreColor: "text-indigo-800 dark:text-indigo-200",
                subs: {
                    DAILY_GOODS: { label: "日用品", budget: BudgetType.BASIC, icon: "🧼", backColor: "bg-indigo-100 dark:bg-indigo-900", foreColor: "text-indigo-800 dark:text-indigo-200" },
                    CLOTHES: { label: "衣物", budget: BudgetType.ENTERTAINMENT, icon: "👕", backColor: "bg-indigo-100 dark:bg-indigo-900", foreColor: "text-indigo-800 dark:text-indigo-200" },
                    SHOES: { label: "鞋子", budget: BudgetType.ENTERTAINMENT, icon: "👟", backColor: "bg-indigo-100 dark:bg-indigo-900", foreColor: "text-indigo-800 dark:text-indigo-200" },
                    ACCESSORIES: { label: "配饰", budget: BudgetType.ENTERTAINMENT, icon: "💍", backColor: "bg-indigo-100 dark:bg-indigo-900", foreColor: "text-indigo-800 dark:text-indigo-200" },
                    BAGS: { label: "箱包", budget: BudgetType.ENTERTAINMENT, icon: "🎒", backColor: "bg-indigo-100 dark:bg-indigo-900", foreColor: "text-indigo-800 dark:text-indigo-200" },
                    SKINCARE_MAKEUP: { label: "护肤/美妆", budget: BudgetType.ENTERTAINMENT, icon: "💄", backColor: "bg-indigo-100 dark:bg-indigo-900", foreColor: "text-indigo-800 dark:text-indigo-200" },
                    DIGITAL_PRODUCTS: { label: "数码产品", budget: BudgetType.ENTERTAINMENT, icon: "📱", backColor: "bg-indigo-100 dark:bg-indigo-900", foreColor: "text-indigo-800 dark:text-indigo-200" },
                    APPS: { label: "应用软件", budget: BudgetType.ENTERTAINMENT, icon: "📲", backColor: "bg-indigo-100 dark:bg-indigo-900", foreColor: "text-indigo-800 dark:text-indigo-200" },
                    GAMES: { label: "游戏", budget: BudgetType.ENTERTAINMENT, icon: "🎮", backColor: "bg-indigo-100 dark:bg-indigo-900", foreColor: "text-indigo-800 dark:text-indigo-200" },
                },
            },
            OTHERS: {
                label: "其他",
                icon: "👥",
                backColor: "bg-gray-100 dark:bg-gray-800",
                foreColor: "text-gray-800 dark:text-gray-200",
                subs: {
                    SOCIAL_A: { label: "社交A", budget: BudgetType.SOCIAL, icon: "💝", backColor: "bg-gray-100 dark:bg-gray-800", foreColor: "text-gray-800 dark:text-gray-200" },
                    SOCIAL_B: { label: "社交B", budget: BudgetType.SOCIAL, icon: "🎊", backColor: "bg-gray-100 dark:bg-gray-800", foreColor: "text-gray-800 dark:text-gray-200" },
                    SOCIAL_C: { label: "社交C", budget: BudgetType.SOCIAL, icon: "🏡", backColor: "bg-gray-100 dark:bg-gray-800", foreColor: "text-gray-800 dark:text-gray-200" },
                    SOCIAL_D: { label: "社交D", budget: BudgetType.SOCIAL, icon: "🛸", backColor: "bg-gray-100 dark:bg-gray-800", foreColor: "text-gray-800 dark:text-gray-200" },
                    SOCIAL_K: { label: "社交K", budget: BudgetType.SOCIAL, icon: "💕", backColor: "bg-gray-100 dark:bg-gray-800", foreColor: "text-gray-800 dark:text-gray-200" },
                    OTHER: { label: "其他", budget: BudgetType.SOCIAL, icon: "📋", backColor: "bg-gray-100 dark:bg-gray-800", foreColor: "text-gray-800 dark:text-gray-200" },
                },
            },
            TRANSPORT: {
                label: "交通",
                icon: "🚗",
                backColor: "bg-blue-100 dark:bg-blue-900",
                foreColor: "text-blue-800 dark:text-blue-200",
                subs: {
                    BIKE: { label: "自行车", budget: BudgetType.BASIC, icon: "🚲", backColor: "bg-blue-100 dark:bg-blue-900", foreColor: "text-blue-800 dark:text-blue-200" },
                    PUBLIC_TRANSPORT: { label: "公共交通", budget: BudgetType.BASIC, icon: "🚌", backColor: "bg-blue-100 dark:bg-blue-900", foreColor: "text-blue-800 dark:text-blue-200" },
                    TAXI: { label: "出租车", budget: BudgetType.BASIC, icon: "🚕", backColor: "bg-blue-100 dark:bg-blue-900", foreColor: "text-blue-800 dark:text-blue-200" },
                },
            },
            HOME: {
                label: "家居",
                icon: "🏠",
                backColor: "bg-emerald-100 dark:bg-emerald-900",
                foreColor: "text-emerald-800 dark:text-emerald-200",
                subs: {
                    WATER_BILL: { label: "水费", budget: BudgetType.BASIC, icon: "💧", backColor: "bg-emerald-100 dark:bg-emerald-900", foreColor: "text-emerald-800 dark:text-emerald-200" },
                    ELECTRICITY_BILL: { label: "电费", budget: BudgetType.BASIC, icon: "⚡", backColor: "bg-emerald-100 dark:bg-emerald-900", foreColor: "text-emerald-800 dark:text-emerald-200" },
                    FURNITURE: { label: "家具", budget: BudgetType.BASIC, icon: "🪑", backColor: "bg-emerald-100 dark:bg-emerald-900", foreColor: "text-emerald-800 dark:text-emerald-200" },
                    CLEANING: { label: "清扫", budget: BudgetType.BASIC, icon: "🧽", backColor: "bg-emerald-100 dark:bg-emerald-900", foreColor: "text-emerald-800 dark:text-emerald-200" },
                    LAUNDRY: { label: "洗衣", budget: BudgetType.BASIC, icon: "👔", backColor: "bg-emerald-100 dark:bg-emerald-900", foreColor: "text-emerald-800 dark:text-emerald-200" },
                },
            },
            STUDY: {
                label: "学习",
                icon: "📚",
                backColor: "bg-purple-100 dark:bg-purple-900",
                foreColor: "text-purple-800 dark:text-purple-200",
                subs: {
                    TEXTBOOKS: { label: "教材", budget: BudgetType.BASIC, icon: "📖", backColor: "bg-purple-100 dark:bg-purple-900", foreColor: "text-purple-800 dark:text-purple-200" },
                    COURSES: { label: "课程", budget: BudgetType.BASIC, icon: "🎓", backColor: "bg-purple-100 dark:bg-purple-900", foreColor: "text-purple-800 dark:text-purple-200" },
                    BOOKS: { label: "图书", budget: BudgetType.BASIC, icon: "📚", backColor: "bg-purple-100 dark:bg-purple-900", foreColor: "text-purple-800 dark:text-purple-200" },
                    CERTIFICATES: { label: "证书", budget: BudgetType.BASIC, icon: "🏆", backColor: "bg-purple-100 dark:bg-purple-900", foreColor: "text-purple-800 dark:text-purple-200" },
                    PRINTING: { label: "打印", budget: BudgetType.BASIC, icon: "🖨️", backColor: "bg-purple-100 dark:bg-purple-900", foreColor: "text-purple-800 dark:text-purple-200" },
                    STATIONERY: { label: "文具", budget: BudgetType.BASIC, icon: "✏️", backColor: "bg-purple-100 dark:bg-purple-900", foreColor: "text-purple-800 dark:text-purple-200" },
                },
            },
            TRAVEL: {
                label: "旅行",
                icon: "✈️",
                backColor: "bg-teal-100 dark:bg-teal-900",
                foreColor: "text-teal-800 dark:text-teal-200",
                subs: {
                    AIR_OR_TRAIN: { label: "机票/火车票", budget: BudgetType.ENTERTAINMENT, icon: "🚄", backColor: "bg-teal-100 dark:bg-teal-900", foreColor: "text-teal-800 dark:text-teal-200" },
                    HOTEL: { label: "酒店", budget: BudgetType.ENTERTAINMENT, icon: "🏨", backColor: "bg-teal-100 dark:bg-teal-900", foreColor: "text-teal-800 dark:text-teal-200" },
                    FOOD: { label: "吃饭", budget: BudgetType.ENTERTAINMENT, icon: "🍽️", backColor: "bg-teal-100 dark:bg-teal-900", foreColor: "text-teal-800 dark:text-teal-200" },
                    DESSERTS_DRINKS: { label: "甜品饮料", budget: BudgetType.ENTERTAINMENT, icon: "🧁", backColor: "bg-teal-100 dark:bg-teal-900", foreColor: "text-teal-800 dark:text-teal-200" },
                    TICKET: { label: "门票", budget: BudgetType.ENTERTAINMENT, icon: "🎫", backColor: "bg-teal-100 dark:bg-teal-900", foreColor: "text-teal-800 dark:text-teal-200" },
                    OTHER_TRANSPORT: { label: "其他交通", budget: BudgetType.ENTERTAINMENT, icon: "🚐", backColor: "bg-teal-100 dark:bg-teal-900", foreColor: "text-teal-800 dark:text-teal-200" },
                    OTHER_FEES: { label: "其他费用", budget: BudgetType.ENTERTAINMENT, icon: "💳", backColor: "bg-teal-100 dark:bg-teal-900", foreColor: "text-teal-800 dark:text-teal-200" },
                },
            },
        },
    },

    INCOME: {
        label: TransactionType.INCOME,
        icon: "💰",
        backColor: "bg-red-100 dark:bg-red-900",
        foreColor: "text-red-800 dark:text-red-200",
        mains: {
            INCOME: {
                label: "收入",
                icon: "💼",
                backColor: "bg-red-100 dark:bg-red-900",
                foreColor: "text-red-800 dark:text-red-200",
                subs: {
                    LIVING_EXPENSE: { label: "生活费", budget: null, icon: "🏠", backColor: "bg-red-100 dark:bg-red-900", foreColor: "text-red-800 dark:text-red-200" },
                    RED_ENVELOPE: { label: "红包", budget: null, icon: "🧧", backColor: "bg-red-100 dark:bg-red-900", foreColor: "text-red-800 dark:text-red-200" },
                    SALARY: { label: "工资", budget: null, icon: "💰", backColor: "bg-red-100 dark:bg-red-900", foreColor: "text-red-800 dark:text-red-200" },
                    SUBSIDY: { label: "补助", budget: null, icon: "🎁", backColor: "bg-red-100 dark:bg-red-900", foreColor: "text-red-800 dark:text-red-200" },
                    INVESTMENT: { label: "投资", budget: null, icon: "📈", backColor: "bg-red-100 dark:bg-red-900", foreColor: "text-red-800 dark:text-red-200" },
                    XIAN_YU: { label: "闲鱼", budget: null, icon: "🛍️", backColor: "bg-red-100 dark:bg-red-900", foreColor: "text-red-800 dark:text-red-200" },
                    REFUND: { label: "退款", budget: null, icon: "↩️", backColor: "bg-red-100 dark:bg-red-900", foreColor: "text-red-800 dark:text-red-200" },
                    OTHER: { label: "其他", budget: null, icon: "📋", backColor: "bg-red-100 dark:bg-red-900", foreColor: "text-red-800 dark:text-red-200" },
                    DISCOUNT: { label: "优惠", budget: null, icon: "🏷️", backColor: "bg-red-100 dark:bg-red-900", foreColor: "text-red-800 dark:text-red-200" },
                },
            },
        },
    },

    TRANSFER: {
        label: TransactionType.TRANSFER,
        icon: "🔄",
        backColor: "bg-cyan-100 dark:bg-cyan-900",
        foreColor: "text-cyan-800 dark:text-cyan-200",
        mains: {
            TRANSFER: {
                label: "转账",
                icon: "💱",
                backColor: "bg-cyan-100 dark:bg-cyan-900",
                foreColor: "text-cyan-800 dark:text-cyan-200",
                subs: {
                    TRANSFER: { label: "转账", budget: null, icon: "💱", backColor: "bg-cyan-100 dark:bg-cyan-900", foreColor: "text-cyan-800 dark:text-cyan-200" },
                },
            },
        },
    },

    RECEIVABLE: {
        label: TransactionType.RECEIVABLE,
        icon: "📥",
        backColor: "bg-violet-100 dark:bg-violet-900",
        foreColor: "text-violet-800 dark:text-violet-200",
        mains: {
            RECEIVABLE: {
                label: "应收款项",
                icon: "📋",
                backColor: "bg-violet-100 dark:bg-violet-900",
                foreColor: "text-violet-800 dark:text-violet-200",
                subs: {
                    REIMBURSEMENT: { label: "报账", budget: null, icon: "🧾", backColor: "bg-violet-100 dark:bg-violet-900", foreColor: "text-violet-800 dark:text-violet-200" },
                    PREPAID: { label: "预付", budget: null, icon: "💳", backColor: "bg-violet-100 dark:bg-violet-900", foreColor: "text-violet-800 dark:text-violet-200" },
                    WAGES_RECEIVABLE: { label: "应发工资", budget: null, icon: "💼", backColor: "bg-violet-100 dark:bg-violet-900", foreColor: "text-violet-800 dark:text-violet-200" },
                },
            },
        },
    },

    PAYABLE: {
        label: TransactionType.PAYABLE,
        icon: "📤",
        backColor: "bg-orange-100 dark:bg-orange-900",
        foreColor: "text-orange-800 dark:text-orange-200",
        mains: {
            PAYABLE: {
                label: "应付款项",
                icon: "📝",
                backColor: "bg-orange-100 dark:bg-orange-900",
                foreColor: "text-orange-800 dark:text-orange-200",
                subs: {
                    BORROWED: { label: "借入", budget: null, icon: "🤝", backColor: "bg-orange-100 dark:bg-orange-900", foreColor: "text-orange-800 dark:text-orange-200" },
                },
            },
        },
    },
} as const satisfies CategoryTreeStructure;


// ========== 自动推导出的类型 =========
type CategoryTreeType = typeof CATEGORY_TREE;

export type MainCategory<M extends TxType> =
    keyof CategoryTreeType[M]["mains"];

export type SubCategory<
    M extends TxType,
    A extends MainCategory<M>
> = keyof (CategoryTreeType[M]["mains"][A] extends { subs: infer S } ? S : never);

export type CategoryPath<
    M extends TxType = TxType,
    A extends MainCategory<M> = MainCategory<M>,
    S extends SubCategory<M, A> = SubCategory<M, A>
> = {
    type: M;
    main: A;
    sub: S;
};

// ========== 状态机相关类型 ==========
export type CategoryState = {
    txType?: TxType;
    main?: string;
    sub?: string;
    budget?: BudgetType;
};

export type CategoryAction =
    | { type: "SET_TX"; tx: TxType }
    | { type: "SET_MAIN"; main: string }
    | { type: "SET_SUB"; sub: string }
    | { type: "SET_BUDGET"; budget: BudgetType | undefined }
    | { type: "AUTO" }; // 处理"只有一个选项则自动选择"

// ========== 必要的 3 个函数（按你要求）==========

// 1) 获取有哪些主类别（给定交易类型）
export function getMainCategories<M extends TxType>(type: M): MainCategory<M>[] {
    return Object.keys(CATEGORY_TREE[type].mains) as MainCategory<M>[];
}

// 2) 获取特定交易类型 + 主类别有哪些子类别
export function getSubCategories<
    M extends TxType,
    A extends MainCategory<M>
>(type: M, main: A): SubCategory<M, A>[] {
    const typeCategory = CATEGORY_TREE[type];
    const mainCategory = (typeCategory.mains as Record<string, MainCategoryConfig>)[main as string];
    return Object.keys(mainCategory.subs) as SubCategory<M, A>[];
}

// 3) 获取特定交易类型 + 主类别 + 子类别的中文名和预算类型
export function getSpecificSubCategory<
    M extends TxType,
    A extends MainCategory<M>,
    S extends SubCategory<M, A>
>(type: M, main: A, sub: S): {
    typeLabel: string;
    mainLabel: string;
    subLabel: string;
    foreColor: string;
    backColor: string;
    budget: BudgetType | null;
} {
    const typeCategory = CATEGORY_TREE[type];
    const mainCategory = (typeCategory.mains as Record<string, MainCategoryConfig>)[main as string];
    const subCategory = (mainCategory.subs as Record<string, SubCategoryConfig>)[sub as string];
    return {
        typeLabel: typeCategory.label,
        mainLabel: mainCategory.label,
        subLabel: subCategory.label,
        foreColor: subCategory.foreColor,
        backColor: subCategory.backColor,
        budget: subCategory.budget
    };
}

// 4) 给定 交易类型 + 主类别 + 子类别，判断是否合法
export function isValidCategoryPath(
    type: TxType,
    main: string,
    sub: string
): boolean {
    const typeCategory = CATEGORY_TREE[type];
    if (!typeCategory) return false;
    
    const mainCategory = (typeCategory.mains as Record<string, MainCategoryConfig>)[main];
    if (!mainCategory) return false;
    
    return sub in mainCategory.subs;
}

// ========== 状态机 Reducer ==========
// 自动选择辅助函数
function autoSelectFromState(state: CategoryState): CategoryState {
    if (!state.txType) return state;
    
    const typeCategory = CATEGORY_TREE[state.txType];
    const mains = Object.keys(typeCategory.mains);
    
    // 自动选择主类别（如果只有一个且未选择）
    if (!state.main && mains.length === 1) {
        state.main = mains[0];
    }
    
    // 自动选择子类别（如果只有一个且未选择）
    if (state.main && !state.sub) {
        const mainCategory = (typeCategory.mains as Record<string, MainCategoryConfig>)[state.main];
        const subs = Object.keys(mainCategory.subs);
        if (subs.length === 1) {
            const sub = subs[0];
            state.sub = sub;
            const subCategory = (mainCategory.subs as Record<string, SubCategoryConfig>)[sub];
            state.budget = subCategory.budget ?? undefined;
        }
    }
    
    return state;
}

export function categoryReducer(state: CategoryState, action: CategoryAction): CategoryState {
    switch (action.type) {
        case "SET_TX":
            return autoSelectFromState({ txType: action.tx });

        case "SET_MAIN":
            return autoSelectFromState({ 
                ...state, 
                main: action.main, 
                sub: undefined, 
                budget: undefined 
            });

        case "SET_SUB": {
            const { txType, main } = state;
            if (!txType || !main) return state;
            
            const typeCategory = CATEGORY_TREE[txType];
            const mainCategory = (typeCategory.mains as Record<string, MainCategoryConfig>)[main];
            const subCategory = (mainCategory.subs as Record<string, SubCategoryConfig>)[action.sub];
            
            return { 
                ...state, 
                sub: action.sub, 
                budget: subCategory?.budget ?? undefined 
            };
        }

        case "SET_BUDGET":
            return { ...state, budget: action.budget };

        case "AUTO": {
            const txTypes = Object.keys(CATEGORY_TREE) as TxType[];
            let next = { ...state };
            
            // 自动选择交易类型（如果只有一个且未选择）
            if (!next.txType && txTypes.length === 1) {
                next.txType = txTypes[0];
            }
            
            // 使用自动选择辅助函数处理后续选择
            return autoSelectFromState(next);
        }

        default:
            return state;
    }
}
