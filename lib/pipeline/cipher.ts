import type { ModelClient } from "@/lib/models/types";
import type { CipherIntent, CipherSummary, EntityMap } from "./orchestrator";

export type TransformerCode = string;

export type CipherTransformResult = {
  summary: CipherSummary;
  entityMap: EntityMap;
  transformer: TransformerCode;
};

export async function generateTransformer(
  _rawData: string,
  _intent: CipherIntent,
  _localRole: ModelClient
): Promise<TransformerCode> {
  throw new Error("generateTransformer is not implemented yet.");
}

export async function runTransformer(
  _transformer: TransformerCode,
  _rawData: string
): Promise<CipherTransformResult> {
  throw new Error("runTransformer is not implemented yet.");
}
