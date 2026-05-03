import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { AnthropicClient } from "../lib/models/anthropic";
import { decipherResponse } from "../lib/pipeline/decipher";
import { inspectSearchQuery, runApprovedSearch } from "../lib/pipeline/intercept";
import {
  buildSessionCipher,
  hasLeak,
  readSessionInputs,
  verifyLeakVectors
} from "../lib/pipeline/sessionCipher";

function loadLocalEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const contents = readFileSync(envPath, "utf8");

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) continue;

    process.env[trimmed.slice(0, equalsIndex)] = trimmed.slice(equalsIndex + 1);
  }
}

function veloraInputDir() {
  const nested = resolve(process.cwd(), "eval/velora");
  return existsSync(nested) ? nested : resolve(process.cwd(), "eval");
}

function buildCalendarPrompt(scrubbedPayload: string) {
  return [
    "You are an AEO/SEO content strategist.",
    "Use the scrubbed client context to produce a 90-day content calendar.",
    "The client identity and sensitive details have been replaced with placeholder tokens.",
    "Do not try to infer the real brand name. Use the placeholders exactly when needed.",
    "",
    "Hard output requirements:",
    "- Cover the full engagement period: May 1 through July 31, 2026.",
    "- Include exactly 13 weeks.",
    "- Include exactly 24 content pieces total.",
    "- Use 2 pieces per week, except combine or lighten two weeks if needed to hit exactly 24 pieces.",
    "- Match this compact structure: Strategic logic, Calendar, Track distribution, Citation-bait elements, Tracking and review cadence.",
    "- In the Calendar section, use weekly markdown tables with columns: Date, Title, Track, Target Query, Format.",
    "- Do not write detailed structural briefs for each piece.",
    "- Do not create Friday supporting units.",
    "- Keep the cadence realistic for a small marketing team: 2 long-form pieces per week.",
    "- Prefer strategic equivalence to verbosity.",
    "",
    scrubbedPayload
  ].join("\n");
}

async function main() {
  loadLocalEnv();

  const outputDir = resolve(process.cwd(), "audit/velora");
  await mkdir(outputDir, { recursive: true });

  const inputs = await readSessionInputs(veloraInputDir());
  const cipher = buildSessionCipher(inputs);
  const initialLeakCheck = cipher.checklist;

  await writeFile(
    resolve(outputDir, "scrubbed_payload.md"),
    cipher.scrubbedPayload
  );
  await writeFile(
    resolve(outputDir, "cipher_map.json"),
    JSON.stringify(cipher.cipherMap, null, 2)
  );
  await writeFile(
    resolve(outputDir, "leak_check_scrubbed_payload.json"),
    JSON.stringify(initialLeakCheck, null, 2)
  );

  if (hasLeak(initialLeakCheck)) {
    console.error("Scrubbed payload still contains leak vectors.");
    console.error(JSON.stringify(initialLeakCheck, null, 2));
    process.exit(1);
  }

  const cloud = new AnthropicClient({
    role: "cloud",
    model: "claude-sonnet-4-6"
  });

  const heroToolQuery = "BRAND_001 reviews shipping lead time";
  const toolReview = await inspectSearchQuery(heroToolQuery, cipher.cipherMap);
  const toolResult = toolReview.blocked
    ? "Blocked before web search."
    : await runApprovedSearch(toolReview.rewritten);

  await writeFile(
    resolve(outputDir, "tool_interception_demo.json"),
    JSON.stringify({ review: toolReview, result: toolResult }, null, 2)
  );

  const calendarScrubbed = await cloud.complete(
    [
      {
        role: "user",
        content: [
          buildCalendarPrompt(cipher.scrubbedPayload),
          "",
          "Approved mocked search context:",
          toolResult
        ].join("\n")
      }
    ],
    { maxTokens: 6000, temperature: 0.2 }
  );

  const calendarFinal = decipherResponse(calendarScrubbed.text, cipher.cipherMap);
  const networkLeakCheck = verifyLeakVectors(
    [cipher.scrubbedPayload, toolReview.rewritten, toolResult].join("\n")
  );

  await writeFile(
    resolve(outputDir, "calendar_scrubbed.md"),
    calendarScrubbed.text
  );
  await writeFile(resolve(outputDir, "calendar_final.md"), calendarFinal);
  await writeFile(
    resolve(outputDir, "leak_check_network_payload.json"),
    JSON.stringify(networkLeakCheck, null, 2)
  );

  console.log("Pass B complete.");
  console.log(`Artifacts written to ${outputDir}`);
  console.log(
    `Network leak check: ${hasLeak(networkLeakCheck) ? "FAILED" : "PASSED"}`
  );
  console.log("Tool interception demo:");
  console.log(JSON.stringify(toolReview, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
