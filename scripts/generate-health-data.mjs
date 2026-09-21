#!/usr/bin/env node
// Validates canonical data/health-plan.json and deterministically renders src/client/health-data.js.
// Canonical SHA-256 covers LF-normalized canonical JSON text across all platforms.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const CANONICAL_REL_PATH = "data/health-plan.json";
const GENERATED_REL_PATH = "src/client/health-data.js";

export function normalizeLineEndings(str) {
  return typeof str === "string" ? str.replace(/\r\n|\r/g, "\n") : str;
}

export function validateHealthPlan(plan) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    throw new Error("Canonical health plan must be a non-null object");
  }

  // Version & date checks
  if (typeof plan.version !== "string" || !/^\d{4}\.\d{2}\.\d{2}$/.test(plan.version)) {
    throw new Error(`Invalid plan version: "${plan.version}". Must match YYYY.MM.DD.`);
  }
  if (typeof plan.updatedAt !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(plan.updatedAt)) {
    throw new Error(`Invalid plan updatedAt: "${plan.updatedAt}". Must match YYYY-MM-DD.`);
  }

  // Provenance checks
  if (!plan.provenance || typeof plan.provenance !== "object" || Array.isArray(plan.provenance)) {
    throw new Error("Missing or invalid provenance object in health plan");
  }
  const sourceDocs = plan.provenance.sourceDocuments;
  if (!Array.isArray(sourceDocs) || sourceDocs.length !== 5) {
    throw new Error("provenance.sourceDocuments must be an array of exactly 5 source documents");
  }
  const expectedDocs = [
    { fileName: "Training-Recovery-Guide.pdf", role: "training" },
    { fileName: "hygiene-routine-daily.pdf", role: "hygiene" },
    { fileName: "Mohamed_Nutrition_Plan.pdf", role: "nutrition" },
    { fileName: "Master-Health-Plan.md", role: "master" },
    { fileName: "exercises.json", role: "training structure" }
  ];
  for (const exp of expectedDocs) {
    const found = sourceDocs.find(d => d && d.fileName === exp.fileName);
    if (!found) {
      throw new Error(`Missing expected source document: ${exp.fileName}`);
    }
    if (found.role !== exp.role) {
      throw new Error(`Invalid role for "${exp.fileName}": expected "${exp.role}", got "${found.role}"`);
    }
    if (found.contentSha256 !== null && (typeof found.contentSha256 !== "string" || !/^[0-9a-f]{64}$/.test(found.contentSha256))) {
      throw new Error(`Invalid contentSha256 for "${exp.fileName}": must be null or 64-character hex string`);
    }
    if (typeof found.status !== "string" || found.status.trim() === "") {
      throw new Error(`Invalid status for "${exp.fileName}": expected non-empty status string`);
    }
  }

  // Sources checks
  if (!plan.sources || typeof plan.sources !== "object" || Array.isArray(plan.sources)) {
    throw new Error("Missing or invalid sources object in health plan");
  }
  for (const srcKey of ["training", "nutrition", "hygiene", "master", "drive"]) {
    const url = plan.sources[srcKey];
    if (typeof url !== "string" || !url.startsWith("https://")) {
      throw new Error(`Invalid source URL for "${srcKey}": expected https:// URL string`);
    }
  }

  // Rules checks
  if (!plan.rules || typeof plan.rules !== "object" || Array.isArray(plan.rules)) {
    throw new Error("Missing or invalid rules object in health plan");
  }
  const rules = plan.rules;
  if (typeof rules.minimumSleepHours !== "number" || rules.minimumSleepHours < 1 || rules.minimumSleepHours > 24) {
    throw new Error(`Invalid rules.minimumSleepHours: ${rules.minimumSleepHours}`);
  }
  if (typeof rules.wakeTime !== "string" || !/^\d{2}:\d{2}$/.test(rules.wakeTime)) {
    throw new Error(`Invalid rules.wakeTime: "${rules.wakeTime}". Must match HH:MM.`);
  }
  if (typeof rules.targetBedtime !== "string" || !/^\d{2}:\d{2}$/.test(rules.targetBedtime)) {
    throw new Error(`Invalid rules.targetBedtime: "${rules.targetBedtime}". Must match HH:MM.`);
  }
  for (const numKey of ["redFlagThreshold", "reviewWeek", "stallSessions", "cardioEasySessions", "cardioMinimumWeeks"]) {
    if (typeof rules[numKey] !== "number" || !Number.isInteger(rules[numKey]) || rules[numKey] < 1) {
      throw new Error(`Invalid rules.${numKey}: ${rules[numKey]}. Must be integer >= 1.`);
    }
  }

  // Nutrition checks
  if (!plan.nutrition || typeof plan.nutrition !== "object" || Array.isArray(plan.nutrition)) {
    throw new Error("Missing or invalid nutrition object in health plan");
  }
  const nutr = plan.nutrition;
  if (!nutr.targets || typeof nutr.targets !== "object" || Array.isArray(nutr.targets)) {
    throw new Error("Missing nutrition.targets object");
  }
  for (const dayType of ["gym", "cardio", "rest", "fasting"]) {
    const t = nutr.targets[dayType];
    if (!t || typeof t !== "object" || Array.isArray(t)) {
      throw new Error(`Missing target for day type: "${dayType}"`);
    }
    if (typeof t.label !== "string" || t.label.trim() === "") {
      throw new Error(`Invalid label for target "${dayType}"`);
    }
    if (typeof t.calories !== "number" || t.calories < 500 || t.calories > 5000) {
      throw new Error(`Invalid calories on target "${dayType}": ${t.calories}. Must be between 500 and 5000.`);
    }
    for (const macro of ["protein", "carbs", "fat", "fiber", "water"]) {
      if (typeof t[macro] !== "number" || t[macro] < 0) {
        throw new Error(`Invalid nutrition macro "${macro}" on target "${dayType}": ${t[macro]}`);
      }
    }
    if (t.calorieCeiling !== undefined && (typeof t.calorieCeiling !== "number" || t.calorieCeiling < 500 || t.calorieCeiling > 5000)) {
      throw new Error(`Invalid calorieCeiling on target "${dayType}": ${t.calorieCeiling}. Must be between 500 and 5000.`);
    }
  }

  if (!nutr.meals || typeof nutr.meals !== "object" || Array.isArray(nutr.meals)) {
    throw new Error("Missing nutrition.meals object");
  }
  for (const mealKey of ["gym", "cardio", "rest", "fasting"]) {
    const list = nutr.meals[mealKey];
    if (!Array.isArray(list) || list.length === 0) {
      throw new Error(`nutrition.meals.${mealKey} must be a non-empty array`);
    }
    for (const item of list) {
      if (!Array.isArray(item) || item.length < 2 || item.length > 3 || item.some(str => typeof str !== "string" || str.trim() === "")) {
        throw new Error(`Invalid meal entry in nutrition.meals.${mealKey}: ${JSON.stringify(item)}`);
      }
    }
  }

  if (!Array.isArray(nutr.rules) || nutr.rules.length === 0 || nutr.rules.some(r => typeof r !== "string" || r.trim() === "")) {
    throw new Error("nutrition.rules must be a non-empty array of non-empty strings");
  }
  if (!Array.isArray(nutr.supplements) || nutr.supplements.length === 0 || nutr.supplements.some(s => typeof s !== "string" || s.trim() === "")) {
    throw new Error("nutrition.supplements must be a non-empty array of non-empty strings");
  }
  if (typeof nutr.milk !== "string" || nutr.milk.trim() === "") {
    throw new Error("nutrition.milk must be a non-empty string");
  }

  // Hygiene checks
  if (!plan.hygiene || typeof plan.hygiene !== "object" || Array.isArray(plan.hygiene)) {
    throw new Error("Missing or invalid hygiene object in health plan");
  }
  const hyg = plan.hygiene;
  for (const section of ["nonNegotiables", "morning", "evening", "afterWork", "postWorkout", "strictHairRules", "weekly", "monthly"]) {
    if (!Array.isArray(hyg[section]) || hyg[section].length === 0 || hyg[section].some(item => typeof item !== "string" || item.trim() === "")) {
      throw new Error(`hygiene.${section} must be a non-empty array of non-empty strings`);
    }
  }

  if (!hyg.hair || typeof hyg.hair !== "object" || Array.isArray(hyg.hair)) {
    throw new Error("Missing hygiene.hair object");
  }
  for (const day of ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]) {
    const hairDay = hyg.hair[day];
    if (!Array.isArray(hairDay) || hairDay.length === 0 || hairDay.some(item => typeof item !== "string" || item.trim() === "")) {
      throw new Error(`hygiene.hair.${day} must be a non-empty array of non-empty strings`);
    }
  }

  return true;
}

