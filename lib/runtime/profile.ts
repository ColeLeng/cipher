import { readdir, readFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { OllamaClient } from "@/lib/models/ollama";
import type {
  BrandEvalConfig,
  EntityRule,
  ReplacementRule,
  TextBucketRule
} from "@/lib/eval/brandEval";
import { buildSessionCipher, loadLocalEnv } from "@/lib/eval/brandEval";

export type RuntimeProfile = {
  slug: string;
  displayName: string;
  brandCategory: string;
  deliverable?: string;
  outputRequirements?: string[];
  entities: EntityRule[];
  replacements: ReplacementRule[];
  textBuckets?: Array<{
    pattern: string;
    replacement: string;
    flags?: string;
  }>;
  heroToolQuery?: string;
};

export type RuntimeFiles = {
  gsc: string;
  ga4: string;
  visibility: string;
  brief: string;
};

export async function discoverRuntimeFiles(inputDir: string): Promise<RuntimeFiles> {
  const files = await readdir(inputDir);

  return {
    gsc: requireMatch(files, /01_.*_gsc\.csv$/),
    ga4: requireMatch(files, /02_.*_ga4\.csv$/),
    visibility: requireMatch(files, /03_.*_visibility\.json$/),
    brief: requireMatch(files, /04_.*_brief\.md$/)
  };
}

export async function readRuntimeProfile(path: string): Promise<RuntimeProfile> {
  const parsed = JSON.parse(await readFile(path, "utf8")) as RuntimeProfile;
  const normalized = {
    ...parsed,
    entities: normalizeEntityTokens(parsed.entities),
    textBuckets: normalizeTextBuckets(parsed.textBuckets)
  };
  validateRuntimeProfile(normalized);
  return normalized;
}

export function runtimeProfileToConfig({
  inputDir,
  files,
  profile
}: {
  inputDir: string;
  files: RuntimeFiles;
  profile: RuntimeProfile;
}): BrandEvalConfig {
  return {
    slug: profile.slug,
    displayName: profile.displayName,
    inputDir,
    files: {
      ...files,
      reference: ""
    },
    entities: profile.entities,
    replacements: profile.replacements,
    textBuckets: toTextBucketRules(profile.textBuckets ?? []),
    outputRequirements:
      profile.outputRequirements ?? defaultOutputRequirements(profile.deliverable),
    heroToolQuery: profile.heroToolQuery ?? "BRAND_001 reviews"
  };
}

export async function suggestRuntimeProfile(inputDir: string): Promise<RuntimeProfile> {
  loadLocalEnv();
  const files = await discoverRuntimeFiles(inputDir);
  const sample = await buildLocalSuggestionSample(inputDir, files);
  const ollamaUrl = process.env.OLLAMA_URL;

  if (!ollamaUrl) {
    throw new Error("OLLAMA_URL is required to generate a local profile suggestion.");
  }

  const localModel = new OllamaClient({
    role: "local",
    url: ollamaUrl,
    model: process.env.OLLAMA_MODEL ?? "gemma4:latest"
  });
  const response = await localModel.complete(
    [
      {
        role: "system",
        content: [
          "You are Cipher's local privacy preflight assistant.",
          "You run locally. Your job is to suggest a privacy profile for deterministic scrubbing.",
          "Return only JSON. No markdown fences."
        ].join("\n")
      },
      {
        role: "user",
        content: JSON.stringify(
          {
            task:
              "Suggest sensitive entities for this client folder. Include brand variants, product names, competitors, geographies, proof tokens, certifications, and fingerprinting phrases.",
            output_schema: {
              slug: "lowercase-folder-or-brand-slug",
              displayName: "client display name",
              brandCategory: "generic category phrase for safe search rewrites",
              deliverable: "content calendar or strategy deliverable",
              entities: [
                {
                  token: "BRAND_001",
                  real: "real value",
                  variants: ["all variants and slugs"],
                  label: "brand variants"
                }
              ],
              replacements: [
                {
                  label: "competitors",
                  terms: ["competitor names"],
                  replacement: "category competitors"
                }
              ],
              textBuckets: [
                {
                  pattern: "literal or regex pattern for sensitive numeric/business detail",
                  replacement: "bucketed replacement",
                  flags: "gi"
                }
              ],
              heroToolQuery: "BRAND_001 representative sensitive query"
            },
            local_file_sample: sample
          },
          null,
          2
        )
      }
    ],
    { maxTokens: 4000, temperature: 0 }
  );

  const profile = coerceRuntimeProfile(
    parseProfileJson(response.text),
    sample,
    inputDir
  );
  validateRuntimeProfile(profile);
  return profile;
}

function parseProfileJson(text: string): RuntimeProfile {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return JSON.parse(fenced ? fenced[1] : trimmed) as RuntimeProfile;
}

function validateRuntimeProfile(profile: RuntimeProfile) {
  if (!profile.slug || !profile.displayName || !profile.brandCategory) {
    throw new Error("Runtime profile must include slug, displayName, and brandCategory.");
  }
  if (!Array.isArray(profile.entities) || profile.entities.length === 0) {
    throw new Error("Runtime profile must include at least one entity rule.");
  }
  if (!profile.entities.some((entity) => entity.token === "BRAND_001")) {
    throw new Error("Runtime profile must include a BRAND_001 entity.");
  }
  if (!Array.isArray(profile.replacements)) {
    throw new Error("Runtime profile replacements must be an array.");
  }
}

function coerceRuntimeProfile(
  profile: Partial<RuntimeProfile>,
  sample: Record<string, string>,
  inputDir: string
): RuntimeProfile {
  const inferredBrand = inferBrand(sample) ?? basename(resolve(inputDir));
  const displayName = profile.displayName ?? inferredBrand;
  const slug = profile.slug ?? slugify(displayName);
  const entities = normalizeEntityTokens(
    Array.isArray(profile.entities) ? [...profile.entities] : []
  );

  if (!entities.some((entity) => entity.token === "BRAND_001")) {
    entities.unshift({
      token: "BRAND_001",
      real: displayName,
      variants: [
        displayName,
        displayName.toLowerCase(),
        `${displayName.toLowerCase()}.com`
      ],
      label: "brand variants"
    });
  }

  return {
    slug,
    displayName,
    brandCategory: profile.brandCategory ?? "category brand",
    deliverable: profile.deliverable ?? "content calendar",
    outputRequirements: profile.outputRequirements,
    entities,
    replacements: Array.isArray(profile.replacements) ? profile.replacements : [],
    textBuckets: normalizeTextBuckets(profile.textBuckets),
    heroToolQuery: profile.heroToolQuery ?? "BRAND_001 reviews"
  };
}

function normalizeEntityTokens(entities: EntityRule[]): EntityRule[] {
  const counters: Record<string, number> = {};

  return entities.map((entityRule) => {
    if (entityRule.token === "BRAND_001") {
      return withRealInVariants(entityRule);
    }

    const prefix = tokenPrefixForLabel(entityRule.label);
    counters[prefix] = (counters[prefix] ?? 0) + 1;

    return withRealInVariants({
      ...entityRule,
      token: `${prefix}_${String(counters[prefix]).padStart(3, "0")}`
    });
  });
}

function withRealInVariants(entityRule: EntityRule): EntityRule {
  const variants = new Set(entityRule.variants);
  variants.add(entityRule.real);
  variants.add(entityRule.real.toLowerCase());

  return {
    ...entityRule,
    variants: [...variants]
  };
}

function tokenPrefixForLabel(label: string): string {
  const normalized = label.toLowerCase();
  if (/product|scent|sku|line/.test(normalized)) return "PRODUCT";
  if (/geo|location|origin|region|city/.test(normalized)) return "GEO";
  if (/cert|trust/.test(normalized)) return "CERTIFICATION";
  if (/editorial|proof|partner|press|award/.test(normalized)) {
    return "EDITORIAL_PROOF";
  }
  if (/competitor|peer/.test(normalized)) return "COMPETITOR";
  return "ENTITY";
}

function inferBrand(sample: Record<string, string>): string | null {
  for (const [file, text] of Object.entries(sample)) {
    if (file.endsWith(".json")) {
      try {
        const parsed = JSON.parse(text.replace(/\n\.\.\.TRUNCATED$/, "")) as {
          brand?: unknown;
        };
        if (typeof parsed.brand === "string") {
          return parsed.brand;
        }
      } catch {
        // Fall through to markdown title inference.
      }
    }

    const titleMatch = text.match(/^#\s+Client Brief\s+[—-]\s+(.+)$/m);
    if (titleMatch) {
      return titleMatch[1].trim();
    }
  }

  return null;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function buildLocalSuggestionSample(inputDir: string, files: RuntimeFiles) {
  return {
    [files.gsc]: firstLines(await readFile(join(inputDir, files.gsc), "utf8"), 40),
    [files.ga4]: firstLines(await readFile(join(inputDir, files.ga4), "utf8"), 35),
    [files.visibility]: firstChars(
      await readFile(join(inputDir, files.visibility), "utf8"),
      12000
    ),
    [files.brief]: firstChars(await readFile(join(inputDir, files.brief), "utf8"), 9000)
  };
}

function toTextBucketRules(
  rules: RuntimeProfile["textBuckets"]
): TextBucketRule[] {
  return normalizeTextBuckets(rules).map((rule) => ({
    pattern: new RegExp(rule.pattern, rule.flags ?? "gi"),
    replacement: rule.replacement
  }));
}

function normalizeTextBuckets(
  rules: RuntimeProfile["textBuckets"]
): NonNullable<RuntimeProfile["textBuckets"]> {
  return (rules ?? []).flatMap((rule) => {
    if (isYearBucket(rule.pattern)) return [];
    if (isGenericNumberBucket(rule.pattern)) {
      return [
        {
          ...rule,
          pattern: "\\b\\d+(?:\\.\\d+)?%"
        }
      ];
    }
    if (isLooseHyphenatedWordBucket(rule.pattern, rule.flags)) return [];
    return [rule];
  });
}

function isYearBucket(pattern: string): boolean {
  return /\\d\{4\}/.test(pattern) || /\(\?:(?:19|20)\)/.test(pattern);
}

function isGenericNumberBucket(pattern: string): boolean {
  return /\\d/.test(pattern) && /%\?/.test(pattern);
}

function isLooseHyphenatedWordBucket(pattern: string, flags = ""): boolean {
  return /\[A-Z\]\{2,4\}/.test(pattern) && /\\s\*\s*-/.test(pattern) && flags.includes("i");
}

function defaultOutputRequirements(deliverable = "90-day content calendar") {
  return [
    `Produce a ${deliverable}.`,
    "Use the scrubbed client context and allowed target query bank.",
    "Target queries must be copied from the allowed target query bank.",
    "Respect stated client capacity and constraints from the brief.",
    "Use marketer-readable language.",
    "Include strategic logic, calendar or recommendations, citation-bait elements, and tracking cadence."
  ];
}

function requireMatch(files: string[], pattern: RegExp): string {
  const match = files.find((file) => pattern.test(file));
  if (!match) {
    throw new Error(`Missing required runtime file matching ${pattern}.`);
  }
  return match;
}

function firstLines(text: string, limit: number) {
  return text.split(/\r?\n/).slice(0, limit).join("\n");
}

function firstChars(text: string, limit: number) {
  return text.length > limit ? `${text.slice(0, limit)}\n...TRUNCATED` : text;
}

export function defaultProfilePath(inputDir: string) {
  return resolve(inputDir, "cipher.profile.json");
}

export function outputSlug(inputDir: string, profile?: RuntimeProfile) {
  return profile?.slug ?? basename(resolve(inputDir));
}

export function buildPreSendReviewMarkdown({
  profile,
  config,
  inputs
}: {
  profile: RuntimeProfile;
  config: BrandEvalConfig;
  inputs: {
    gscCsv: string;
    ga4Csv: string;
    visibilityJson: string;
    briefMarkdown: string;
  };
}) {
  const cipher = buildSessionCipher(inputs, config);
  const originalSections = [
    ["GSC", firstLines(inputs.gscCsv, 18)],
    ["GA4", firstLines(inputs.ga4Csv, 16)],
    ["Visibility", firstChars(inputs.visibilityJson, 3500)],
    ["Brief", firstChars(inputs.briefMarkdown, 3500)]
  ];
  const scrubbedSections = splitScrubbedSections(cipher.scrubbedPayload);

  return [
    `# Cipher Pre-Send Review — ${profile.displayName}`,
    "",
    "Review this before sending anything to Claude. The left side is local-only source context; the right side is the exact scrubbed style Claude will see.",
    "",
    "## Sensitive Profile Summary",
    "",
    `- Brand category for safe search rewrites: ${profile.brandCategory}`,
    `- Entities protected: ${profile.entities.length}`,
    `- Replacement groups: ${profile.replacements.length}`,
    "",
    "## Entity Map Preview",
    "",
    "| Token | Real Value | Variants Checked |",
    "|---|---|---|",
    ...profile.entities.map(
      (entityRule) =>
        `| \`${entityRule.token}\` | ${entityRule.real} | ${entityRule.variants.join(", ")} |`
    ),
    "",
    "## Before / After Ciphering Preview",
    "",
    ...originalSections.flatMap(([name, original]) => {
      const scrubbed = scrubbedSections[name.toLowerCase()] ?? "(missing scrubbed section)";
      return [
        `### ${name}`,
        "",
        "**Local original sample, not sent:**",
        "",
        "```text",
        original,
        "```",
        "",
        "**Pre-send scrubbed sample:**",
        "",
        "```text",
        scrubbed,
        "```",
        "",
        "**Changed-line preview:**",
        "",
        ...changedLinePreview(original, scrubbed),
        ""
      ];
    }),
    "## Privacy Gate Result",
    "",
    cipher.checklist.every((result) => result.leaked.length === 0)
      ? "PASS: no configured leak vectors found in the scrubbed payload."
      : "FAIL: configured leak vectors remain in the scrubbed payload.",
    "",
    ...cipher.checklist.map(
      (result) =>
        `- ${result.vectorClass}: ${
          result.leaked.length ? `LEAKED ${result.leaked.join(", ")}` : "clean"
        }`
    )
  ].join("\n");
}

function splitScrubbedSections(payload: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const chunks = payload.split(/\n(?=## )/);

  for (const chunk of chunks) {
    const match = chunk.match(/^## ([^\n]+)\n\n([\s\S]*)$/);
    if (!match) continue;
    sections[match[1].trim().toLowerCase()] = firstLines(match[2].trim(), 40);
  }
  return sections;
}

function changedLinePreview(original: string, scrubbed: string): string[] {
  const originalLines = original.split(/\r?\n/);
  const scrubbedLines = scrubbed.split(/\r?\n/);
  const changedPairs: string[] = [];

  for (let index = 0; index < Math.min(originalLines.length, scrubbedLines.length); index += 1) {
    if (originalLines[index] === scrubbedLines[index]) continue;
    changedPairs.push(
      `- <del>${escapeHtml(originalLines[index])}</del><br><ins>${escapeHtml(
        scrubbedLines[index]
      )}</ins>`
    );
    if (changedPairs.length >= 8) break;
  }

  return changedPairs.length ? changedPairs : ["- No changes in this preview window."];
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
