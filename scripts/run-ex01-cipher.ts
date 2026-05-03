import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { AnthropicClient } from "../lib/models/anthropic";
import { generateTransformer, runTransformer } from "../lib/pipeline/cipher";

type EvalExample = {
  id: string;
  raw_data: string;
};

function loadLocalEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const contents = readFileSync(envPath, "utf8");

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) {
      continue;
    }

    process.env[trimmed.slice(0, equalsIndex)] = trimmed.slice(equalsIndex + 1);
  }
}

function loadExample(id: string): EvalExample {
  const examplesPath = resolve(process.cwd(), "eval/examples.jsonl");
  const lines = readFileSync(examplesPath, "utf8").trim().split(/\r?\n/);

  for (const line of lines) {
    const parsed = JSON.parse(line) as EvalExample;
    if (parsed.id === id) {
      return parsed;
    }
  }

  throw new Error(`Could not find example ${id}.`);
}

async function main() {
  loadLocalEnv();

  const example = loadExample("ex01_dtc_apparel_brand_search");
  const localRole = new AnthropicClient({
    role: "local",
    model: "claude-haiku-4-5-20251001"
  });

  const generated = await generateTransformer(
    example.raw_data,
    "gap_analysis",
    localRole
  );
  const transformed = await runTransformer(
    generated.transformer_code,
    example.raw_data
  );

  console.log("TRANSFORMER_CODE_START");
  console.log(generated.transformer_code);
  console.log("TRANSFORMER_CODE_END");
  console.log("SUMMARY_START");
  console.log(JSON.stringify(transformed.summary, null, 2));
  console.log("SUMMARY_END");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
