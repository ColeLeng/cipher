import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";

export type SessionInputFiles = {
  gscCsv: string;
  ga4Csv: string;
  visibilityJson: string;
  briefMarkdown: string;
};

export type SessionCipherMap = Record<string, string>;

export type SessionCipherResult = {
  scrubbedPayload: string;
  cipherMap: SessionCipherMap;
  checklist: LeakChecklistResult[];
};

export type LeakChecklistResult = {
  vectorClass: string;
  checked: string[];
  leaked: string[];
};

const BRAND_TOKEN = "BRAND_001";

const BRAND_VARIANTS = [
  "veloradresses.com",
  "veloradress",
  "velora.com",
  "velora.de",
  "velora.fr",
  "velora",
  "velora dress",
  "velora kleider",
  "velora avis",
  "velora rücksendung",
  "velora india"
];

const PRODUCT_NAMES = [
  "Harper Sky",
  "Cathy",
  "Aubrey",
  "Sienna",
  "Marlowe",
  "Quinn",
  "Finley"
];

const PRODUCT_VARIANTS = [
  ["Harper Sky", "harper-sky", "harper sky", "harper"],
  ["Cathy", "cathy"],
  ["Aubrey", "aubrey"],
  ["Sienna", "sienna"],
  ["Marlowe", "marlowe"],
  ["Quinn", "quinn"],
  ["Finley", "finley"]
] as const;

const COMPETITOR_NAMES = [
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
];

const GEOGRAPHY_TERMS = ["Istanbul", "Turkey", "Turkish"];

export async function readSessionInputs(inputDir: string): Promise<SessionInputFiles> {
  return {
    gscCsv: await readFile(join(inputDir, "01_velora_gsc.csv"), "utf8"),
    ga4Csv: await readFile(join(inputDir, "02_velora_ga4.csv"), "utf8"),
    visibilityJson: await readFile(
      join(inputDir, "03_velora_visibility.json"),
      "utf8"
    ),
    briefMarkdown: await readFile(join(inputDir, "04_velora_brief.md"), "utf8")
  };
}

export function buildSessionCipher(inputs: SessionInputFiles): SessionCipherResult {
  const cipherMap = buildCipherMap();
  const sections = [
    scrubCsvSection("gsc", inputs.gscCsv, cipherMap),
    scrubCsvSection("ga4", inputs.ga4Csv, cipherMap),
    scrubJsonSection("visibility", inputs.visibilityJson, cipherMap),
    scrubMarkdownSection("brief", inputs.briefMarkdown, cipherMap)
  ];

  const scrubbedPayload = sections
    .map(
      (section) =>
        `## ${section.name}\n\n${section.content.trim()}\n`
    )
    .join("\n");

  return {
    scrubbedPayload,
    cipherMap,
    checklist: verifyLeakVectors(scrubbedPayload)
  };
}

export function verifyLeakVectors(payload: string): LeakChecklistResult[] {
  return [
    checkVector("brand variants", BRAND_VARIANTS, payload),
    checkVector("product names", productLeakTerms(), payload),
    checkVector("geography", GEOGRAPHY_TERMS, payload),
    checkVector("competitors", COMPETITOR_NAMES, payload)
  ];
}

export function hasLeak(checklist: LeakChecklistResult[]): boolean {
  return checklist.some((result) => result.leaked.length > 0);
}

function buildCipherMap(): SessionCipherMap {
  const map: SessionCipherMap = {
    [BRAND_TOKEN]: "Velora",
    REGIONAL_MANUFACTURING_HUB: "Istanbul, Turkey",
    CATEGORY_COMPETITORS: "Azazie + JJ's House + BHLDN + Floravere"
  };

  PRODUCT_VARIANTS.forEach(([name], index) => {
    map[`PRODUCT_${String(index + 1).padStart(3, "0")}`] = name;
  });

  return map;
}

function scrubCsvSection(
  name: string,
  csv: string,
  cipherMap: SessionCipherMap
): { name: string; content: string } {
  const [headerLine, ...rows] = csv.trim().split(/\r?\n/);
  const headers = parseCsvLine(headerLine);
  const scrubbedRows = rows.map((row) => {
    const values = parseCsvLine(row);
    return values
      .map((value, index) => scrubCell(value, headers[index] ?? "", cipherMap))
      .join(",");
  });

  return {
    name,
    content: [headers.join(","), ...scrubbedRows].join("\n")
  };
}

function scrubJsonSection(
  name: string,
  json: string,
  cipherMap: SessionCipherMap
): { name: string; content: string } {
  const parsed: unknown = JSON.parse(json);
  return {
    name,
    content: JSON.stringify(scrubValue(parsed, "", cipherMap), null, 2)
  };
}

function scrubMarkdownSection(
  name: string,
  markdown: string,
  cipherMap: SessionCipherMap
): { name: string; content: string } {
  return {
    name,
    content: scrubText(bucketBriefDetails(markdown), cipherMap)
  };
}