export function renderHealthData(plan, sha256) {
  const targetsEntries = Object.entries(plan.nutrition.targets).map(([k, v]) => {
    const fields = [
      `label: ${JSON.stringify(v.label)}`,
      `calories: ${v.calories}`,
      `protein: ${v.protein}`,
      `carbs: ${v.carbs}`,
      `fat: ${v.fat}`,
      `fiber: ${v.fiber}`,
      `water: ${v.water}`
    ];
    if (v.calorieCeiling !== undefined) {
      fields.push(`calorieCeiling: ${v.calorieCeiling}`);
    }
    return `      ${k}: { ${fields.join(", ")} }`;
  }).join(",\n");

  const mealsEntries = Object.entries(plan.nutrition.meals).map(([k, items]) => {
    const rows = items.map(item => `        [${item.map(x => JSON.stringify(x)).join(", ")}]`).join(",\n");
    return `      ${k}: [\n${rows}\n      ]`;
  }).join(",\n");

  const hairEntries = Object.entries(plan.hygiene.hair).map(([day, items]) => {
    return `      ${day}: [${items.map(x => JSON.stringify(x)).join(", ")}]`;
  }).join(",\n");

  const formatList = (items, indent = "      ") => items.map(x => `${indent}${JSON.stringify(x)}`).join(",\n");

  const sourceDocs = plan.provenance?.sourceDocuments || [];
  const sourceDocsEntries = sourceDocs.map(doc => {
    return `      { fileName: ${JSON.stringify(doc.fileName)}, role: ${JSON.stringify(doc.role)}, contentSha256: ${JSON.stringify(doc.contentSha256)}, status: ${JSON.stringify(doc.status)} }`;
  }).join(",\n");

  return `// Generated by scripts/generate-health-data.mjs from data/health-plan.json.
// DO NOT EDIT DIRECTLY. Run "npm run sync" to regenerate.
// Canonical source: ${CANONICAL_REL_PATH}
// Canonical SHA-256: ${sha256}
// Note: Hash covers LF-normalized canonical JSON text across all platforms.

window.REP_HEALTH_GUIDE = Object.freeze({
  version: ${JSON.stringify(plan.version)},
  updatedAt: ${JSON.stringify(plan.updatedAt)},
  provenance: {
    canonicalPath: ${JSON.stringify(CANONICAL_REL_PATH)},
    sha256: ${JSON.stringify(sha256)},
    sourceDocuments: [
${sourceDocsEntries}
    ]
  },
  sources: {
    training: ${JSON.stringify(plan.sources.training)},
    nutrition: ${JSON.stringify(plan.sources.nutrition)},
    hygiene: ${JSON.stringify(plan.sources.hygiene)},
    master: ${JSON.stringify(plan.sources.master)},
    drive: ${JSON.stringify(plan.sources.drive)}
  },
  rules: {
    minimumSleepHours: ${plan.rules.minimumSleepHours},
    wakeTime: ${JSON.stringify(plan.rules.wakeTime)},
    targetBedtime: ${JSON.stringify(plan.rules.targetBedtime)},
    redFlagThreshold: ${plan.rules.redFlagThreshold},
    reviewWeek: ${plan.rules.reviewWeek},
    stallSessions: ${plan.rules.stallSessions},
    cardioEasySessions: ${plan.rules.cardioEasySessions},
    cardioMinimumWeeks: ${plan.rules.cardioMinimumWeeks}
  },
  nutrition: {
    targets: {
${targetsEntries}
    },
    meals: {
${mealsEntries}
    },
    rules: [
${formatList(plan.nutrition.rules)}
    ],
    supplements: [
${formatList(plan.nutrition.supplements)}
    ],
    milk: ${JSON.stringify(plan.nutrition.milk)}
  },
  hygiene: {
    nonNegotiables: [
${formatList(plan.hygiene.nonNegotiables)}
    ],
    morning: [
${formatList(plan.hygiene.morning)}
    ],
    evening: [
${formatList(plan.hygiene.evening)}
    ],
    afterWork: [
${formatList(plan.hygiene.afterWork)}
    ],
    postWorkout: [
${formatList(plan.hygiene.postWorkout)}
    ],
    hair: {
${hairEntries}
    },
    strictHairRules: [
${formatList(plan.hygiene.strictHairRules)}
    ],
    weekly: [
${formatList(plan.hygiene.weekly)}
    ],
    monthly: [
${formatList(plan.hygiene.monthly)}
    ]
  }
});
`;
}

