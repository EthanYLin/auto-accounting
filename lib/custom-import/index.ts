import type { Account, AppDataValue, NewTransactionData } from "@/types";
import type { CustomImportTx } from "./types";

import { CustomCancelOutImporter } from "../importers/custom-cancel-out-importer";
import { Importer } from "../importers/types";
import { MatchingRuleImporter } from "../importers/matching-rule-importer";
import { AiFillImporter } from "../importers/ai-fill-importer";

import { toNewTransactionData } from "./types";

const customImportImporters = [
  new MatchingRuleImporter(),
  new CustomCancelOutImporter(),
  new AiFillImporter(),
];
export const customImporterDescriptions: string[] = customImportImporters.map((i) =>
  i.description(),
);

function resolveImporters(importerIndices?: number[]): Importer[] {
  if (!importerIndices) return customImportImporters;
  const sorted = Array.from(new Set(importerIndices))
    .filter((idx) => idx >= 0 && idx < customImportImporters.length)
    .sort((a, b) => a - b);
  return sorted.map((idx) => customImportImporters[idx]);
}

/** 将已解析的自定义导入行转为交易数据 */
export async function buildNewTxData(
  rows: ReadonlyArray<{ data: CustomImportTx }>,
  account: Account,
  appData: AppDataValue,
  customSource: string,
  importerIndices?: number[],
  onProgress?: (message: string) => void,
): Promise<NewTransactionData[]> {
  onProgress?.("正在生成交易数据…");
  // 1. 转换为交易数据
  const transactions = rows.map((row) => toNewTransactionData(row.data, account, customSource));
  // 2. 执行处理链
  let processed = transactions;
  for (const importer of resolveImporters(importerIndices)) {
    processed = await importer.handle(processed, appData, onProgress);
  }
  return processed;
}
