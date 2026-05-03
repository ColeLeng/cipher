import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { AnthropicClient } from "../lib/models/anthropic";

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

    const key = trimmed.slice(0, equalsIndex);
    const value = trimmed.slice(equalsIndex + 1);
    process.env[key] = value;
  }
}

async function smoke(model: string, role: "local" | "cloud") {
  const client = new AnthropicClient({ role, model });
  const response = await client.complete(
    [{ role: "user", content: "say hi" }],
    { maxTokens: 32, temperature: 0 }
  );

  if (!response.text.trim()) {
    throw new Error(`${model} returned an empty response.`);
  }

  console.log(`${model}: ${response.text.trim()}`);
}

async function main() {
  loadLocalEnv();

  await smoke("claude-haiku-4-5-20251001", "local");
  await smoke("claude-sonnet-4-6", "cloud");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
