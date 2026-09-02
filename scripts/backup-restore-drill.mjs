#!/usr/bin/env node

import { chromium } from "playwright";
import http from "node:http";
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync
} from "node:fs";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const clientRoot = join(projectRoot, "dist", "client");
const evidenceDir = join(projectRoot, "work", "certification");
const backupPath = join(evidenceDir, "recovery-drill-backup.json");
const tamperedPath = join(evidenceDir, "recovery-drill-tampered.json");
const reportPath = process.env.REP_RECOVERY_REPORT || join(evidenceDir, "recovery-drill-report.json");
const passphrase = "recovery-drill-passphrase";
const port = 8935;
const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp"
};

mkdirSync(evidenceDir, { recursive: true });
mkdirSync(dirname(reportPath), { recursive: true });

const server = http.createServer((request, response) => {
  const urlPath = decodeURIComponent(request.url.split("?")[0]);
  const filePath = normalize(join(clientRoot, urlPath === "/" ? "/index.html" : urlPath));
  if (!filePath.startsWith(clientRoot) || !existsSync(filePath) || statSync(filePath).isDirectory()) {
    response.writeHead(404);
    response.end("not found");
    return;
  }
  response.writeHead(200, { "content-type": MIME[extname(filePath)] || "application/octet-stream" });
  createReadStream(filePath).pipe(response);
});

const checks = [];
function check(condition, label) {
  checks.push({ label, passed: Boolean(condition) });
  console.log(`${condition ? "PASS" : "FAIL"}: ${label}`);
  if (!condition) throw Error(label);
}

async function openApp(context) {
  const page = await context.newPage();
  await page.goto(`http://localhost:${port}`, { waitUntil: "load" });
  await page.waitForSelector('html[data-app-ready="true"]', { timeout: 10000 });
  if (await page.locator("[data-onboarding-skip]").count()) {
    await page.click("[data-onboarding-skip]");
    await page.waitForSelector(".onboarding-backdrop", { state: "detached", timeout: 10000 });
  }
  return page;
}

function acceptRestoreDialogs(page) {
  page.on("dialog", async dialog => {
    if (dialog.type() === "prompt") await dialog.accept(passphrase);
    else await dialog.accept();
  });
}

await new Promise(resolve => server.listen(port, resolve));
const browser = await chromium.launch({
  channel: existsSync("/Applications/Google Chrome.app") ? "chrome" : undefined,
  args: ["--no-sandbox"]
});

let report;
try {
  const sourceContext = await browser.newContext({ viewport: { width: 390, height: 900 }, acceptDownloads: true });
  const sourcePage = await openApp(sourceContext);

  await sourcePage.click('[data-habit-id="sleep"]');
  await sourcePage.click('[data-app-tab="food"]');
  await sourcePage.fill("[data-food-note]", "recovery drill meal");
  await sourcePage.click("[data-manual-food]");
  await sourcePage.waitForTimeout(250);
  if (await sourcePage.locator("[data-save-food]").count()) await sourcePage.click("[data-save-food]");
  await sourcePage.evaluate(() => window.REP_STORE.flush());
  check(await sourcePage.locator(".food-log article, .food-entry").count() > 0, "Recovery fixture contains a meal");

  await sourcePage.click("#settingsButton");
  await sourcePage.click('[data-settings-tab="security"]');
  await sourcePage.fill("[data-backup-passphrase]", passphrase);
  const [download] = await Promise.all([
    sourcePage.waitForEvent("download"),
    sourcePage.click("[data-encrypted-export]")
  ]);
  await download.saveAs(backupPath);

  const encrypted = JSON.parse(readFileSync(backupPath, "utf8"));
  check(encrypted.schema === 5 && encrypted.format === "rep-health-export/v5", "Downloaded backup uses authenticated schema 5");
  writeFileSync(tamperedPath, JSON.stringify({ ...encrypted, format: "rep-health-export/v4" }, null, 2));
  await sourceContext.close();

  const restoreContext = await browser.newContext({ viewport: { width: 390, height: 900 } });
  const restorePage = await openApp(restoreContext);
  acceptRestoreDialogs(restorePage);
  await restorePage.click("#settingsButton");
  await restorePage.click('[data-settings-tab="security"]');
  const restoredLoad = restorePage.waitForEvent("load");
  await restorePage.setInputFiles("[data-backup-import]", backupPath);
  await restoredLoad;
  await restorePage.waitForSelector('html[data-app-ready="true"]', { timeout: 10000 });
  check(await restorePage.locator('[data-habit-id="sleep"][aria-pressed="true"]').count() === 1, "Fresh profile restores the habit record");
  await restorePage.click('[data-app-tab="food"]');
  check((await restorePage.locator(".food-log").textContent()).includes("recovery drill meal"), "Fresh profile restores the meal record");
  await restoreContext.close();

  const tamperContext = await browser.newContext({ viewport: { width: 390, height: 900 } });
  const tamperPage = await openApp(tamperContext);
  acceptRestoreDialogs(tamperPage);
  await tamperPage.click("#settingsButton");
  await tamperPage.click('[data-settings-tab="security"]');
  await tamperPage.setInputFiles("[data-backup-import]", tamperedPath);
  await tamperPage.waitForSelector(".toast", { timeout: 10000 });
  const rejection = await tamperPage.locator(".toast").textContent();
  check(/incorrect|damaged|invalid/i.test(rejection), "Tampered backup is rejected through the real import UI");
  await tamperPage.click("#homeButton");
  check(await tamperPage.locator('[data-habit-id="sleep"][aria-pressed="true"]').count() === 0, "Rejected backup cannot replace local data");
  await tamperContext.close();

  const buildSource = readFileSync(join(clientRoot, "build-meta.js"), "utf8");
  report = {
    ok: true,
    generatedAt: new Date().toISOString(),
    build: buildSource.match(/REP_BUILD_VERSION="([^"]+)"/)?.[1] ?? "unknown",
    schema: encrypted.schema,
    checks
  };
} catch (error) {
  report = { ok: false, generatedAt: new Date().toISOString(), error: String(error.message || error), checks };
  throw error;
} finally {
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
  await browser.close();
  server.close();
}

console.log(`Recovery evidence written to ${reportPath}`);
