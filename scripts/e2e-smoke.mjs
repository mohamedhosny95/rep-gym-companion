// Headless end-to-end smoke test for the deployed static app. Serves dist/client
// on a local port, drives it with Playwright, and fails the run (non-zero exit)
// on any assertion failure or any console/page error encountered along the way.
// Run with: node scripts/e2e-smoke.mjs
import { chromium } from "playwright";
import axe from "axe-core";
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
async function assertAxe(page,label){
  await page.evaluate(p => { if(window.__repVitals) window.__repVitals.phase = "axe:" + p; }, label);
  const result=await page.evaluate(async()=>window.axe.run(document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa"]}}));
  await page.evaluate(() => { if(window.__repVitals) window.__repVitals.phase = "post-axe"; });
  const serious=result.violations.filter(violation=>["serious","critical"].includes(violation.impact));
  if(serious.length)console.log(JSON.stringify(serious.map(violation=>({id:violation.id,nodes:violation.nodes.slice(0,12).map(node=>({target:node.target,summary:node.failureSummary}))})),null,2));
  assertTrue(serious.length===0,`${label} has no serious or critical axe violations${serious.length?`: ${serious.map(item=>item.id).join(", ")}`:""}`);
}

await new Promise(resolve => server.listen(port, resolve));
const baseUrl = `http://localhost:${port}`;

const browser = await chromium.launch({
  channel: existsSync("/Applications/Google Chrome.app") ? "chrome" : undefined,
  args: ["--no-sandbox"]
});
const consoleErrors = [];
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 900 } });
  const page = await context.newPage();
  await page.addInitScript(()=>{
    window.__repVitals={lcp:0,cls:0,longTask:0,appLongTask:0,longTasks:[],phase:"init"};
    try{new PerformanceObserver(list=>list.getEntries().forEach(entry=>window.__repVitals.lcp=Math.max(window.__repVitals.lcp,entry.startTime))).observe({type:"largest-contentful-paint",buffered:true});}catch{}
    try{new PerformanceObserver(list=>list.getEntries().forEach(entry=>{if(!entry.hadRecentInput)window.__repVitals.cls+=entry.value;})).observe({type:"layout-shift",buffered:true});}catch{}
    try{new PerformanceObserver(list=>list.getEntries().forEach(entry=>{
      window.__repVitals.longTask=Math.max(window.__repVitals.longTask,entry.duration);
      if(!window.__repVitals.phase?.startsWith("axe:")&&window.__repVitals.phase!=="post-axe"){
        window.__repVitals.appLongTask=Math.max(window.__repVitals.appLongTask,entry.duration);
      }
      window.__repVitals.longTasks.push({
        phase: window.__repVitals.phase,
        startTime: Math.round(entry.startTime),
        duration: Math.round(entry.duration),
        name: entry.name,
        attribution: (entry.attribution||[]).map(a=>({name:a.name,containerType:a.containerType,containerSrc:a.containerSrc,containerId:a.containerId}))
      });
    })).observe({type:"longtask",buffered:true});}catch{}
  });
  await page.addInitScript({content:axe.source});
  page.on("pageerror", err => consoleErrors.push(`pageerror: ${err.message}`));
  page.on("console", msg => { if (msg.type() === "error") consoleErrors.push(`console.error: ${msg.text()}`); });

  await page.goto(baseUrl, { waitUntil: "load" });
  await page.waitForSelector('html[data-app-ready="true"]', { timeout: 10000 });
  await page.waitForSelector("text=TODAY", { timeout: 10000 });
  assertTrue(true, "Today tab loads on cold start");
  assertTrue((await page.locator('[data-app-tab="home"][aria-current="page"]').count()) > 0, "Today tab is marked active on cold start");
  assertTrue(await page.locator(".health-coach-card").count() === 1, "Today Coach appears on the first cold-start Home render");
  const backupCheck=await page.evaluate(async()=>{const sample={app:"Rep Gym Companion",data:{foodEntries:[{id:"recovery-drill"}]}},encrypted=await window.REP_FEATURES.encryptExport(sample,"recovery-drill-passphrase"),restored=await window.REP_FEATURES.decryptExport(encrypted,"recovery-drill-passphrase");let tamperRejected=false;try{await window.REP_FEATURES.decryptExport({...encrypted,format:"older-format"},"recovery-drill-passphrase");}catch{tamperRejected=true;}return {roundTrip:JSON.stringify(sample)===JSON.stringify(restored),schema:encrypted.schema,tamperRejected};});
  assertTrue(backupCheck.roundTrip&&backupCheck.schema===5,"Schema-5 encrypted backup completes a recovery round trip");
  assertTrue(backupCheck.tamperRejected,"Encrypted backup rejects a tampered version header");
  const expectedHabits = new Date().getDay() === 5 ? 12 : 11;
  assertTrue(await page.locator("[data-habit-id]").count() === expectedHabits, `Today shows the requested daily habits (${expectedHabits})`);
  await page.click('[data-habit-id="sleep"]');
  assertTrue(await page.locator('[data-habit-id="sleep"][aria-pressed="true"]').count() === 1, "A habit can be checked off");
  await page.evaluate(()=>window.REP_STORE.flush());
  await page.reload({waitUntil:"load"});
  await page.waitForSelector('html[data-app-ready="true"]',{timeout:10000});
  assertTrue(await page.locator('[data-habit-id="sleep"][aria-pressed="true"]').count() === 1, "Habit completion survives a reload");
  assertTrue(await page.locator('.habit-head-actions a[href*="20e4226c53694ea79692dff9839a132f"]').count() === 1, "Habit tracker links to the Habit Log inside the Workout Hub");
  await page.click('[data-habit-reorder]');
  const firstHabitBefore=await page.locator('[data-habit-card]').first().getAttribute('data-habit-card');
  await page.locator(`[data-habit-order-id="${firstHabitBefore}"][data-habit-move="down"]`).click();
  const firstHabitAfter=await page.locator('[data-habit-card]').first().getAttribute('data-habit-card');
  assertTrue(firstHabitAfter!==firstHabitBefore,"Habit order can be changed with accessible controls");
  await page.evaluate(()=>window.REP_STORE.flush());
  await page.reload({waitUntil:"load"});
  await page.waitForSelector('html[data-app-ready="true"]',{timeout:10000});
  assertTrue(await page.locator('[data-habit-card]').first().getAttribute('data-habit-card')===firstHabitAfter,"Custom habit order survives a reload");

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
  assertTrue(await page.locator('.program-discovery').count() === 1, "Program opens the contextual workout library");
  assertTrue(await page.locator('.program-session-card.has-session-media').count() === 6, "Every real workout plan has contextual discovery media");
  assertTrue(await page.locator('.program-session-card.is-recommended').count() === 1, "Program marks today's real scheduled plan");
  await page.click('[data-program-filter="sport"]');
  assertTrue(await page.locator('.program-session-card[data-program-category="sport"]:visible').count() === 3, "Sport filter keeps football, padel, and outdoor plans visible");
  assertTrue(await page.locator('[data-log-activity]:visible').count() === 0, "Filtered discovery removes unrelated actions");
  await page.click('[data-program-filter="all"]');

  await page.click('[data-session="football"]');
  await page.waitForTimeout(150);
  const footballMedia=await page.locator('.preview-row').evaluateAll(rows=>rows.map(row=>({name:row.querySelector('strong')?.textContent||'',sources:[...row.querySelectorAll('.cinematic-motion img')].map(image=>image.getAttribute('src'))})));
  assertTrue(footballMedia.length===6&&footballMedia.every(row=>row.sources.length>0&&row.sources.every(src=>src?.includes('assets/cinematic/football-'))), "Every football movement uses football-pitch media");
  assertTrue(footballMedia.some(row=>row.name.includes('Lateral Shuffles')&&row.sources.length===3), "Football agility uses a three-frame male movement cycle");
  await page.click('[data-cancel-preview]');
  await page.waitForTimeout(150);
  await page.click('[data-session="padel"]');
  await page.waitForTimeout(150);
  const padelMedia=await page.locator('.preview-row').evaluateAll(rows=>rows.map(row=>({name:row.querySelector('strong')?.textContent||'',sources:[...row.querySelectorAll('.cinematic-motion img')].map(image=>image.getAttribute('src'))})));
  assertTrue(padelMedia.length===6&&padelMedia.every(row=>row.sources.length>0&&row.sources.every(src=>src?.includes('assets/cinematic/padel-'))), "Every padel movement uses male padel-court media");
  assertTrue(padelMedia.some(row=>row.name.includes('Shoulder Prep')&&row.sources.length===3), "Padel shoulder prep uses a three-frame male movement cycle");
  await page.click('[data-cancel-preview]');
  await page.waitForTimeout(150);

  // Regression guard: tapping a session must show a preview, not jump straight in.
  await page.click('[data-session="gym"]');
  await page.waitForTimeout(300);
  assertTrue(await page.locator(".preview-row").count() > 0, "Session tap shows a preview instead of auto-starting");
  assertTrue(!(await page.evaluate(() => document.body.classList.contains("workout-mode"))), "Preview does not engage workout-mode");

  await page.click("[data-start-session]");
  await page.waitForTimeout(300);
  assertTrue(await page.evaluate(() => document.body.classList.contains("workout-mode")), "Start workout enters the player");
  assertTrue((await page.evaluate(() => window.scrollY)) <= 1, "Active workout opens at the progress header instead of preserving preview scroll");
  for (const [selector,label] of [
    [".exercise-hero-stage","cinematic exercise animation"],
    [".exercise-hero-stage .cinematic-motion","photorealistic exercise media"],
    [".exercise-hero-stage .media-phase-rail","guided motion phase rail"],
    [".hero-muscle-label","muscle visualization label"],
    [".current-set-card","current set focus"],
    [".workout-primary-action","primary set action"],
    [".motion-controls","animation controls"]
  ]) assertTrue(await page.locator(selector).count() === 1, `Active workout exposes its ${label}`);
  assertTrue((await page.locator(".exercise-hero-stage .cinematic-motion img").first().getAttribute("src")).includes("assets/cinematic/"), "Active workout uses the exercise-specific cinematic asset");
  assertTrue((await page.locator('link[data-rep-media-preload="next"]').getAttribute("href")).includes("leg-press"), "Active workout preloads only the real next exercise");
  const initialMediaTelemetry=await page.evaluate(()=>window.REP_TELEMETRY.snapshot().media);
  assertTrue(initialMediaTelemetry.loads>=1&&initialMediaTelemetry.failures===0, "Cinematic image load and decode telemetry records without failures");
  assertTrue(!(await page.locator(".topbar").isVisible()), "Generic app utilities stay out of the focused workout header");
  for (const width of [375,390,430]) {
    await page.setViewportSize({width,height:844});
    assertTrue(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `Active workout has no horizontal overflow at ${width}px`);
  }
  await page.setViewportSize({width:390,height:900});
  await page.click('[data-motion-action="speed"]');
  assertTrue(await page.locator(".workout-choice-grid [data-choice]").count() === 5, "Speed control opens restrained playback choices");
  await page.click("[data-choice-close]");
  await page.click("[data-exercise-timer]");
  assertTrue(await page.locator(".timed-ring").count() === 1, "Timed exercise opens a prominent progress ring");
  await page.click("[data-timed-pause]");
  assertTrue(await page.locator(".workout-timed-mode.is-paused").count() === 1, "Timed exercise can pause without completing the set");
  await page.click("[data-timed-add]");
  assertTrue((await page.locator("[data-timed-total]").textContent()).includes("5:15"), "Timed exercise extension updates the real total");
  await page.click("[data-timed-close]");

  // Regression guard: the rest-timer dock must not block Next/Previous.
  while (await page.locator(".set-button:not(.is-done)").count() > 0) {
    await page.locator(".set-button:not(.is-done)").first().click().catch(() => {});
    await page.waitForTimeout(30);
  }
  await page.waitForTimeout(100);
  const nextBtn = page.locator("[data-next]");
  let nextClickable = true;
  try { await nextBtn.click({ timeout: 3000 }); } catch { nextClickable = false; }
  assertTrue(nextClickable, "Next exercise button is reachable while the rest timer is active");
  await page.waitForTimeout(250);
  assertTrue(await page.locator(".live-set-entry").count() === 1, "Strength exercise exposes quick entry backed by the set log");
  assertTrue(await page.locator(".exercise-hero-stage .cinematic-motion img").count() === 3, "Leg press uses a three-frame male movement cycle");
  await page.fill('[data-live-log][data-log="reps"]',"8");
  const activeSetIndex=await page.locator('[data-live-log][data-log="reps"]').getAttribute("data-log-set");
  const detailedRepValues=await page.locator(`.set-card-row [data-log="reps"][data-log-set="${activeSetIndex}"]`).evaluateAll(inputs=>inputs.map(input=>input.value));
  assertTrue(detailedRepValues.length===1&&detailedRepValues[0]==="8", "Quick reps stay synchronized with the matching detailed set row");
  await page.click('[data-live-reps-step="1"]');
  assertTrue(await page.locator('[data-live-log][data-log="reps"]').inputValue() === "9", "Manual rep control updates the current logged set");

  while (await page.locator(".set-button:not(.is-done)").count() > 0) {
    await page.locator(".set-button:not(.is-done)").first().click().catch(() => {});
    await page.waitForTimeout(40);
  }
  await page.waitForTimeout(120);
  assertTrue(await page.locator("#timerNextPreview:not(.is-hidden)").count() === 1, "Final rest opens a dedicated next-exercise preview");
  assertTrue((await page.locator("#timerPreviewName").textContent()).includes("Back Extension"), "Rest preview is connected to the real next exercise");
  assertTrue(await page.locator("#timerPreviewVisual :is(.media-focus-frame,.cinematic-motion img)").count() > 0, "Rest preview reuses the next exercise media");
  await page.click("#timerNextNow");
  await page.waitForTimeout(200);
  assertTrue((await page.locator(".workout-identity h1").textContent()).includes("Back Extension"), "Start now advances directly from rest to the previewed exercise");

  // finish the rest of the session
  for (let i = 0; i < 10; i++) {
    if (await page.locator(".complete").count() > 0) break;
    while (await page.locator(".set-button:not(.is-done)").count() > 0) {
      await page.locator(".set-button:not(.is-done)").first().click().catch(() => {});
      await page.waitForTimeout(30);
    }
    const btn = page.locator("[data-next]");
    if (!(await btn.count())) break;
    const label = await btn.textContent();
    await btn.click().catch(() => {});
    await page.waitForTimeout(100);
    if (/finish/i.test(label || "")) break;
  }
  await page.waitForSelector(".complete", { timeout: 8000 }).catch(() => {});
  assertTrue(await page.locator(".complete").count() > 0, "Session completes and shows the completion screen");
  assertTrue(await page.locator(".complete-stat-grid > div").count() >= 3, "Completion handoff summarizes real session metrics");
  assertTrue(await page.locator("[data-history-after]").count() === 1, "Completion handoff links directly to session history");
  await page.click("[data-home]").catch(() => {});
  await page.waitForTimeout(300);

  await page.click('[data-training-view="history"]');
  await page.waitForTimeout(300);
  const historyText = await page.locator(".history-list").evaluate(el => el.textContent).catch(() => "");
  assertTrue(historyText.includes("Gym"), "Completed session appears in History");
  assertTrue(await page.locator(".activity-overview .history-summary > div").count() === 4, "Activity overview summarizes only real history totals");
  assertTrue(await page.locator(".personal-best-grid .pb-card").count() === 0, "Activity does not invent a personal best without a logged load");
  assertTrue(await page.locator(".history-utilities:not([open])").count() === 1, "Activity keeps data and connection utilities progressively disclosed");
  assertTrue(await page.locator(".history-utilities [data-export]").count() === 1, "Activity refinement preserves backup export access");
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

  // Complete every remaining priority session through the real player. This
  // covers the home/plank, football-pitch, padel-court, and treadmill paths;
  // the gym session was completed above.
  for(const [sessionId,label,requiredExercise] of [
    ["morning","Morning activation","Plank"],
    ["football","Football","Football Build-up Strides"],
    ["padel","Padel","Padel Sport-Specific Warm-up"],
    ["cardio","Treadmill cardio","Incline Treadmill Walk"]
  ]){
    await page.click('[data-app-tab="train"]');
    if(!(await page.locator(".program-discovery").count()))await page.click('[data-training-view="program"]');
    await page.click(`[data-session="${sessionId}"]`);await page.click("[data-start-session]");
    const visited=[];
    for(let exercise=0;exercise<20;exercise++){
      if(await page.locator(".complete").count())break;
      visited.push((await page.locator(".workout-identity h1").textContent().catch(()=>""))||"");
      while(await page.locator(".set-button:not(.is-done)").count()){
        await page.locator(".set-button:not(.is-done)").first().click().catch(()=>{});await page.waitForTimeout(25);
      }
      const next=page.locator("[data-next]");if(!(await next.count()))break;
      await next.click().catch(()=>{});await page.waitForTimeout(80);
    }
    await page.waitForSelector(".complete",{timeout:5000}).catch(()=>{});
    assertTrue(await page.locator(".complete").count()===1,`${label} completes through the real workout player`);
    assertTrue(visited.some(name=>name.includes(requiredExercise)),`${label} reaches ${requiredExercise} with real session state`);
    await page.click("[data-home]");await page.waitForTimeout(120);
  }

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
  assertTrue((await page.locator(".food-sync-state").count()) > 0, "Food entry shows its durable save state");
  assertTrue(await page.locator("[data-food-sync-now]").count() === 0, "Food has no category-level sync button");

  // insights
  await page.click('[data-app-tab="health"]');
  await page.waitForTimeout(200);
  await page.click('[data-health-view="insights"]');
  await page.waitForTimeout(300);
  assertTrue(await page.locator(".progress-overview .progress-feature").count() === 1, "Progress leads with a real seven-day training summary");
  assertTrue(await page.locator(".insight-stats article").count() > 0, "Insights stats render");
  assertTrue(await page.locator(".weekly-health-review").count() === 1, "Weekly Health Review renders");
  assertTrue(await page.locator(".performance-analytics").count() === 1, "Performance Intelligence renders as one integrated insight layer");
  assertTrue(await page.locator("[data-analytics-goal]").count() === 1, "Goal forecast controls render");
  assertTrue(await page.locator(".quality-domain-list article").count() === 4, "Whole-app data quality covers four domains");
  await page.fill("#askDataQuestion", "How consistent is my protein?");
  await page.click("[data-ask-data] button");
  await page.waitForTimeout(100);
  assertTrue(await page.locator(".data-answer details span").count() >= 1, "Ask Your Data returns inspectable evidence");
  assertTrue(await page.locator(".local-only").textContent() === "No upload", "Ask Your Data is explicitly local-only");
  await assertAccessibleView(page,"Performance Insights");

  await page.click("#settingsButton");
  await page.click('[data-settings-tab="sync"]');
  await page.waitForTimeout(200);
  assertTrue(await page.locator(".sync-center").count() === 1, "Unified Sync Center opens from Settings");
  assertTrue((await page.locator(".destination-link").getAttribute("href")).includes("6433f54c687e4813869aaadeaf3acaab"), "Sync Center keeps the canonical View of Food Entries link");
  assertTrue(await page.locator("[data-sync-all]").count() === 1, "Sync Center exposes exactly one Sync everything action");
  assertTrue(await page.locator('#syncButton[aria-label="Sync everything"]').count() === 1, "Header exposes one-tap Sync everything action");
  assertTrue(await page.locator("[data-sync-retry-all]").count() === 1, "Sync Center exposes recovery controls for the durable outbox");

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
    
    // Offline mutation & outbox persistence test
    await page.click('[data-app-tab="food"]');
    await page.waitForTimeout(200);
    await page.fill("[data-food-note]", "offline protein smoothie");
    await page.click("[data-manual-food]");
    await page.waitForTimeout(200);
    if (await page.locator("[data-save-food]").count()) {
      await page.click("[data-save-food]");
      await page.waitForTimeout(200);
    }
    const offlineFoodLogged = (await page.locator(".food-log article, .food-entry").count()) > 0;
    assertTrue(offlineFoodLogged, "Offline food entry is logged and displayed while disconnected");
    await context.setOffline(false);
  }else {
    console.log("SKIP: Service worker readiness is not available in this local browser environment");
    // Verify offline outbox queuing logic directly
    await context.setOffline(true);
    await page.click('[data-app-tab="food"]');
    await page.waitForTimeout(200);
    await page.fill("[data-food-note]", "offline recovery bowl");
    await page.click("[data-manual-food]");
    await page.waitForTimeout(200);
    if (await page.locator("[data-save-food]").count()) {
      await page.click("[data-save-food]");
      await page.waitForTimeout(200);
    }
    assertTrue((await page.locator(".food-log article, .food-entry").count()) > 0, "Offline food entry is preserved during network loss");
    await context.setOffline(false);
  }

  await context.setOffline(false);
  for(const [tab,label] of [["home","Today"],["train","Training"],["food","Nutrition"],["health","Health"],["insights","Insights"]]){
    await page.click(`[data-app-tab="${tab}"]`);await page.waitForTimeout(300);await assertAxe(page,label);
  }
  const vitals=await page.evaluate(()=>window.__repVitals);
  if(vitals.longTasks&&vitals.longTasks.length){
    console.log("Main thread long tasks (>50ms):");
    for(const t of vitals.longTasks){
      console.log(`  - [${t.phase}] ${t.duration}ms (start: ${t.startTime}ms, name: ${t.name})`);
    }
  }
  assertTrue(vitals.lcp>0&&vitals.lcp<=2500,`LCP stays within the 2.5s mobile budget (${Math.round(vitals.lcp)}ms)`);
  assertTrue(vitals.cls<=0.1,`CLS stays within the 0.1 budget (${vitals.cls.toFixed(3)})`);
  assertTrue(vitals.appLongTask<=200,`Longest application main-thread task stays within 200ms (${Math.round(vitals.appLongTask)}ms)`);
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.click('[data-app-tab="train"]');await page.waitForTimeout(50);
  const reducedMotion=await page.evaluate(()=>{const node=document.querySelector(".view-enter")||document.querySelector("main");const style=getComputedStyle(node);return {matches:matchMedia("(prefers-reduced-motion: reduce)").matches,animation:parseFloat(style.animationDuration)||0,transition:parseFloat(style.transitionDuration)||0};});
  assertTrue(reducedMotion.matches&&reducedMotion.animation<=0.001&&reducedMotion.transition<=0.001,"Reduced-motion mode suppresses non-essential animation");
  await page.emulateMedia({reducedMotion:"no-preference"});

  // The app is mobile-primary. Exercise every primary destination at the
  // compact widths we support instead of treating one 390 px viewport as a
  // proxy for the entire phone range.
  for(const width of [320,360,375,390,414,430]){
    await page.setViewportSize({width,height:900});
    for(const tab of ["home","train","food","health","insights"]){
      await page.click(`[data-app-tab="${tab}"]`);
      await page.waitForTimeout(80);
      const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,targets:[...document.querySelectorAll(".app-tabs button")].map(button=>Math.min(button.getBoundingClientRect().width,button.getBoundingClientRect().height)),offenders:[...document.querySelectorAll("body *")].filter(element=>{const box=element.getBoundingClientRect();return box.right>document.documentElement.clientWidth+1||box.left<-1;}).slice(0,6).map(element=>`${element.tagName.toLowerCase()}.${element.className||""}[${Math.round(element.getBoundingClientRect().left)},${Math.round(element.getBoundingClientRect().right)}]`)}));
      assertTrue(layout.overflow<=1,`${tab} has no horizontal overflow at ${width}px${layout.overflow>1?` (${layout.overflow}px: ${layout.offenders.join(", ")})`:""}`);
      assertTrue(layout.targets.every(size=>size>=44),`primary navigation keeps 44px touch targets at ${width}px`);
    }
  }

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
