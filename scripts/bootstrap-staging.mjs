#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const requiredSecrets = [
  "REP_SYNC_KEY",
  "NOTION_TOKEN",
  "NOTION_DATA_SOURCE_ID",
  "NOTION_RECOVERY_DATA_SOURCE_ID",
  "NOTION_NUTRITION_DATA_SOURCE_ID",
  "NOTION_HYGIENE_DATA_SOURCE_ID",
  "NOTION_HABIT_DATA_SOURCE_ID",
  "NOTION_FOOD_DATA_SOURCE_ID",
  "CANONICAL_ORIGIN",
  "VITALS_IMPORT_KEY"
];

const missing = requiredSecrets.filter(name => !String(process.env[name] ?? "").trim());
if (missing.length) {
  console.error(`Missing staging-only environment values: ${missing.join(", ")}`);
  console.error("Load dedicated staging values into the current shell; production values must never be reused.");
  process.exit(2);
}

const origin = new URL(process.env.CANONICAL_ORIGIN);
if (origin.protocol !== "https:" || !origin.hostname.includes("staging")) {
  console.error("CANONICAL_ORIGIN must be an HTTPS staging hostname containing 'staging'.");
  process.exit(2);
}
if (process.env.REP_SYNC_KEY.length < 32 || process.env.VITALS_IMPORT_KEY.length < 32) {
  console.error("REP_SYNC_KEY and VITALS_IMPORT_KEY must each contain at least 32 characters.");
  process.exit(2);
}
if (process.env.REP_SYNC_KEY === process.env.VITALS_IMPORT_KEY) {
  console.error("REP_SYNC_KEY and VITALS_IMPORT_KEY must be independent staging credentials.");
  process.exit(2);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: process.cwd(), stdio: "inherit", ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("Validating and provisioning the isolated staging Worker...");
run("npm", ["run", "check:config"]);
const secretPayload = Object.fromEntries(requiredSecrets.map(name => [name, process.env[name]]));
const secretDirectory = mkdtempSync(join(tmpdir(), "rep-staging-secrets-"));
const secretFile = join(secretDirectory, "secrets.json");
try {
  writeFileSync(secretFile, JSON.stringify(secretPayload), { mode: 0o600 });
  run("npx", ["wrangler", "deploy", "--env", "staging", "--secrets-file", secretFile]);
} finally {
  rmSync(secretDirectory, { recursive: true, force: true });
}
run("npm", ["run", "check:config"]);

run("npx", ["wrangler", "secret", "list", "--env", "staging"]);
run("npm", ["run", "test:staging"], {
  env: {
    ...process.env,
    REP_STAGING_URL: origin.origin,
    REP_STAGING_SYNC_KEY: process.env.REP_SYNC_KEY,
    NOTION_TEST_TOKEN: process.env.NOTION_TOKEN
  }
});

console.log(`Staging is provisioned and its verified Notion contract passed at ${origin.origin}.`);
