import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { EntityMap } from "@/lib/pipeline/orchestrator";

export type EvalFiles = {
  gsc: string;
  ga4: string;
  visibility: string;
  brief: string;
  reference: string;
};

export type EntityRule = {
  token: string;
  real: string;
  variants: string[];
  label: string;
};

export type ReplacementRule = {
  label: string;
  terms: string[];
  replacement: string;
};

export type TextBucketRule = {
  pattern: RegExp;
  replacement: string;
};

export type BrandEvalConfig = {
  slug: string;
  displayName: string;
  inputDir: string;
  files: EvalFiles;
  entities: EntityRule[];
  replacements: ReplacementRule[];
  textBuckets: TextBucketRule[];
  outputRequirements: string[];
  heroToolQuery: string;
};

export type SessionInputFiles = {
  gscCsv: string;
  ga4Csv: string;
  visibilityJson: string;
  briefMarkdown: string;
};

export type LeakChecklistResult = {
  vectorClass: string;
  checked: string[];
  leaked: string[];
};

export type SessionCipherResult = {
  scrubbedPayload: string;
  cipherMap: EntityMap;
  queryMap: Record<string, string>;
  checklist: LeakChecklistResult[];
};

export const brandConfigs: Record<string, BrandEvalConfig> = {
  velora: {
    slug: "velora",
    displayName: "Velora",
    inputDir: resolve(process.cwd(), existsSync("eval/velora") ? "eval/velora" : "eval"),
    files: {
      gsc: "01_velora_gsc.csv",
      ga4: "02_velora_ga4.csv",
      visibility: "03_velora_visibility.json",
      brief: "04_velora_brief.md",
      reference: "05_velora_content_calendar.md"
    },
    entities: [
      entity("BRAND_001", "Velora", [
        "veloradresses.com",
        "veloradress",
        "velora.com",
        "velora.de",
        "velora.fr",
        "velora dress",
        "velora kleider",
        "velora avis",
        "velora rücksendung",
        "velora india",
        "velora"
      ], "brand variants"),
      entity("PRODUCT_001", "Harper Sky", ["Harper Sky", "harper-sky", "harper sky", "harper"], "product names"),
      entity("PRODUCT_002", "Cathy", ["Cathy", "cathy"], "product names"),
      entity("PRODUCT_003", "Aubrey", ["Aubrey", "aubrey"], "product names"),
      entity("PRODUCT_004", "Sienna", ["Sienna", "sienna"], "product names"),
      entity("PRODUCT_005", "Marlowe", ["Marlowe", "marlowe"], "product names"),
      entity("PRODUCT_006", "Quinn", ["Quinn", "quinn"], "product names"),
      entity("PRODUCT_007", "Finley", ["Finley", "finley"], "product names"),
      entity("REGIONAL_MANUFACTURING_HUB", "Istanbul, Turkey", ["Istanbul", "Turkey", "Turkish"], "geography")
    ],
    replacements: [
      {
        label: "competitors",
        terms: [
          "Azazie",
          "JJ's House",
          "BHLDN",
          "Lulus",
          "Birdy Grey",
          "Dessy",
          "Revelry",
          "Floravere",
          "Anomalie",
          "Sherri Hill",
          "Promgirl",
          "Macy's",
          "Nordstrom",
          "David's Bridal",
          "Pronovias",
          "Atelier Pronovias"
        ],
        replacement: "category competitors"
      }
    ],
    textBuckets: [
      { pattern: /founded in 2019/gi, replacement: "founded in the late 2010s" },
      { pattern: /\$8M–\$12M range/gi, replacement: "mid eight-figure revenue range" },
      { pattern: /approximately 45 people/gi, replacement: "roughly 40-60 people" },
      { pattern: /marketing team of 4/gi, replacement: "small marketing team" },
      { pattern: /US \(about 55% of revenue\)/gi, replacement: "US (majority revenue share)" },
      { pattern: /Germany \(15%\)/gi, replacement: "Germany (meaningful minority share)" },
      { pattern: /France \(8%\)/gi, replacement: "France (single-digit share)" },
      { pattern: /India \(7%\)/gi, replacement: "India (single-digit share)" },
      { pattern: /9\.2%/g, replacement: "high single-digit percentage" },
      { pattern: /18\.4%/g, replacement: "high teens percentage" },
      { pattern: /25%/g, replacement: "mid-twenties percentage" },
      { pattern: /60%\+/g, replacement: "majority of the time" },
      { pattern: /2\.4x/g, replacement: "roughly two-to-three-times" }
    ],
    outputRequirements: [
      "Cover the full engagement period: May 1 through July 31, 2026.",
      "Include exactly 13 weeks.",
      "Include exactly 24 content pieces total.",
      "Use 2 pieces per week, except combine or lighten two weeks if needed to hit exactly 24 pieces.",
      "Match this compact structure: Strategic logic, Calendar, Track distribution, Citation-bait elements, Tracking and review cadence.",
      "In the Calendar section, use weekly markdown tables with columns: Date, Title, Track, Target Query, Format.",
      "Do not write detailed structural briefs for each piece.",
      "Do not create Friday supporting units.",
      "Keep the cadence realistic for a small marketing team: 2 long-form pieces per week.",
      "Prefer strategic equivalence to verbosity."
    ],
    heroToolQuery: "BRAND_001 reviews shipping lead time"
  },
  lumenfield: {
    slug: "lumenfield",
    displayName: "Lumenfield",
    inputDir: resolve(process.cwd(), "eval/lumenfield"),
    files: {
      gsc: "01_lumenfield_gsc.csv",
      ga4: "02_lumenfield_ga4.csv",
      visibility: "03_lumenfield_visibility.json",
      brief: "04_lumenfield_brief.md",
      reference: "05_lumenfield_content_calendar.md"
    },
    entities: [
      entity("BRAND_001", "Lumenfield", ["lumenfield.com", "Lumenfield", "lumenfield"], "brand variants"),
      entity("SCENT_001", "Cedarwood Bergamot", ["Cedarwood Bergamot Candle", "Cedarwood Bergamot", "cedarwood-bergamot", "cedarwood bergamot"], "product / scent names"),
      entity("SCENT_002", "Fig Oak", ["Fig Oak Candle", "Fig Oak", "fig-oak", "fig and oak"], "product / scent names"),
      entity("SCENT_003", "Linen Sage", ["Linen Sage", "linen-sage", "linen sage"], "product / scent names"),
      entity("SCENT_004", "Sandalwood Vetiver", ["Sandalwood Vetiver", "sandalwood-vetiver", "sandalwood vetiver"], "product / scent names"),
      entity("REGIONAL_CREATIVE_HUB", "Portland, Oregon", ["Portland, Oregon", "Portland", "Oregon"], "geography"),
      entity("CERTIFICATION_001", "B-Corp", ["B-Corp", "B Corp", "benefit corporation"], "certifications"),
      entity("EDITORIAL_PROOF_001", "1 Hotels", ["1 Hotels", "1 hotels"], "editorial / partner proof"),
      entity("EDITORIAL_PROOF_002", "Architectural Digest", ["Architectural Digest", "architectural-digest"], "editorial / partner proof"),
      entity("EDITORIAL_PROOF_003", "Wirecutter", ["Wirecutter", "wirecutter"], "editorial / partner proof"),
      entity("EDITORIAL_PROOF_004", "Rejuvenation", ["Rejuvenation", "rejuvenation"], "editorial / partner proof")
    ],
    replacements: [
      {
        label: "competitors",
        terms: [
          "Grow Fragrance",
          "Boy Smells",
          "P.F. Candle Co.",
          "Otherland",
          "Brooklyn Candle Studio",
          "Apotheke",
          "Maison Louis Marie",
          "Homecourt",
          "Nette",
          "Heretic",
          "Keap",
          "Le Labo",
          "Diptyque",
          "Yankee Candle",
          "Pendleton Wool"
        ],
        replacement: "category competitors"
      },
      {
        label: "adversarial URL details",
        terms: ["co-op-portland-makers"],
        replacement: "regional-maker-community"
      }
    ],
    textBuckets: [
      { pattern: /founded in 2020/gi, replacement: "founded in the early 2020s" },
      { pattern: /\$4M–\$7M range/gi, replacement: "low-to-mid seven-figure revenue range" },
      { pattern: /18 people/gi, replacement: "small team under 25 people" },
      { pattern: /4-person founding team/gi, replacement: "small founding team" },
      { pattern: /62% of revenue/gi, replacement: "majority revenue share" },
      { pattern: /28%/g, replacement: "meaningful minority share" },
      { pattern: /10%/g, replacement: "small but growing share" },
      { pattern: /7\.1%/g, replacement: "high single-digit percentage" },
      { pattern: /4\.1%/g, replacement: "low single-digit percentage" },
      { pattern: /18%/g, replacement: "high teens percentage" },
      { pattern: /4 to 8 times/gi, replacement: "several times" },
      { pattern: /2\.1x/g, replacement: "roughly two-times" },
      { pattern: /3\.4x/g, replacement: "roughly three-to-four-times" },
      { pattern: /12 to 18 months/gi, replacement: "roughly one-to-two years" }
    ],
    outputRequirements: [
      "Cover the full engagement period: May 1 through July 31, 2026.",
      "Organize the calendar by month, not by week.",
      "Include exactly 12 content pieces total.",
      "Use 4 long-form pieces per month.",
      "Match this compact structure: Strategic logic, Calendar, Track distribution, Citation-bait elements, Tracking and review cadence, Capacity notes.",
      "In the Calendar section, use monthly markdown tables with columns: Date, Title, Track, Target Query, Format.",
      "Target Query may contain one or multiple queries, but every query must be copied exactly from the allowed target query bank.",
      "Do not invent new target query wording, even if it sounds strategically better.",
      "Respect the part-time contractor capacity constraint.",
      "Do not recommend direct competitor naming.",
      "Preserve the idea of editorial-to-citation conversion using placeholder proof tokens where needed.",
      "Prefer strategic equivalence to verbosity."
    ],
    heroToolQuery: "BRAND_001 EDITORIAL_PROOF_003 SCENT_001 candle"
  }
};

