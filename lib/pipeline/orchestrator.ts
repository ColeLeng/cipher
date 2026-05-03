import type { ModelClient } from "@/lib/models/types";

export type CipherIntent =
  | "gap_analysis"
  | "competitor_benchmark"
  | "content_strategy"
  | "keyword_opportunity";

export type CipherRunInput = {
  rawData: string;
  intent: CipherIntent;
};

export type CipherSummary = Record<string, unknown>;

export type EntityMap = Record<string, string>;

export type ToolRewrite = {
  original: string;
  rewritten: string;
  reason: string;
  risk: "low" | "medium" | "high" | "critical";
  blocked: boolean;
};

export type CipherRunEvent =
  | {
      type: "run_started";
      intent: CipherIntent;
    }
  | {
      type: "cipher_summary_ready";
      summary: CipherSummary;
    }
  | {
      type: "tool_call_reviewed";
      toolName: "web_search";
      rewrite: ToolRewrite;
    }
  | {
      type: "cloud_response_chunk";
      text: string;
    }
  | {
      type: "final_response_ready";
      response: string;
    }
  | {
      type: "run_failed";
      message: string;
    };

export type CipherRoles = {
  local: ModelClient;
  cloud: ModelClient;
};

export async function* runCipherPipeline(
  _input: CipherRunInput,
  _roles: CipherRoles
): AsyncGenerator<CipherRunEvent> {
  throw new Error("runCipherPipeline is not implemented yet.");
}
