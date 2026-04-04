import type { TransactionWithRelations } from "@/types";

export interface ExportArtifact {
  filename: string;
  mimeType: string;
  extension: string;
  content: Blob;
}

export interface TransactionExporter {
  description(): string;
  generate(groups: ReadonlyArray<ReadonlyArray<TransactionWithRelations>>): Promise<ExportArtifact>;
}