export async function readBrandInputs(config: BrandEvalConfig): Promise<SessionInputFiles> {
  return {
    gscCsv: await readFile(join(config.inputDir, config.files.gsc), "utf8"),
    ga4Csv: await readFile(join(config.inputDir, config.files.ga4), "utf8"),
    visibilityJson: await readFile(join(config.inputDir, config.files.visibility), "utf8"),
    briefMarkdown: await readFile(join(config.inputDir, config.files.brief), "utf8")
  };
}

export async function readReferenceOutput(config: BrandEvalConfig): Promise<string> {
  return readFile(join(config.inputDir, config.files.reference), "utf8");
}

export function scrubReferenceOutput(
  referenceMarkdown: string,
  config: BrandEvalConfig
): string {
  return scrubMarkdown(referenceMarkdown, config);
}

export function scrubTextWithConfig(text: string, config: BrandEvalConfig): string {
  return scrubText(text, config);
}

export function buildSessionCipher(
  inputs: SessionInputFiles,
  config: BrandEvalConfig
): SessionCipherResult {
  const cipherMap = Object.fromEntries(
    config.entities.map((rule) => [rule.token, rule.real])
  );
  const queryMap = buildQueryMap(inputs, config);
  const scrubbedPayload = [
    section("gsc", scrubCsv(inputs.gscCsv, config)),
    section("ga4", scrubCsv(inputs.ga4Csv, config)),
    section("visibility", scrubJson(inputs.visibilityJson, config)),
    section("brief", scrubMarkdown(inputs.briefMarkdown, config))
  ].join("\n\n");

  return {
    scrubbedPayload,
    cipherMap,
    queryMap,
    checklist: verifyLeakVectors(scrubbedPayload, config)
  };
}

