#!/usr/bin/env node

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

const root = resolve(process.cwd());

console.log("=== Health OS Production Deployment Preflight ===");

function check(label, fn) {
  process.stdout.write(`• Checking ${label}... `);
  try {
    const detail = fn();
    console.log(`✅ OK ${detail ? `(${detail})` : ""}`);
    return true;
  } catch (err) {
    console.log(`❌ FAILED: ${err.message}`);
    return false;
  }
}

let passed = true;

// 1. Check Wrangler Configuration
passed = check("wrangler.jsonc configuration", () => {
  const jsoncPath = resolve(root, "wrangler.jsonc");
  const tomlPath = resolve(root, "wrangler.toml");
  const targetPath = existsSync(jsoncPath) ? jsoncPath : existsSync(tomlPath) ? tomlPath : null;
  if (!targetPath) throw Error("Neither wrangler.jsonc nor wrangler.toml found");
  const content = readFileSync(targetPath, "utf8");
  if (!content.includes('"name": "rep-gym-companion"') && !content.includes('name = "rep-gym-companion"')) throw Error("App name missing in configuration");
  if (!content.includes('compatibility_date')) throw Error("compatibility_date missing in configuration");
  if (!content.includes('"main": "src/server/index.js"') && !content.includes('main = "src/server/index.js"')) throw Error("Main entrypoint mismatch");
  return "valid configuration (" + (targetPath.endsWith("jsonc") ? "wrangler.jsonc" : "wrangler.toml") + ")";
}) && passed;

// 2. Check Static Build Assets
passed = check("built assets in dist/", () => {
  const distDir = resolve(root, "dist");
  if (!existsSync(distDir)) throw Error("dist directory does not exist. Run 'npm run sync' first.");
  const requiredFiles = [
    "client/index.html",
    "client/styles.css",
    "client/manifest.webmanifest",
    "client/app.js",
    "client/storage.js",
    "client/health-engine.js",
    "client/health-coverage.js",
    "client/performance-insights.js",
    "client/sw.js"
  ];
  for (const file of requiredFiles) {
    const full = resolve(distDir, file);
    if (!existsSync(full)) throw Error(`Missing build artifact: ${file}`);
  }
  return `${requiredFiles.length} key artifacts verified`;
}) && passed;

// 3. Check Secret Configuration & Bindings
passed = check("Worker secret and environment bindings", () => {
  const secrets = [
    { name: "NOTION_TOKEN", optional: true, desc: "Notion Integration Token" },
    { name: "GEMINI_API_KEY", optional: true, desc: "Google Gemini Vision API" },
    { name: "VAPID_PUBLIC_KEY", optional: true, desc: "Web Push Public Key" },
    { name: "VAPID_PRIVATE_KEY_JWK", optional: true, desc: "Web Push Private Key" },
    { name: "REP_SYNC_KEY", optional: true, desc: "Pairing HMAC Secret" }
  ];
  const present = secrets.filter(s => process.env[s.name]);
  return `${present.length}/${secrets.length} local env secrets configured`;
}) && passed;

// 4. Code Syntax & Type Integrity
passed = check("code syntax and TypeScript compilation", () => {
  execSync("npm run check", { stdio: "pipe", cwd: root });
  return "clean typecheck & lint";
}) && passed;

// 5. Unit Tests
passed = check("unit test suite execution", () => {
  execSync("npm run test:node", { stdio: "pipe", cwd: root });
  return "Node regression tests passed";
}) && passed;

// 6. Worker Runtime Tests
passed = check("Worker runtime execution", () => {
  execSync("npm run test:runtime", { stdio: "pipe", cwd: root });
  return "Workers-runtime tests passed";
}) && passed;

console.log("\n================================================");
if (passed) {
  console.log("🎉 LOCAL DEPLOYMENT PREFLIGHT PASSED");
  console.log("Remote production secrets, physical-device evidence, and human production approval remain mandatory.");
  process.exit(0);
} else {
  console.error("❌ DEPLOYMENT PREFLIGHT FAILED: RESOLVE ISSUES BEFORE DEPLOY");
  process.exit(1);
}
