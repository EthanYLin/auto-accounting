import type { AppDataValue, NewTransactionData } from "@/types";

export interface Importer {
  description(): string;
  handle(
    transactions: NewTransactionData[],
    appData: AppDataValue,
    onProgress?: (message: string) => void,
  ): Promise<NewTransactionData[]>;
}