export function verifyLeakVectors(
  payload: string,
  config: BrandEvalConfig
): LeakChecklistResult[] {
  const entityGroups = groupEntityLeakTerms(config.entities, payload);
  const replacementGroups = config.replacements.map((rule) =>
    checkVector(rule.label, rule.terms, payload)
  );

  return [...entityGroups, ...replacementGroups];
}

export function hasLeak(checklist: LeakChecklistResult[]): boolean {
  return checklist.some((result) => result.leaked.length > 0);
}

export function buildCalendarPrompt(config: BrandEvalConfig, scrubbedPayload: string) {
  const targetQueryBank = extractTargetQueryBank(scrubbedPayload);

  return [
    "You are an AEO/SEO content strategist.",
    "Use the scrubbed client context to produce the requested content calendar.",
    "The client identity and sensitive details have been replaced with placeholder tokens.",
    "Do not try to infer real names. Use placeholders exactly when needed.",
    "Target queries must be grounded in the original documents.",
    "Use only target queries copied exactly from the allowed target query bank below.",
    "A calendar row may include one query or multiple queries, but every listed query must come from the bank.",
    "",
    "Hard output requirements:",
    ...config.outputRequirements.map((requirement) => `- ${requirement}`),
    "",
    "Allowed target query bank:",
    ...targetQueryBank.map((query) => `- ${query}`),
    "",
    scrubbedPayload
  ].join("\n");
}

