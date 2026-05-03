import type { EntityMap, ToolRewrite } from "./orchestrator";

export type ToolRiskReview = ToolRewrite;

export async function inspectSearchQuery(
  query: string,
  entityMap: EntityMap
): Promise<ToolRiskReview> {
  const lowered = query.toLowerCase();
  const leakedRealValues = Object.values(entityMap).filter((value) =>
    lowered.includes(value.toLowerCase())
  );
  const leakedPlaceholders = Object.keys(entityMap).filter((placeholder) =>
    lowered.includes(placeholder.toLowerCase())
  );

  if (leakedRealValues.length > 0) {
    return {
      original: query,
      rewritten: "",
      reason: `Blocked real stripped entities: ${leakedRealValues.join(", ")}`,
      risk: "critical",
      blocked: true
    };
  }

  if (leakedPlaceholders.length > 0) {
    return {
      original: query,
      rewritten: rewritePlaceholderQuery(query, leakedPlaceholders, entityMap),
      reason: `Rewrote placeholder query before web search: ${leakedPlaceholders.join(", ")}`,
      risk: "high",
      blocked: false
    };
  }

  if (narrowsToSingleEntity(query)) {
    return {
      original: query,
      rewritten: `${query} category comparison guide`,
      reason: "Query looked narrowly identifiable, so it was broadened.",
      risk: "medium",
      blocked: false
    };
  }

  return {
    original: query,
    rewritten: query,
    reason: "No stripped entities detected.",
    risk: "low",
    blocked: false
  };
}

export async function runApprovedSearch(query: string): Promise<string> {
  return [
    `Mocked search results for: ${query}`,
    "Result themes: buyer trust, comparison pages, category authority, and review-led content are commonly cited in LLM answers for this retail category."
  ].join("\n");
}

function rewritePlaceholderQuery(
  query: string,
  placeholders: string[],
  entityMap: EntityMap
): string {
  return placeholders.reduce((current, placeholder) => {
    if (placeholder === "BRAND_001") {
      return current.replaceAll(placeholder, brandCategory(entityMap[placeholder]));
    }
    if (placeholder.startsWith("PRODUCT_") || placeholder.startsWith("SCENT_")) {
      return current.replaceAll(placeholder, "representative product line");
    }
    if (placeholder.startsWith("EDITORIAL_PROOF_")) {
      return current.replaceAll(placeholder, "third-party editorial proof");
    }
    if (placeholder.startsWith("CERTIFICATION_")) {
      return current.replaceAll(placeholder, "third-party certification");
    }
    if (placeholder === "CATEGORY_COMPETITORS") {
      return current.replaceAll(placeholder, "category competitors");
    }
    if (placeholder === "REGIONAL_MANUFACTURING_HUB") {
      return current.replaceAll(placeholder, "regional manufacturing hub");
    }
    return current.replaceAll(placeholder, "category entity");
  }, query);
}

function brandCategory(realValue: string | undefined): string {
  if (realValue?.toLowerCase() === "lumenfield") {
    return "sustainable home fragrance brand";
  }
  if (realValue?.toLowerCase() === "velora") {
    return "DTC formalwear brand";
  }
  return "category brand";
}

function narrowsToSingleEntity(query: string): boolean {
  return /\b(review|reviews|legit|scam|return policy|where is|located)\b/i.test(
    query
  );
}
