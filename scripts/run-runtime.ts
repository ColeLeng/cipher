import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { AnthropicClient } from "../lib/models/anthropic";
import {
  buildCalendarPromptWithQueryBank,
  buildSessionCipher,
  hasLeak,
  loadLocalEnv,
  readBrandInputs,
  restoreQueries,
  scrubTextWithConfig,
  verifyLeakVectors
} from "../lib/eval/brandEval";
import { decipherResponse } from "../lib/pipeline/decipher";
import { inspectSearchQuery, runApprovedSearch } from "../lib/pipeline/intercept";
import {
  defaultProfilePath,
  buildPreSendReviewMarkdown,
  discoverRuntimeFiles,
  outputSlug,
  readRuntimeProfile,
  runtimeProfileToConfig,
  suggestRuntimeProfile
} from "../lib/runtime/profile";

async function main() {
  const args = process.argv.slice(2);
  const sendApproved = args.includes("--send");
  const positionalArgs = args.filter((arg) => arg !== "--send");
  const inputDirArg = positionalArgs[0];
  const profilePathArg = positionalArgs[1];

  if (!inputDirArg) {
    console.error("Usage: npx tsx scripts/run-runtime.ts <input-dir> [profile-json] [--send]");
    process.exit(1);
  }

  loadLocalEnv();

  const inputDir = resolve(process.cwd(), inputDirArg);
  const files = await discoverRuntimeFiles(inputDir);
  const profilePath = profilePathArg
    ? resolve(process.cwd(), profilePathArg)
    : defaultProfilePath(inputDir);

  if (!profilePathArg) {
    const suggestedProfile = await suggestRuntimeProfile(inputDir);
    await writeFile(profilePath, JSON.stringify(suggestedProfile, null, 2));
    console.log("Local privacy profile suggestion written.");
    console.log(`Review/edit this file, then generate the pre-send review: ${profilePath}`);
    console.log(`npx tsx scripts/run-runtime.ts "${inputDir}" "${profilePath}"`);
    return;
  }

  const profile = await readRuntimeProfile(profilePath);
  const config = runtimeProfileToConfig({ inputDir, files, profile });
  const outputDir = resolve(process.cwd(), "audit/runtime", outputSlug(inputDir, profile));
  await mkdir(outputDir, { recursive: true });

  const inputs = await readBrandInputs(config);
  const cipher = buildSessionCipher(inputs, config);
  await writeFile(
    resolve(outputDir, "pre_send_review.md"),
    buildPreSendReviewMarkdown({ profile, config, inputs })
  );

  await writeFile(resolve(outputDir, "scrubbed_payload.md"), cipher.scrubbedPayload);
  await writeFile(resolve(outputDir, "cipher_map.json"), JSON.stringify(cipher.cipherMap, null, 2));
  await writeFile(resolve(outputDir, "query_map.json"), JSON.stringify(cipher.queryMap, null, 2));
  await writeFile(
    resolve(outputDir, "leak_check_scrubbed_payload.json"),
    JSON.stringify(cipher.checklist, null, 2)
  );

  if (hasLeak(cipher.checklist)) {
    console.error("Privacy gate failed. Nothing was sent to Claude.");
    console.error(JSON.stringify(cipher.checklist, null, 2));
    console.error(`Edit ${profilePath} and rerun.`);
    process.exit(1);
  }

  if (!sendApproved) {
    console.log("Pre-send review written. Nothing was sent to Claude.");
    console.log(resolve(outputDir, "pre_send_review.md"));
    console.log("After approval, run:");
    console.log(`npx tsx scripts/run-runtime.ts "${inputDir}" "${profilePath}" --send`);
    return;
  }

  const scrubbedHeroToolQuery = scrubTextWithConfig(
    config.heroToolQuery,
    config
  );
  const toolReview = await inspectSearchQuery(scrubbedHeroToolQuery, cipher.cipherMap);
  const toolResult = toolReview.blocked
    ? "Search was blocked before execution because it contained protected client details."
    : await runApprovedSearch(toolReview.rewritten);

  await writeFile(
    resolve(outputDir, "tool_interception_demo.json"),
    JSON.stringify({ review: toolReview, result: toolResult }, null, 2)
  );

  const cloud = new AnthropicClient({
    role: "cloud",
    model: process.env.CLOUD_MODEL ?? "claude-sonnet-4-6"
  });
  const response = await cloud.complete(
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
          "Approved search context:",
          toolResult
        ].join("\n")
      }
    ],
    { maxTokens: 6000, temperature: 0.2 }
  );

  const withOriginalQueries = restoreQueries(response.text, cipher.queryMap);
  const finalDeliverable = decipherResponse(withOriginalQueries, cipher.cipherMap);
  const networkLeakCheck = verifyLeakVectors(
    [cipher.scrubbedPayload, toolReview.rewritten, toolResult].join("\n"),
    config
  );

  await writeFile(resolve(outputDir, "response_scrubbed.md"), response.text);
  await writeFile(resolve(outputDir, "final_deliverable.md"), finalDeliverable);
  await writeFile(
    resolve(outputDir, "leak_check_network_payload.json"),
    JSON.stringify(networkLeakCheck, null, 2)
  );

  console.log("Runtime run complete.");
  console.log(`Artifacts written to ${outputDir}`);
  console.log(`Network leak check: ${hasLeak(networkLeakCheck) ? "FAILED" : "PASSED"}`);
  console.log("Final deliverable:");
  console.log(resolve(outputDir, "final_deliverable.md"));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