export function buildCalendarPromptWithQueryBank(
  config: BrandEvalConfig,
  scrubbedPayload: string,
  scrubbedQueries: string[]
) {
  return [
    "You are an AEO/SEO content strategist.",
    "Use the scrubbed client context to produce the requested content calendar.",
    "The client identity and sensitive details have been replaced with placeholder tokens.",
    "Do not try to infer real names. Use placeholders exactly when needed.",
    "Target queries must be grounded in the original documents.",
    "Use only target queries copied exactly from the allowed target query bank below.",
    "A calendar row may include one query or multiple queries, but every listed query must come from the bank.",
    "",
    "Hard output requirements:",
    ...config.outputRequirements.map((requirement) => `- ${requirement}`),
    "",
    "Allowed target query bank:",
    ...scrubbedQueries.map((query) => `- ${query}`),
    "",
    scrubbedPayload
  ].join("\n");
}

export function restoreQueries(text: string, queryMap: Record<string, string>) {
  return Object.entries(queryMap)
    .sort(([left], [right]) => right.length - left.length)
    .reduce(
      (result, [scrubbedQuery, originalQuery]) =>
        result.replaceAll(scrubbedQuery, originalQuery),
      text
    );
}

function extractTargetQueryBank(scrubbedPayload: string): string[] {
  const queries = new Set<string>();
  const lines = scrubbedPayload.split(/\r?\n/);

  let inGsc = false;
  for (const line of lines) {
    if (line.startsWith("## ")) {
      inGsc = line.trim() === "## gsc";
    } else if (inGsc && line && !line.startsWith("query,")) {
      const [query] = parseCsvLine(line);
      addQuery(queries, query);
    }

    const promptMatch = line.match(/"prompt":\s*"([^"]+)"/);
    if (promptMatch) {
      addQuery(queries, promptMatch[1]);
    }

    for (const quoted of line.matchAll(/"([^"]{6,120})"/g)) {
      const value = quoted[1];
      if (looksLikeSearchQuery(value)) {
        addQuery(queries, value);
      }
    }
  }

  return [...queries].slice(0, 160);
}

function buildQueryMap(
  inputs: SessionInputFiles,
  config: BrandEvalConfig
): Record<string, string> {
  const originals = [
    ...extractGscQueries(inputs.gscCsv),
    ...extractVisibilityPrompts(inputs.visibilityJson),
    ...extractBriefQuotedQueries(inputs.briefMarkdown)
  ];
  const queryMap: Record<string, string> = {};

  for (const original of originals) {
    if (!looksLikeSearchQuery(original)) continue;
    const scrubbed = scrubText(original, config).trim();
    if (scrubbed && !queryMap[scrubbed]) {
      queryMap[scrubbed] = original.trim();
    }
  }

  return queryMap;
}

function extractGscQueries(csv: string): string[] {
  const [, ...rows] = csv.trim().split(/\r?\n/);
  return rows.map((row) => parseCsvLine(row)[0]).filter(Boolean);
}

function extractVisibilityPrompts(json: string): string[] {
  const parsed = JSON.parse(json) as {
    tracked_prompts?: Array<{ prompt?: unknown }>;
  };
  return (
    parsed.tracked_prompts
      ?.map((entry) => entry.prompt)
      .filter((prompt): prompt is string => typeof prompt === "string") ?? []
  );
}

