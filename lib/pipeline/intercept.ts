import type { ModelClient } from "@/lib/models/types";
import type { EntityMap, ToolRewrite } from "./orchestrator";

export type ToolRiskReview = ToolRewrite;

export async function inspectSearchQuery(
  _query: string,
  _entityMap: EntityMap,
  _localRole: ModelClient
): Promise<ToolRiskReview> {
  throw new Error("inspectSearchQuery is not implemented yet.");
}

export async function runApprovedSearch(_query: string): Promise<string> {
  throw new Error("runApprovedSearch is not implemented yet.");
}
