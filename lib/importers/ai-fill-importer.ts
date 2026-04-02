import { getAmountSymbol } from "../transaction/transaction-display";

import { AiCategoryOption, AiRequest, AiResponse, askAi } from "./ai-fill-action";
import { Importer } from "./types";
import { appendRemark } from "./shared";

import {
  NewTransactionData,
  AppDataValue,
  TransactionType,
  BudgetType,
  MainCategory,
  SubCategory,
  Json,
} from "@/types";

// ─── AiCategoryTable ─────────────────────────────────────────────────────────

type TxSymbol = ReturnType<typeof getAmountSymbol>;

class AiCategoryTable {
  readonly bySymbol: Record<TxSymbol, AiCategoryOption[]>;
  private readonly mainById: Map<number, MainCategory>;
  private readonly subById: Map<number, SubCategory>;
  private readonly budgetById: Map<number, BudgetType>;

  constructor(appData: AppDataValue) {
    this.mainById = new Map(appData.mainCategories.map((m) => [m.id, m]));
    this.subById = new Map(appData.subCategories.map((s) => [s.id, s]));
    this.budgetById = new Map(appData.budgetTypes.map((b) => [b.id, b]));

    const result = new Map<TxSymbol, AiCategoryOption[]>();
    for (const sub of appData.subCategories) {
      const main = this.mainById.get(sub.main_category_id);
      if (!main) continue;
      const sym = getAmountSymbol(main.transaction_type);
      const row: AiCategoryOption = {
        option_id: sub.id,
        transaction_type: main.transaction_type,
        main_category: main.label,
        sub_category: sub.label,
      };
      const list = result.get(sym) ?? [];
      result.set(sym, [...list, row]);
    }

    this.bySymbol = Object.fromEntries(result);
  }

  getAllOptions(): Record<TxSymbol, AiCategoryOption[]> {
    return this.bySymbol;
  }

  getFourChainResult(optionId: number): {
    txType: TransactionType;
    mainCategory: MainCategory;
    subCategory: SubCategory;
    budgetType?: BudgetType;
  } | null {
    const sub = this.subById.get(optionId);
    if (!sub) return null;
    const main = this.mainById.get(sub.main_category_id);
    if (!main) return null;
    const budget = sub.budget_type_id ? this.budgetById.get(sub.budget_type_id) : undefined;
    return {
      txType: main.transaction_type,
      mainCategory: main,
      subCategory: sub,
      budgetType: budget,
    };
  }
}

// ─── AiFillImporter ───────────────────────────────────────────────────────────

const REQUEST_GROUP_SIZE = 30;

export class AiFillImporter implements Importer {
  description(): string {
    return "AI 智能填充";
  }

  async handle(
    transactions: NewTransactionData[],
    appData: AppDataValue,
    onProgress?: (message: string) => void,
  ): Promise<NewTransactionData[]> {
    const categoryTable = new AiCategoryTable(appData);
    const categoryOptions = categoryTable.getAllOptions();
    const out: NewTransactionData[] = transactions.map((tx) => ({ ...tx }));

    const total = transactions.length;
    let finished: number = 0;
    onProgress?.(`正在应用 AI 填充(${finished}/${total})…`);

    // Step 1: 过滤不需要 AI 填充的交易，对于需要 AI 填充的交易，生成给 AI 的交易信息。
    const requests: AiRequest[] = transactions
      .map((tx, i) => {
        // 如果交易已经有子分类和名称，或者没有交易类型，或者状态不是待处理或经自动处理填写，则不需要 AI 填充。
        if ((tx.sub_category && tx.name) || !tx.transaction_type) return null;
        if (tx.status !== "待处理" && tx.status !== "经自动处理填写") return null;
        // 生成给 AI 的交易信息
        const txInput = this.getTxInput(tx);
        if (!txInput) return null;
        return {
          tx_index: i,
          tx_symbol: getAmountSymbol(tx.transaction_type),
          tx_info: txInput,
        };
      })
      .filter((r): r is AiRequest => r != null);

    finished = total - requests.length;
    onProgress?.(`正在应用 AI 填充(${finished}/${total})…`);

    // Step 2: 将交易信息分组，分批提交给 AI 并获取结果。
    for (let start = 0; start < requests.length; start += REQUEST_GROUP_SIZE) {
      const group = requests.slice(start, start + REQUEST_GROUP_SIZE);
      // 调用 AI 获取结果
      const { responses } = await askAi({
        requests: group,
        options: categoryOptions,
      });
      // 解析 AI 结果，应用到交易中
      for (const [key, answer] of Object.entries(responses)) {
        if (!answer) continue;
        const tx_index = Number(key);
        out[tx_index] = this.applyAnswer(out[tx_index], answer, categoryTable);
      }

      finished += group.length;
      onProgress?.(`正在应用 AI 填充(${finished}/${total})…`);
    }

    return out;
  }

  private applyAnswer(
    tx: NewTransactionData,
    answer: AiResponse,
    categoryTable: AiCategoryTable,
  ): NewTransactionData {
    const fourChain = answer.option_id ? categoryTable.getFourChainResult(answer.option_id) : null;
    const next = { ...tx };
    let changed = false;
    if (
      !next.sub_category &&
      fourChain &&
      getAmountSymbol(fourChain.txType) === getAmountSymbol(tx.transaction_type)
    ) {
      next.transaction_type = fourChain.txType;
      next.main_category = fourChain.mainCategory;
      next.sub_category = fourChain.subCategory;
      next.budget_type = fourChain.budgetType;
      changed = true;
    }
    if (!next.name && answer.name) {
      next.name = answer.name;
      changed = true;
    }
    if (!next.merchant && answer.merchant) {
      next.merchant = answer.merchant;
      changed = true;
    }
    if (changed) {
      next.remark = appendRemark(tx.remark, "[AI]");
      next.status = "经自动处理填写";
    }
    return next;
  }

  private getTxInput(tx: NewTransactionData): Record<string, unknown> | null {
    const result: Record<string, unknown> = {};

    if (tx.main_category) result["main_category"] = tx.main_category.label;
    if (tx.sub_category) result["sub_category"] = tx.sub_category.label;
    if (tx.name) result["name"] = tx.name;
    if (tx.merchant) result["merchant"] = tx.merchant;
    if (
      typeof tx.raw_info === "object" &&
      !Array.isArray(tx.raw_info) &&
      Object.keys(tx.raw_info as Record<string, Json>).length > 0
    ) {
      result["more_info"] = tx.raw_info;
    }

    if (Object.keys(result).length === 0) return null;
    return result;
  }
}