function extractBriefQuotedQueries(markdown: string): string[] {
  return [...markdown.matchAll(/"([^"]{4,120})"/g)]
    .map((match) => match[1])
    .filter(looksLikeSearchQuery);
}

function addQuery(queries: Set<string>, query: string) {
  const cleaned = query.trim();
  if (cleaned && looksLikeSearchQuery(cleaned)) {
    queries.add(cleaned);
  }
}

function looksLikeSearchQuery(value: string): boolean {
  const lowered = value.toLowerCase();
  if (lowered.includes("/") || lowered.includes("{") || lowered.includes("}")) {
    return false;
  }
  if (value.split(/\s+/).length > 12) {
    return false;
  }
  return /brand_001|scent_|product_|candle|fragrance|diffuser|dress|bridesmaid|wedding|prom|review|legit|custom|clean|sustainable|refill|soy|b-corp|corp|small batch|wirecutter|hotel|wholesale|mother|category|comparison/i.test(
    value
  );
}

export function loadLocalEnv() {
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

function entity(
  token: string,
  real: string,
  variants: string[],
  label: string
): EntityRule {
  return { token, real, variants, label };
}

function section(name: string, content: string) {
  return `## ${name}\n\n${content.trim()}`;
}

function scrubCsv(csv: string, config: BrandEvalConfig): string {
  const [headerLine, ...rows] = csv.trim().split(/\r?\n/);
  const headers = parseCsvLine(headerLine);
  const scrubbedRows = rows.map((row) =>
    parseCsvLine(row)
      .map((value, index) => scrubCell(value, headers[index] ?? "", config))
      .join(",")
  );
  return [headers.join(","), ...scrubbedRows].join("\n");
}

function scrubJson(json: string, config: BrandEvalConfig): string {
  const parsed: unknown = JSON.parse(json);
  return JSON.stringify(scrubValue(parsed, "", config), null, 2);
}

function scrubMarkdown(markdown: string, config: BrandEvalConfig): string {
  const bucketed = applyTextBucketsPreservingTime(markdown, config.textBuckets);
  return scrubText(bucketed, config);
}

function scrubValue(value: unknown, key: string, config: BrandEvalConfig): unknown {
  if (typeof value === "string") {
    return isMetricKey(key) ? bucketMetricString(value, config, key) : scrubText(value, config);
  }
  if (typeof value === "number") {
    return bucketMetricNumber(value, key);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => scrubValue(entry, key, config));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        scrubKey(entryKey, config),
        scrubValue(entryValue, entryKey, config)
      ])
    );
  }
  return value;
}

function scrubCell(value: string, header: string, config: BrandEvalConfig): string {
  return csvEscape(isMetricKey(header) ? bucketMetricString(value, config, header) : scrubText(value, config));
}

function scrubText(text: string, config: BrandEvalConfig): string {
  let result = stripKnownDomains(text, config);

  for (const rule of config.entities) {
    for (const variant of sortedByLength(rule.variants)) {
      result = replacePhrase(result, variant, rule.token);
    }
  }
  for (const rule of config.replacements) {
    result = replaceMany(result, rule.terms, rule.replacement);
  }

  return result;
}

function scrubKey(key: string, config: BrandEvalConfig): string {
  return scrubText(key, config)
    .replace(/BRAND_001_mentioned/gi, "brand_mentioned")
    .replace(/snippet_about_BRAND_001/gi, "snippet_about_brand");
}

function stripKnownDomains(text: string, config: BrandEvalConfig): string {
  return config.entities
    .filter((rule) => rule.token === "BRAND_001")
    .flatMap((rule) => rule.variants)
    .filter((variant) => /\.[a-z]{2,}/i.test(variant))
    .reduce(
      (current, domain) =>
        current.replace(
          new RegExp(`https?:\\/\\/(?:www\\.)?${escapeRegExp(domain)}(\\/[^\\s",)]*)?`, "gi"),
          "$1"
        ).replace(
          new RegExp(`\\b${escapeRegExp(domain)}(\\/[^\\s",)]*)?`, "gi"),
          "$1"
        ),
      text
    );
}

