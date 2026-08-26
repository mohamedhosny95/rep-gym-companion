#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const configText = readFileSync(resolve(root, "wrangler.jsonc"), "utf8");
const config = JSON.parse(configText);
const healthKitSource = readFileSync(
  resolve(root, "ios/RepHealthCompanion/HealthKitSyncCoordinator.swift"),
  "utf8"
);

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

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

function validateSecrets(environment, label) {
  const names = environment?.secrets?.required ?? [];
  for (const name of requiredSecrets) {
    expect(names.includes(name), `${label} must declare ${name} as a required secret.`);
  }
  expect(new Set(names).size === names.length, `${label} required secrets must not contain duplicates.`);
}

validateSecrets(config, "production");
const staging = config.env?.staging;
validateSecrets(staging, "staging");

expect(config.$schema === "./node_modules/wrangler/config-schema.json", "Wrangler must use the installed local schema.");
expect(config.vars?.ENVIRONMENT === "production", "The default environment must identify itself as production.");
expect(staging?.name === "rep-gym-companion-staging", "The staging Worker must use its isolated name.");
expect(staging?.workers_dev === true, "The staging Worker must stay on its isolated workers.dev origin.");
expect(staging?.vars?.ENVIRONMENT === "staging", "The staging Worker must identify itself as staging.");

const productionKv = config.kv_namespaces?.find(binding => binding.binding === "PUSH_KV");
const stagingKv = staging?.kv_namespaces?.find(binding => binding.binding === "PUSH_KV");
expect(Boolean(productionKv?.id), "Production PUSH_KV must keep its explicit namespace id.");
expect(Boolean(stagingKv), "Staging must declare an isolated PUSH_KV binding.");
expect(
  !stagingKv?.id || stagingKv.id !== productionKv?.id,
  "Staging PUSH_KV must be auto-provisioned or use an id distinct from production."
);

const productionObjects = new Set((config.durable_objects?.bindings ?? []).map(binding => binding.name));
const stagingObjects = new Set((staging?.durable_objects?.bindings ?? []).map(binding => binding.name));
for (const name of productionObjects) {
  expect(stagingObjects.has(name), `Staging must explicitly bind Durable Object ${name}.`);
}

expect(!/REPLACE_WITH|CHANGEME|TODO_SECRET/i.test(configText), "Wrangler configuration must not contain deployment placeholders.");
expect(
  /async let workoutSamples\s*=\s*workoutHeartRateCount\(interval\)/.test(healthKitSource),
  "HealthKit workoutSamples must be declared before it is awaited."
);
expect(
  /async let sleep\s*=\s*sleepSummary\(interval\)/.test(healthKitSource),
  "HealthKit sleep must be declared before it is awaited."
);

if (failures.length) {
  console.error("Runtime readiness validation failed:\n" + failures.map(item => `  - ${item}`).join("\n"));
  process.exit(1);
}

console.log(`Runtime readiness configuration is valid (${requiredSecrets.length} required secrets per environment).`);