function scrubValue(
  value: unknown,
  key: string,
  cipherMap: SessionCipherMap
): unknown {
  if (typeof value === "string") {
    if (isMetricKey(key)) {
      return bucketMetricString(value);
    }
    return scrubText(value, cipherMap);
  }
  if (typeof value === "number") {
    return bucketMetricNumber(value, key);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => scrubValue(entry, key, cipherMap));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        scrubKey(entryKey),
        scrubValue(entryValue, entryKey, cipherMap)
      ])
    );
  }
  return value;
}

function scrubCell(
  value: string,
  header: string,
  cipherMap: SessionCipherMap
): string {
  if (isMetricKey(header)) {
    return csvEscape(bucketMetricString(value));
  }
  return csvEscape(scrubText(value, cipherMap));
}

function scrubText(text: string, cipherMap: SessionCipherMap): string {
  let result = stripBrandedUrls(text);

  result = replaceMany(result, BRAND_VARIANTS, BRAND_TOKEN);
  PRODUCT_VARIANTS.forEach((variants, index) => {
    const token = `PRODUCT_${String(index + 1).padStart(3, "0")}`;
    variants.forEach((variant) => {
      result = replacePhrase(result, variant, token);
    });
  });
  result = replaceMany(result, COMPETITOR_NAMES, "category competitors");
  result = replaceMany(result, ["Istanbul", "Turkey"], "regional manufacturing hub");
  result = replacePhrase(result, "Turkish", "regional manufacturing");

  for (const [placeholder, real] of Object.entries(cipherMap)) {
    if (placeholder.startsWith("PRODUCT_")) {
      result = replacePhrase(result, real, placeholder);
    }
  }

  return result;
}

function scrubKey(key: string): string {
  return replaceMany(
    key,
    ["velora", "Velora"],
    "brand"
  ).replace(/brand_mentioned/gi, "brand_mentioned");
}

function stripBrandedUrls(text: string): string {
  return text
    .replace(/https?:\/\/(?:www\.)?velora\.(?:com|de|fr)(\/[^\s",)]*)?/gi, "$1")
    .replace(/\bvelora\.(?:com|de|fr)(\/[^\s",)]*)?/gi, "$1");
}

function replaceMany(text: string, phrases: string[], replacement: string): string {
  return phrases.reduce(
    (current, phrase) => replacePhrase(current, phrase, replacement),
    text
  );
}

function replacePhrase(text: string, phrase: string, replacement: string): string {
  return text.replace(new RegExp(escapeRegExp(phrase), "gi"), replacement);
}

function bucketBriefDetails(markdown: string): string {
  return markdown
    .replace(/founded in 2019/gi, "founded in the late 2010s")
    .replace(/\$8M–\$12M range/gi, "mid eight-figure revenue range")
    .replace(/approximately 45 people/gi, "roughly 40-60 people")
    .replace(/marketing team of 4/gi, "small marketing team")
    .replace(/US \(about 55% of revenue\)/gi, "US (majority revenue share)")
    .replace(/Germany \(15%\)/gi, "Germany (meaningful minority share)")
    .replace(/France \(8%\)/gi, "France (single-digit share)")
    .replace(/India \(7%\)/gi, "India (single-digit share)")
    .replace(/9\.2%/g, "high single-digit percentage")
    .replace(/18\.4%/g, "high teens percentage")
    .replace(/25%/g, "mid-twenties percentage")
    .replace(/60%\+/g, "majority of the time")
    .replace(/2\.4x/g, "roughly two-to-three-times");
}

function bucketMetricString(value: string): string {
  const percent = value.match(/^(\d+(?:\.\d+)?)%$/);
  if (percent) {
    return bucketPercent(Number(percent[1]));
  }

  const number = Number(value.replace(/[$,]/g, ""));
  if (!Number.isFinite(number)) {
    return scrubText(value, buildCipherMap());
  }

  return bucketNumber(number);
}

function bucketMetricNumber(value: number, key: string): string | number {
  if (!Number.isFinite(value)) {
    return value;
  }
  if (key.toLowerCase().includes("lead")) {
    return value;
  }
  if (key.toLowerCase().includes("rate") || value < 1) {
    return bucketPercent(value * 100);
  }
  return bucketNumber(value);
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

function checkVector(
  vectorClass: string,
  phrases: string[],
  payload: string
): LeakChecklistResult {
  const lowered = payload.toLowerCase();
  const leaked = phrases.filter((phrase) =>
    lowered.includes(phrase.toLowerCase())
  );

  return {
    vectorClass,
    checked: phrases,
    leaked
  };
}

function productLeakTerms(): string[] {
  return PRODUCT_VARIANTS.flatMap((variants) => [...variants]);
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
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function describeInputFiles(inputDir: string) {
  return [
    "01_velora_gsc.csv",
    "02_velora_ga4.csv",
    "03_velora_visibility.json",
    "04_velora_brief.md"
  ].map((file) => basename(join(inputDir, file)));
}
