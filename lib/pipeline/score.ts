import type { ModelClient } from "@/lib/models/types";

export type SensitivityScore = {
  level: "low" | "medium" | "high";
  reason: string;
  likelySensitiveFields: string[];
};

export async function scoreSensitivity(
  _rawData: string,
  _localRole: ModelClient
): Promise<SensitivityScore> {
  throw new Error("scoreSensitivity is not implemented yet.");
}
