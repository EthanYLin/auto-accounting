import type { TransactionWithRelations } from "@/types";

export interface ExportArtifact {
  filename: string;
  mimeType: string;
  extension: string;
  content: Blob;
}

export type ExportSuccess = { ok: true; artifact: ExportArtifact };
export type ExportFailure = { ok: false; message: string };
export type ExportResult = ExportSuccess | ExportFailure;

export interface TransactionExporter {
  description(): string;
  generate(groups: ReadonlyArray<ReadonlyArray<TransactionWithRelations>>): Promise<ExportResult>;
}
