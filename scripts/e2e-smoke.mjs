// Headless end-to-end smoke test for the deployed static app. Serves dist/client
// on a local port, drives it with Playwright, and fails the run (non-zero exit)
// on any assertion failure or any console/page error encountered along the way.
// Run with: node scripts/e2e-smoke.mjs
import { chromium } from "playwright";
import http from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..", "dist", "client");
const port = 8934;
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp" };

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split("?")[0]);
  let filePath = normalize(join(root, urlPath === "/" ? "/index.html" : urlPath));
  if (!filePath.startsWith(root) || !existsSync(filePath) || statSync(filePath).isDirectory()) {
    res.writeHead(404); res.end("not found"); return;
  }
  res.writeHead(200, { "content-type": MIME[extname(filePath)] || "application/octet-stream" });
  createReadStream(filePath).pipe(res);
});

const failures = [];
let checks = 0;
function assertTrue(condition, label) {
  checks++;
  if (!condition) failures.push(label);
  console.log(`${condition ? "PASS" : "FAIL"}: ${label}`);
}

await new Promise(resolve => server.listen(port, resolve));
const baseUrl = `http://localhost:${port}`;

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const consoleErrors = [];
try {
  const page = await (await browser.newContext({ viewport: { width: 390, height: 900 } })).newPage();
  page.on("pageerror", err => consoleErrors.push(`pageerror: ${err.message}`));
  page.on("console", msg => { if (msg.type() === "error") consoleErrors.push(`console.error: ${msg.text()}`); });

  await page.goto(baseUrl, { waitUntil: "load" });
  await page.waitForSelector("text=Move well.", { timeout: 10000 });
  assertTrue(true, "Home loads");

  // Regression guard: tapping a session must show a preview, not jump straight in.
  await page.click('[data-session="gym"]');
  await page.waitForTimeout(300);
  assertTrue(await page.locator(".preview-row").count() > 0, "Session tap shows a preview instead of auto-starting");
  assertTrue(!(await page.evaluate(() => document.body.classList.contains("workout-mode"))), "Preview does not engage workout-mode");

  await page.click("[data-start-session]");
  await page.waitForTimeout(300);
  assertTrue(await page.evaluate(() => document.body.classList.contains("workout-mode")), "Start workout enters the player");

  // Regression guard: the rest-timer dock must not block Next/Previous.
  const setButtons = await page.locator("[data-set]").all();
  for (const b of setButtons) { await b.click().catch(() => {}); await page.waitForTimeout(30); }
  await page.waitForTimeout(200);
  const nextBtn = page.locator("[data-next]");
  let nextClickable = true;
  try { await nextBtn.click({ timeout: 3000 }); } catch { nextClickable = false; }
  assertTrue(nextClickable, "Next exercise button is reachable while the rest timer is active");

  // finish the rest of the session
  for (let i = 0; i < 8; i++) {
    const btns = await page.locator("[data-set]").all();
    for (const b of btns) { await b.click().catch(() => {}); await page.waitForTimeout(20); }
    const btn = page.locator("[data-next]");
    if (!(await btn.count())) break;
    const label = await btn.textContent();
    await btn.click().catch(() => {});
    await page.waitForTimeout(200);
    if (/finish/i.test(label || "")) break;
  }
  await page.waitForTimeout(300);
  assertTrue(await page.locator(".complete").count() > 0, "Session completes and shows the completion screen");
  await page.click("[data-home]").catch(() => {});
  await page.waitForTimeout(300);

  await page.click("[data-history]");
  await page.waitForTimeout(300);
  const historyText = await page.locator(".history-list").evaluate(el => el.textContent).catch(() => "");
  assertTrue(historyText.includes("Gym"), "Completed session appears in History");
  await page.click("#homeButton");
  await page.waitForTimeout(200);

  // activity logging
  await page.click("[data-log-activity]");
  await page.waitForTimeout(300);
  await page.fill("[data-activity-minutes]", "40");
  await page.fill("[data-activity-calories]", "300");
  await page.click("[data-save-activity]");
  await page.waitForTimeout(300);
  assertTrue(await page.locator(".activity-panel").count() === 0, "Activity panel closes after save");

  // recovery + sleep
  await page.click("[data-recovery]");
  await page.waitForTimeout(300);
  await page.fill("[data-sleep-bedtime]", "23:00");
  await page.fill("[data-sleep-wake]", "06:00");
  await page.click(".sleep-form button[type=submit]");
  await page.waitForTimeout(300);
  const sleepSummary = await page.locator(".sleep-summary strong").first().textContent().catch(() => "");
  assertTrue(/\d/.test(sleepSummary || ""), "Sleep log saves and shows computed hours");
  await page.click("#homeButton");
  await page.waitForTimeout(200);

  // food
  await page.click('[data-app-tab="food"]');
  await page.waitForTimeout(300);
  await page.fill("[data-food-note]", "test meal");
  await page.click("[data-manual-food]");
  await page.waitForTimeout(300);
  if (await page.locator("[data-save-food]").count()) {
    await page.click("[data-save-food]");
    await page.waitForTimeout(300);
  }
  assertTrue(await page.locator(".food-log article, .food-entry").count() > 0, "Manual food entry is saved and listed");

  // insights
  await page.click('[data-app-tab="insights"]');
  await page.waitForTimeout(300);
  assertTrue(await page.locator(".insight-stats article").count() > 0, "Insights stats render");

  // language toggle
  await page.click("#langButton");
  await page.waitForTimeout(300);
  assertTrue((await page.evaluate(() => document.documentElement.dir)) === "rtl", "Language toggle flips to RTL");
  await page.click("#langButton");
  await page.waitForTimeout(200);

  assertTrue(consoleErrors.length === 0, `No console/page errors during the run (found ${consoleErrors.length})`);
  if (consoleErrors.length) console.log(consoleErrors.join("\n"));
} finally {
  await browser.close();
  server.close();
}

console.log(`\n${checks - failures.length}/${checks} checks passed.`);
if (failures.length) {
  console.error("\nFAILED:\n" + failures.map(f => `  - ${f}`).join("\n"));
  process.exit(1);
}
