import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { ModelClient } from "@/lib/models/types";
import type { CipherIntent, CipherSummary, EntityMap } from "./orchestrator";

export type TransformerCode = string;

const ALLOWED_IMPORTS = new Set([
  "re",
  "collections",
  "statistics",
  "math",
  "json",
  "itertools",
  "functools"
]);

export type CipherTransformResult = {
  summary: CipherSummary;
  entityMap: EntityMap;
  transformer: TransformerCode;
};

export type GeneratedTransformer = {
  transformer_code: TransformerCode;
  entity_map: EntityMap;
  signal_preserved: string[];
  signal_stripped: string[];
  rationale: string;
};

export async function generateTransformer(
  rawData: string,
  intent: CipherIntent,
  localRole: ModelClient
): Promise<GeneratedTransformer> {
  const systemPrompt = await readFile(
    resolve(process.cwd(), "prompts/cipher_codegen.md"),
    "utf8"
  );
  const dataSample = firstRows(rawData, 50);

  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const response = await localRole.complete(
      [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: JSON.stringify(
            {
              intent,
              data_sample: dataSample,
              output_contract: {
                entity_map:
                  "Return placeholder token to real string, e.g. { BRAND_1: 'real brand' }. This overrides any conflicting examples.",
                transformer_code:
                  "Python code defining transform(rows). Only allowed imports: re, collections, statistics, math, json, itertools, functools."
              },
              retry_instruction:
                attempt === 1
                  ? undefined
                  : "Your previous response failed validation. Return only valid JSON with the required fields and allowed imports."
            },
            null,
            2
          )
        }
      ],
      { maxTokens: 3000, temperature: 0 }
    );

    try {
      const parsed = parseGeneratedTransformer(response.text);
      validateTransformerImports(parsed.transformer_code);
      return parsed;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `LocalRole returned invalid transformer JSON: ${errorMessage(lastError)}`
  );
}

export async function runTransformer(
  transformer: TransformerCode,
  rawData: string
): Promise<CipherTransformResult> {
  const result = await runSandbox({ transformer, rawData });

  return {
    summary: result.summary,
    entityMap: result.entity_map,
    transformer
  };
}

function firstRows(rawData: string, limit: number): string {
  const rows = rawData.trim().split(/\r?\n/);
  return rows.slice(0, limit + 1).join("\n");
}

function parseGeneratedTransformer(text: string): GeneratedTransformer {
  const jsonText = stripJsonFences(text);
  const parsed: unknown = JSON.parse(jsonText);

  if (!isRecord(parsed)) {
    throw new Error("Transformer response must be a JSON object.");
  }

  const transformerCode = parsed.transformer_code;
  const entityMap = parsed.entity_map;
  const signalPreserved = parsed.signal_preserved;
  const signalStripped = parsed.signal_stripped;
  const rationale = parsed.rationale;

  if (typeof transformerCode !== "string" || !transformerCode.includes("def transform")) {
    throw new Error("Missing transformer_code with transform function.");
  }
  if (!isStringRecord(entityMap)) {
    throw new Error("Missing entity_map object.");
  }
  if (!isStringArray(signalPreserved)) {
    throw new Error("Missing signal_preserved string array.");
  }
  if (!isStringArray(signalStripped)) {
    throw new Error("Missing signal_stripped string array.");
  }
  if (typeof rationale !== "string") {
    throw new Error("Missing rationale string.");
  }

  const normalizedEntityMap = normalizeEntityMap(entityMap);
  const transformerWithEntityMap = `ENTITY_MAP = ${JSON.stringify(
    normalizedEntityMap,
    null,
    2
  )}\n\n${transformerCode}`;

  return {
    transformer_code: transformerWithEntityMap,
    entity_map: normalizedEntityMap,
    signal_preserved: signalPreserved,
    signal_stripped: signalStripped,
    rationale
  };
}

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function normalizeEntityMap(entityMap: EntityMap): EntityMap {
  const entries = Object.entries(entityMap);
  const keysLookLikeTokens = entries.filter(([key]) => looksLikeToken(key)).length;
  const valuesLookLikeTokens = entries.filter(([, value]) => looksLikeToken(value))
    .length;

  if (valuesLookLikeTokens > keysLookLikeTokens) {
    return Object.fromEntries(entries.map(([real, token]) => [token, real]));
  }

  return entityMap;
}

function looksLikeToken(value: string): boolean {
  return /^[A-Z][A-Z0-9_]{2,}$/.test(value);
}

export function validateTransformerImports(transformerCode: string) {
  const importPatterns = [
    /^\s*import\s+([A-Za-z0-9_,\s.]+)/gm,
    /^\s*from\s+([A-Za-z0-9_.]+)\s+import\s+/gm
  ];

  for (const pattern of importPatterns) {
    for (const match of transformerCode.matchAll(pattern)) {
      const imports =
        pattern.source.startsWith("^\\s*import")
          ? match[1].split(",").map((part) => part.trim().split(/\s+/)[0])
          : [match[1].split(".")[0]];

      for (const importName of imports) {
        if (importName && !ALLOWED_IMPORTS.has(importName)) {
          throw new Error(`Disallowed import detected: ${importName}`);
        }
      }
    }
  }
}

type SandboxPayload = {
  transformer: string;
  rawData: string;
};

type SandboxResult = {
  summary: CipherSummary;
  entity_map: EntityMap;
};

async function runSandbox(payload: SandboxPayload): Promise<SandboxResult> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn("python3", [resolve(process.cwd(), "python/sandbox.py")], {
      stdio: ["pipe", "pipe", "pipe"]
    });
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Python transformer timed out after 5 seconds."));
    }, 5000);

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);

      let parsed: unknown;
      try {
        parsed = JSON.parse(stdout);
      } catch {
        reject(
          new Error(
            `Python transformer returned invalid JSON. stderr: ${stderr.trim()}`
          )
        );
        return;
      }

      if (!isRecord(parsed)) {
        reject(new Error("Python transformer output must be a JSON object."));
        return;
      }
      if (typeof parsed.error === "string") {
        reject(new Error(parsed.error));
        return;
      }
      if (code !== 0) {
        reject(new Error(`Python transformer exited ${code}: ${stderr.trim()}`));
        return;
      }
      if (!isRecord(parsed.summary) || !isStringRecord(parsed.entity_map)) {
        reject(
          new Error("Python transformer must return { summary, entity_map }.")
        );
        return;
      }

      resolvePromise({
        summary: parsed.summary,
        entity_map: parsed.entity_map
      });
    });

    child.stdin.end(
      JSON.stringify({
        transformer: payload.transformer,
        raw_data: payload.rawData
      })
    );
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    isRecord(value) &&
    Object.values(value).every((entry) => typeof entry === "string")
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