export function generateHealthData({ root = dirname(dirname(fileURLToPath(import.meta.url))), check = false } = {}) {
  const canonicalPath = join(root, CANONICAL_REL_PATH);
  const generatedPath = join(root, GENERATED_REL_PATH);

  const rawCanonical = readFileSync(canonicalPath, "utf8");
  const normalizedCanonical = normalizeLineEndings(rawCanonical);
  const sha256 = createHash("sha256").update(Buffer.from(normalizedCanonical, "utf8")).digest("hex");
  const plan = JSON.parse(normalizedCanonical);

  validateHealthPlan(plan);
  const rendered = normalizeLineEndings(renderHealthData(plan, sha256));

  if (check) {
    let existing;
    try {
      existing = readFileSync(generatedPath, "utf8");
    } catch {
      throw new Error(`Health plan check failed: ${GENERATED_REL_PATH} does not exist.`);
    }
    const normalizedExisting = normalizeLineEndings(existing);
    if (normalizedExisting !== rendered) {
      throw new Error(`Health plan check failed: ${GENERATED_REL_PATH} is stale or differs from canonical ${CANONICAL_REL_PATH}.\nRun "npm run sync" to regenerate.`);
    }
    console.log(`Health plan check passed: ${GENERATED_REL_PATH} is current with ${CANONICAL_REL_PATH} (${sha256.slice(0, 12)}).`);
    return { ok: true, sha256 };
  }

  writeFileSync(generatedPath, rendered, "utf8");
  console.log(`Generated ${GENERATED_REL_PATH} from ${CANONICAL_REL_PATH} (${sha256.slice(0, 12)}).`);
  return { ok: true, sha256 };
}

// CLI entry point
const isMain = process.argv[1] && (
  fileURLToPath(import.meta.url) === process.argv[1] ||
  import.meta.url.endsWith(process.argv[1])
);

if (isMain) {
  const check = process.argv.includes("--check");
  try {
    generateHealthData({ check });
  } catch (err) {
    if (err.message.includes("Health plan check failed")) {
      console.error(err.message);
    } else {
      console.error(`generate-health-data failed: ${err.message}`);
    }
    process.exit(1);
  }
}
