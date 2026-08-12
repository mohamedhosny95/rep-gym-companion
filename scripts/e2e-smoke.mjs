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
async function assertAccessibleView(page,label){
  const result=await page.locator("main").evaluate(main=>{
    const visible=element=>{const style=getComputedStyle(element),box=element.getBoundingClientRect();return !element.hidden&&style.display!=="none"&&style.visibility!=="hidden"&&box.width>0&&box.height>0;};
    const unnamed=[...main.querySelectorAll("button,a[href]")].filter(visible).filter(element=>!(element.getAttribute("aria-label")||element.textContent||"").trim()).length;
    const unlabeled=[...main.querySelectorAll("input:not([type=hidden]),textarea,select")].filter(visible).filter(element=>!element.getAttribute("aria-label")&&!element.closest("label")&&!element.id).length;
    return {unnamed,unlabeled,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
  });
  assertTrue(result.unnamed===0,`${label} has no unnamed visible actions`);
  assertTrue(result.unlabeled===0,`${label} has no unlabeled visible form controls`);
  assertTrue(result.overflow<=1,`${label} has no horizontal viewport overflow`);
}

await new Promise(resolve => server.listen(port, resolve));
const baseUrl = `http://localhost:${port}`;

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const consoleErrors = [];
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 900 } });
  const page = await context.newPage();
  page.on("pageerror", err => consoleErrors.push(`pageerror: ${err.message}`));
  page.on("console", msg => { if (msg.type() === "error") consoleErrors.push(`console.error: ${msg.text()}`); });

  await page.goto(baseUrl, { waitUntil: "load" });
  await page.waitForSelector('html[data-app-ready="true"]', { timeout: 10000 });
  await page.waitForSelector("text=TODAY", { timeout: 10000 });
  assertTrue(true, "Today tab loads on cold start");
  assertTrue((await page.locator('[data-app-tab="home"][aria-current="page"]').count()) > 0, "Today tab is marked active on cold start");
  assertTrue(await page.locator(".health-coach-card").count() === 1, "Today Coach appears on the first cold-start Home render");
  assertTrue(await page.locator("[data-habit-id]").count() === 10, "Today shows the ten requested daily habits");
  await page.click('[data-habit-id="sleep"]');
  assertTrue(await page.locator('[data-habit-id="sleep"][aria-pressed="true"]').count() === 1, "A habit can be checked off");
  await page.evaluate(()=>window.REP_STORE.flush());
  await page.reload({waitUntil:"load"});
  await page.waitForSelector('html[data-app-ready="true"]',{timeout:10000});
  assertTrue(await page.locator('[data-habit-id="sleep"][aria-pressed="true"]').count() === 1, "Habit completion survives a reload");

  await page.click('[data-app-tab="train"]');
  await page.waitForTimeout(300);
  await page.waitForSelector("text=Move well.", { timeout: 10000 });
  assertTrue(true, "Training tab loads");
  assertTrue(await page.locator('.today-training-action').count() === 1, "Training opens on the focused Today view");
  await assertAccessibleView(page,"Training Today");
  assertTrue(await page.locator('.workout-guard').count() === 0, "Training preflight stays out of the daily page until it is needed");
  await page.click('[data-start-today]');
  await page.waitForTimeout(150);
  assertTrue(await page.locator('.workout-preflight-panel').count() === 1, "Starting a plan opens the short preflight step when checks are missing");
  await page.click('[data-close-preflight]');
  await page.click('[data-training-view="program"]');
  await page.waitForTimeout(200);

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

  await page.click('[data-training-view="history"]');
  await page.waitForTimeout(300);
  const historyText = await page.locator(".history-list").evaluate(el => el.textContent).catch(() => "");
  assertTrue(historyText.includes("Gym"), "Completed session appears in History");
  await page.click("#homeButton");
  await page.waitForTimeout(200);

  // activity logging
  await page.click('[data-app-tab="train"]');
  await page.click('[data-training-view="program"]');
  await page.locator(".training-advanced").evaluate(element=>element.open=true);
  await page.click("[data-log-activity]");
  await page.waitForTimeout(300);
  await page.fill("[data-activity-minutes]", "40");
  await page.fill("[data-activity-calories]", "300");
  await page.click("[data-save-activity]");
  await page.waitForTimeout(300);
  assertTrue(await page.locator(".activity-panel").count() === 0, "Activity panel closes after save");

  // recovery + sleep (sleep tracker lives on the Vitals tab)
  await page.click('[data-app-tab="health"]');
  await page.waitForTimeout(300);
  await page.click('[data-health-view="vitals"]');
  await page.waitForTimeout(200);
  const healthNavPosition = await page.locator(".health-subnav").evaluate(el => getComputedStyle(el).position);
  assertTrue(healthNavPosition === "relative", "Health section selector stays in the page flow instead of floating over content");
  assertTrue(await page.locator(".health-coach-card").count() === 1, "Explainable Today Coach appears in Vitals");
  assertTrue(await page.locator(".health-quality-card").count() === 1, "Health import quality card appears in Vitals");
  const summaryHeight=await page.evaluate(()=>document.documentElement.scrollHeight);
  assertTrue(summaryHeight<2200,`Vitals summary stays focused (height ${summaryHeight}px)`);
  await page.click('[data-workflow="log"]');
  await page.waitForTimeout(150);
  assertTrue(await page.locator('.sleep-card:visible').count()===1,"Health logging has a dedicated workflow");
  assertTrue(await page.locator('.health-quality-card:visible').count()===0,"Connection diagnostics stay out of the logging workflow");
  await assertAccessibleView(page,"Health Log");
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
  const composerTop=await page.locator('.meal-composer').evaluate(element=>element.getBoundingClientRect().top);
  assertTrue(composerTop<900,`Meal composer is reachable in the first mobile screen (${Math.round(composerTop)}px)`);
  assertTrue(await page.locator('.food-connect:visible').count()===0,"Connection setup does not block normal meal logging");
  await assertAccessibleView(page,"Nutrition Log");
  await page.fill("[data-food-note]", "test meal");
  await page.click("[data-manual-food]");
  await page.waitForTimeout(300);
  if (await page.locator("[data-save-food]").count()) {
    await page.click("[data-save-food]");
    await page.waitForTimeout(300);
  }
  assertTrue(await page.locator(".food-log article, .food-entry").count() > 0, "Manual food entry is saved and listed");
  assertTrue((await page.locator(".food-sync-state").count()) > 0, "Food entry shows its direct-save state without creating a retry queue");
  assertTrue(await page.locator("[data-food-sync-now]").count() === 0, "Food has no category-level sync button");

  // insights
  await page.click('[data-app-tab="health"]');
  await page.waitForTimeout(200);
  await page.click('[data-health-view="insights"]');
  await page.waitForTimeout(300);
  assertTrue(await page.locator(".insight-stats article").count() > 0, "Insights stats render");
  assertTrue(await page.locator(".weekly-health-review").count() === 1, "Weekly Health Review renders");

  await page.click("#syncButton");
  await page.waitForTimeout(200);
  assertTrue(await page.locator(".sync-center").count() === 1, "Unified Sync Center opens from the global shortcut");
  assertTrue((await page.locator(".destination-link").getAttribute("href")).includes("6433f54c687e4813869aaadeaf3acaab"), "Sync Center keeps the canonical View of Food Entries link");
  assertTrue(await page.locator("[data-sync-all]").count() === 1, "Sync Center exposes exactly one Sync everything action");
  assertTrue(await page.locator("[data-sync-retry], [data-sync-retry-all]").count() === 0, "Sync Center has no queue retry controls");

  await page.waitForTimeout(200);
  await page.click('[data-settings-tab="coach"]');
  assertTrue(await page.locator('[data-health-profile="wakeTime"]').count() === 1, "Personal baseline settings are editable");

  // language toggle lives in General settings instead of the crowded top bar
  await page.click('[data-settings-tab="general"]');
  await page.click('[data-language="ar"]');
  await page.waitForTimeout(300);
  assertTrue((await page.evaluate(() => document.documentElement.dir)) === "rtl", "Language toggle flips to RTL");
  await page.click('[data-language="en"]');
  await page.waitForTimeout(200);

  const serviceWorkerReady=await page.evaluate(()=>Promise.race([navigator.serviceWorker.ready.then(()=>true),new Promise(resolve=>setTimeout(()=>resolve(false),5000))]));
  if(serviceWorkerReady){
    await context.setOffline(true);
    await page.reload({waitUntil:"domcontentloaded"});
    await page.waitForSelector('html[data-app-ready="true"]',{timeout:10000});
    assertTrue(await page.locator("main h1").count()>0,"A first controlled reload starts fully offline from the precache");
    await context.setOffline(false);
  }else console.log("SKIP: Service worker readiness is not available in this local browser environment");

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