function groupEntityLeakTerms(
  entities: EntityRule[],
  payload: string
): LeakChecklistResult[] {
  const groups = new Map<string, string[]>();
  for (const entityRule of entities) {
    const terms = groups.get(entityRule.label) ?? [];
    terms.push(...entityRule.variants);
    groups.set(entityRule.label, terms);
  }
  return [...groups.entries()].map(([label, terms]) =>
    checkVector(label, terms, payload)
  );
}

function checkVector(
  vectorClass: string,
  phrases: string[],
  payload: string
): LeakChecklistResult {
  const lowered = payload.toLowerCase();
  const leaked = phrases.filter((phrase) => lowered.includes(phrase.toLowerCase()));

  return {
    vectorClass,
    checked: phrases,
    leaked
  };
}

function bucketMetricString(value: string, config: BrandEvalConfig, key: string): string {
  if (isTemporalKeyValue(key, value)) return scrubText(value, config);

  const percent = value.match(/^(\d+(?:\.\d+)?)%$/);
  if (percent) return bucketPercent(Number(percent[1]));

  const number = Number(value.replace(/[$,]/g, ""));
  if (!Number.isFinite(number)) return scrubText(value, config);

  return bucketNumber(number);
}

function bucketMetricNumber(value: number, key: string): string | number {
  if (!Number.isFinite(value)) return value;
  if (isTemporalKey(key) || isYearLikeNumber(value)) return value;
  if (key.toLowerCase().includes("lead")) return value;
  if (key.toLowerCase().includes("rate") || value < 1) return bucketPercent(value * 100);
  return bucketNumber(value);
}

function applyTextBucketsPreservingTime(
  text: string,
  rules: TextBucketRule[]
): string {
  const protectedValues = new Map<string, string>();
  let protectedText = text.replace(
    /\b(?:19|20)\d{2}(?:-\d{2}-\d{2})?(?:\s*(?:to|–|-)\s*(?:19|20)\d{2}(?:-\d{2}-\d{2})?)?\b/g,
    (match) => {
      const token = `__CIPHER_TIME_${"X".repeat(protectedValues.size + 1)}__`;
      protectedValues.set(token, match);
      return token;
    }
  );

  protectedText = rules.reduce(
    (current, rule) => current.replace(rule.pattern, rule.replacement),
    protectedText
  );

  return [...protectedValues.entries()].reduce(
    (current, [token, value]) => current.replaceAll(token, value),
    protectedText
  );
}

function isTemporalKeyValue(key: string, value: string): boolean {
  return isTemporalKey(key) || /^\s*(?:19|20)\d{2}(?:-\d{2}-\d{2})?\s*$/.test(value);
}

function isTemporalKey(key: string): boolean {
  return /(date|year|period|month|quarter|week|season|founded|achieved|published|updated)/i.test(
    key
  );
}

function isYearLikeNumber(value: number): boolean {
  return Number.isInteger(value) && value >= 1900 && value <= 2100;
}

function bucketNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs === 0) return "0";
  if (abs < 10) return "1-10 range";
  if (abs < 50) return "10-50 range";
  if (abs < 100) return "50-100 range";
  if (abs < 500) return "100-500 range";
  if (abs < 1000) return "500-1k range";
  if (abs < 5000) return `${Math.floor(abs / 1000)}-${Math.floor(abs / 1000) + 1}k range`;
  if (abs < 10000) return "5-10k range";
  if (abs < 50000) return "10-50k range";
  return "50k+ range";
}

function bucketPercent(value: number): string {
  if (value < 5) return "0-5% range";
  if (value < 10) return "5-10% range";
  if (value < 20) return "10-20% range";
  if (value < 35) return "20-35% range";
  if (value < 60) return "35-60% range";
  return "60%+ range";
}

function isMetricKey(key: string): boolean {
  return /(click|impression|ctr|position|session|conversion|revenue|rate|share|count|time|aov|mention|citation)/i.test(
    key
  );
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function replaceMany(text: string, phrases: string[], replacement: string): string {
  return sortedByLength(phrases).reduce(
    (current, phrase) => replacePhrase(current, phrase, replacement),
    text
  );
}

function replacePhrase(text: string, phrase: string, replacement: string): string {
  return text.replace(new RegExp(escapeRegExp(phrase), "gi"), replacement);
}

function sortedByLength(values: readonly string[]): string[] {
  return [...values].sort((left, right) => right.length - left.length);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
