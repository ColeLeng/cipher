import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { AnthropicClient } from "../lib/models/anthropic";
import { OllamaClient } from "../lib/models/ollama";
import type { ModelClient } from "../lib/models/types";
import { decipherResponse } from "../lib/pipeline/decipher";
import { inspectSearchQuery, runApprovedSearch } from "../lib/pipeline/intercept";
import {
  brandConfigs,
  buildCalendarPromptWithQueryBank,
  buildSessionCipher,
  hasLeak,
  loadLocalEnv,
  readBrandInputs,
  readReferenceOutput,
  restoreQueries,
  scrubReferenceOutput,
  verifyLeakVectors
} from "../lib/eval/brandEval";

const LOGIC_VERIFIER_MODEL = "claude-sonnet-4-6";
const DEFAULT_OLLAMA_MODEL = "gemma4:latest";

async function main() {
  const slug = process.argv[2];
  const config = slug ? brandConfigs[slug] : undefined;

  if (!config) {
    console.error(
      `Usage: npx tsx scripts/run-brand-pass-b.ts <${Object.keys(brandConfigs).join("|")}>`
    );
    process.exit(1);
  }

  loadLocalEnv();

  const outputDir = resolve(process.cwd(), "audit", config.slug);
  await mkdir(outputDir, { recursive: true });

  const inputs = await readBrandInputs(config);
  const cipher = buildSessionCipher(inputs, config);

  await writeFile(resolve(outputDir, "scrubbed_payload.md"), cipher.scrubbedPayload);
  await writeFile(
    resolve(outputDir, "cipher_map.json"),
    JSON.stringify(cipher.cipherMap, null, 2)
  );
  await writeFile(
    resolve(outputDir, "query_map.json"),
    JSON.stringify(cipher.queryMap, null, 2)
  );
  await writeFile(
    resolve(outputDir, "leak_check_scrubbed_payload.json"),
    JSON.stringify(cipher.checklist, null, 2)
  );

  if (hasLeak(cipher.checklist)) {
    console.error(`${config.displayName} scrubbed payload still contains leak vectors.`);
    console.error(JSON.stringify(cipher.checklist, null, 2));
    process.exit(1);
  }

  const toolReview = await inspectSearchQuery(config.heroToolQuery, cipher.cipherMap);
  const toolResult = toolReview.blocked
    ? "Blocked before web search."
    : await runApprovedSearch(toolReview.rewritten);

  await writeFile(
    resolve(outputDir, "tool_interception_demo.json"),
    JSON.stringify({ review: toolReview, result: toolResult }, null, 2)
  );

  const cloud = new AnthropicClient({
    role: "cloud",
    model: "claude-sonnet-4-6"
  });
  const calendarScrubbed = await cloud.complete(
    [
      {
        role: "user",
        content: [
          buildCalendarPromptWithQueryBank(
            config,
            cipher.scrubbedPayload,
            Object.keys(cipher.queryMap)
          ),
          "",
          "Approved mocked search context:",
          toolResult
        ].join("\n")
      }
    ],
    { maxTokens: 6000, temperature: 0.2 }
  );

  const reference = await readReferenceOutput(config);
  const referenceScrubbed = scrubReferenceOutput(reference, config);
  const logicVerification = await verifyUtilityWithLogicModel({
    brand: config.displayName,
    generatedScrubbed: calendarScrubbed.text,
    referenceScrubbed
  });

  const calendarWithOriginalQueries = restoreQueries(
    calendarScrubbed.text,
    cipher.queryMap
  );
  const calendarFinal = decipherResponse(
    calendarWithOriginalQueries,
    cipher.cipherMap
  );
  const networkLeakCheck = verifyLeakVectors(
    [cipher.scrubbedPayload, toolReview.rewritten, toolResult].join("\n"),
    config
  );

  await writeFile(resolve(outputDir, "calendar_scrubbed.md"), calendarScrubbed.text);
  await writeFile(resolve(outputDir, "reference_scrubbed.md"), referenceScrubbed);
  await writeFile(resolve(outputDir, "logic_verification.json"), logicVerification);
  await writeFile(resolve(outputDir, "calendar_final.md"), calendarFinal);
  await writeFile(
    resolve(outputDir, "leak_check_network_payload.json"),
    JSON.stringify(networkLeakCheck, null, 2)
  );

  console.log(`${config.displayName} Pass B complete.`);
  console.log(`Artifacts written to ${outputDir}`);
  console.log(
    `Network leak check: ${hasLeak(networkLeakCheck) ? "FAILED" : "PASSED"}`
  );
  console.log("Tool interception demo:");
  console.log(JSON.stringify(toolReview, null, 2));
}

async function verifyUtilityWithLogicModel({
  brand,
  generatedScrubbed,
  referenceScrubbed
}: {
  brand: string;
  generatedScrubbed: string;
  referenceScrubbed: string;
}) {
  const logicModel = createLogicVerifier();

  const response = await logicModel.complete(
    [
      {
        role: "system",
        content: [
          "You are Cipher's logic verification model.",
          "You evaluate utility only. You see scrubbed outputs, not raw client data.",
          "Return only valid JSON. Do not include markdown fences."
        ].join("\n")
      },
      {
        role: "user",
        content: JSON.stringify(
          {
            brand,
            task:
              "Compare generated_scrubbed_calendar to reference_scrubbed_calendar.",
            scoring:
              "Judge whether generated is at least 80% as useful as reference for an AEO/SEO consultant.",
            criteria: [
              "same deliverable shape and cadence",
              "similar strategic tracks",
              "target queries grounded in the source query set",
              "major client constraints respected",
              "recommendations are specific enough to ship"
            ],
            output_schema: {
              verdict: "yes | no",
              estimated_utility_percent: "number",
              main_reason: "string",
              strengths: ["string"],
              gaps: ["string"],
              human_review_question: "string"
            },
            generated_scrubbed_calendar: generatedScrubbed,
            reference_scrubbed_calendar: referenceScrubbed
          },
          null,
          2
        )
      }
    ],
    { maxTokens: 1400, temperature: 0 }
  );

  return response.text;
}

function createLogicVerifier(): ModelClient {
  const provider = process.env.LOGIC_VERIFIER_PROVIDER ?? "ollama";

  if (provider === "ollama") {
    const url = process.env.OLLAMA_URL;
    if (!url) {
      throw new Error(
        "LOGIC_VERIFIER_PROVIDER=ollama requires OLLAMA_URL in .env.local."
      );
    }

    return new OllamaClient({
      role: "local",
      url,
      model: process.env.OLLAMA_MODEL ?? DEFAULT_OLLAMA_MODEL
    });
  }

  return new AnthropicClient({
    role: "local",
    model: process.env.LOGIC_VERIFIER_MODEL ?? LOGIC_VERIFIER_MODEL
  });
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
