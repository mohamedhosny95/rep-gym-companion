import test from "node:test";
import assert from "node:assert/strict";
import {readFile,readdir,access,stat} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const read=path=>readFile(join(root,path),"utf8");

test("the mobile shell exposes five primary tabs",async()=>{
  const html=await read("dist/client/index.html"),tabs=[...html.matchAll(/data-app-tab="([^"]+)"/g)].map(match=>match[1]);
  assert.deepEqual(tabs,["home","train","food","health","insights"]);
});

test("primary navigation keeps its active indicator aligned and uses the central URL router",async()=>{
  const css=await read("dist/client/styles.css"),enhancements=await read("dist/client/enhancements.js"),navigation=await read("dist/client/navigation.js");
  assert.match(css,/\.app-tabs::before\s*\{[^}]*width:\s*calc\(\(100% - 24px\) \/ 5\)/);
  assert.match(css,/button:nth-child\(5\)\[aria-current="page"\][^}]*translateX\(calc\(400% \+ 12px\)\)/);
  assert.match(css,/@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.app-tabs::before[^}]*transition:\s*none/);
  assert.match(navigation,/history\[replace\?"replaceState":"pushState"\]/);
  assert.match(navigation,/addEventListener\("popstate"/);
  assert.match(navigation,/routeFromLocation/);
  for(const path of ["/training/program","/training/history","/nutrition/plan","/health/wellness","/insights"])assert.ok(enhancements.includes(path));
  assert.match(enhancements,/path:`\/settings\/\$\{section\}`/);
  assert.doesNotMatch(enhancements,/restoringPrimaryTabHistory|rememberPrimaryTab/);
  assert.doesNotMatch(enhancements,/(?:setPrimaryTab|updatePrimaryTabs)=function/);
  assert.doesNotMatch(enhancements,/\["insights","Trends"\]/);
});

test("every local script in the document exists",async()=>{
  const html=await read("dist/client/index.html"),sources=[...html.matchAll(/<script src="([^"?]+)(?:\?[^\"]*)?"/g)].map(match=>match[1]);
  await Promise.all(sources.map(source=>access(join(root,"dist","client",source))));
  assert.ok(sources.includes("vendor/dompurify.min.js")); assert.ok(sources.includes("safe-dom.js")); assert.ok(sources.includes("auth.js")); assert.ok(sources.includes("storage.js")); assert.ok(sources.includes("navigation.js")); assert.ok(sources.includes("bootstrap.js")); assert.ok(sources.includes("features.js")); assert.ok(sources.includes("health-engine.js")); assert.ok(sources.includes("performance-insights.js")); assert.ok(sources.includes("product-suite.js")); assert.ok(sources.includes("adaptive-coach.js")); assert.ok(sources.includes("training-session.js"));
  const bootstrap=await read("dist/client/bootstrap.js");for(const source of ["app.js","sync-outbox.js","telemetry.js","sync.js","enhancements.js","habits.js","performance-ui.js","product-suite-ui.js"])assert.match(bootstrap,new RegExp(source.replace(".","\\.")));
  assert.doesNotMatch(html,/qrcode\.js/);
});

test("all dynamic HTML sinks pass through the shared sanitizer",async()=>{
  const files=(await readdir(join(root,"src","client"))).filter(name=>name.endsWith(".js")&&name!=="safe-dom.js");
  const safeDom=await read("src/client/safe-dom.js");assert.match(safeDom,/DOMPurify\.sanitize/);assert.match(safeDom,/FORBID_TAGS/);assert.match(safeDom,/FORBID_ATTR/);
  for(const name of files){
    const source=await read(`src/client/${name}`),assignments=[...source.matchAll(/innerHTML\s*=\s*/g)],insertions=[...source.matchAll(/insertAdjacentHTML\([^,]+,\s*/g)];
    for(const match of [...assignments,...insertions])assert.ok(source.slice(match.index+match[0].length).startsWith("REP_SAFE_DOM.sanitize("),`${name} has an unsanitized HTML sink`);
  }
});

test("the content-versioned service worker uses network-first navigation and never caches API responses",async()=>{
  const sw=await read("dist/client/sw.js"),meta=await read("dist/client/build-meta.js"),version=meta.match(/REP_BUILD_VERSION="([a-f0-9]{12})"/)?.[1];assert.ok(version,"content build version is generated");assert.match(sw,new RegExp(`rep-companion-\\$\\{BUILD_VERSION\\}`));assert.match(sw,/\.\/auth\.js/);assert.match(sw,/\.\/sync-center\.js/);assert.match(sw,/\.\/health-coverage\.js/);assert.match(sw,/\.\/performance-insights\.js/);assert.match(sw,/pathname\.startsWith\("\/api\/"\)/);
  assert.match(sw,/request\.mode === "navigate"/);assert.doesNotMatch(sw,/qrcode\.js/);
  assert.match(sw,/\.\/navigation\.js/);
});

test("the state migration preserves health data and adds coaching preferences",async()=>{
  const js=await read("dist/client/enhancements.js"); for(const field of ["sleepLogs","activeEnergy","lastVitalsImportDate","mealTemplates","savedMeals","habitOrder","connectionCapabilities","lastSyncedAt","healthProfile","healthMetrics","healthSummarySignatures","bodyMeasurements","chargingPlan","workoutChecks","analyticsGoal","insightControls","analyticsQuestions","onboarding","activeWorkoutPlan","progressionProposals","trainingTargets","nutritionView","trainingView","systemHealth","syncActivity","settingsSection","weekOverrides","scheduleAdjustments","launchEvents","customExperiments","experimentCheckins","exerciseSubstitutions","smartReminders","restTimer"])assert.match(js,new RegExp(field)); assert.match(js,/APP_SCHEMA=21/);
});

test("the September 15 health plan is the app's versioned source of truth and generated from canonical JSON",async()=>{
  const [guide,app,enhancements,canonicalRaw,schemaRaw]=await Promise.all([
    read("dist/client/health-data.js"),
    read("dist/client/app.js"),
    read("dist/client/enhancements.js"),
    read("data/health-plan.json"),
    read("data/health-plan.schema.json")
  ]);

  // Canonical JSON parses and is valid JSON
  const plan = JSON.parse(canonicalRaw);
  assert.equal(plan.version, "2026.09.15");
  assert.equal(plan.updatedAt, "2026-09-15");
  assert.ok(plan.sources && plan.rules && plan.nutrition && plan.hygiene && plan.provenance);

  // Schema parses and defines top-level structure
  const schema = JSON.parse(schemaRaw);
  assert.ok(schema && Array.isArray(schema.required));
  for (const field of ["version", "updatedAt", "sources", "rules", "nutrition", "hygiene", "provenance"]) {
    assert.ok(schema.required.includes(field));
  }

  // Provenance and version markers in dist/client/health-data.js
  assert.match(guide, /Canonical source:\s*data\/health-plan\.json/);
  assert.match(guide, /Canonical SHA-256:\s*[0-9a-f]{64}/);
  assert.match(guide, /canonicalPath:\s*"data\/health-plan\.json"/);
  assert.match(guide, /sha256:\s*"[0-9a-f]{64}"/);

  for(const marker of ["2026.09.15","calories: 2250","calories: 2075","calories: 2150","calorieCeiling: 2480","Creatine monohydrate · 5 g daily","Balance Protein Crackers · half pack","Kerella Monday and Friday only as prescribed"])assert.match(guide,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));
  for(const marker of ["Sun–Thu · Home · 7–10 min","RPE 7–8","Football Warm-up Jog\", \"2 min","Padel Shoulder Prep\", \"2 min","Skip optional step","Jacuzzi</span><strong>10–15","d===\"Mon\"?\"PDL\":d===\"Wed\"?\"FB\""])assert.ok(app.includes(marker),marker);
  assert.match(enhancements,/LEGACY_TARGETS/);
  assert.match(enhancements,/calories:2250,protein:185/);
  assert.match(enhancements,/calories:2075,protein:175/);
  assert.match(enhancements,/calories:2150,protein:175/);
});

test("health-data generator validates and matches canonical data deterministically", async () => {
  const { validateHealthPlan, renderHealthData, normalizeLineEndings } = await import("../scripts/generate-health-data.mjs");
  const canonicalRaw = await readFile(join(root, "data/health-plan.json"), "utf8");
  const normalizedCanonical = normalizeLineEndings(canonicalRaw);
  const plan = JSON.parse(normalizedCanonical);
  assert.doesNotThrow(() => validateHealthPlan(plan));

  const { createHash } = await import("node:crypto");
  const sha256 = createHash("sha256").update(Buffer.from(normalizedCanonical, "utf8")).digest("hex");
  const rendered = renderHealthData(plan, sha256);
  const srcGuide = await read("src/client/health-data.js");
  assert.equal(srcGuide, rendered, "src/client/health-data.js must match deterministic rendered output");
});

test("health-data check path validates CRLF resilience and rejects mutations with end-to-end temp files", async () => {
  const { generateHealthData, renderHealthData, normalizeLineEndings } = await import("../scripts/generate-health-data.mjs");
  const { mkdtemp, mkdir, writeFile, rm, readFile: rf } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const { tmpdir } = await import("node:os");

  const canonicalRaw = await rf(join(root, "data/health-plan.json"), "utf8");
  const lfCanonical = canonicalRaw.replace(/\r\n|\r/g, "\n");
  const crlfCanonical = lfCanonical.replace(/\n/g, "\r\n");

  const plan = JSON.parse(lfCanonical);
  const { createHash } = await import("node:crypto");
  const sha256 = createHash("sha256").update(Buffer.from(lfCanonical, "utf8")).digest("hex");
  const lfGenerated = normalizeLineEndings(renderHealthData(plan, sha256));
  const crlfGenerated = lfGenerated.replace(/\n/g, "\r\n");

  const tempRoot = await mkdtemp(join(tmpdir(), "health-data-test-"));
  try {
    await mkdir(join(tempRoot, "data"), { recursive: true });
    await mkdir(join(tempRoot, "src/client"), { recursive: true });

    // 1. Prove LF canonical + CRLF generated passes
    await writeFile(join(tempRoot, "data/health-plan.json"), lfCanonical);
    await writeFile(join(tempRoot, "src/client/health-data.js"), crlfGenerated);
    assert.doesNotThrow(
      () => generateHealthData({ root: tempRoot, check: true }),
      "LF canonical + CRLF generated must pass"
    );

    // 2. CRLF canonical + LF generated yields the same provenance hash and passes
    await writeFile(join(tempRoot, "data/health-plan.json"), crlfCanonical);
    await writeFile(join(tempRoot, "src/client/health-data.js"), lfGenerated);
    const result = generateHealthData({ root: tempRoot, check: true });
    assert.equal(result.sha256, sha256, "CRLF canonical must yield the same hash");

    // 3. Substantive one-character mutation throws
    const mutatedGenerated = lfGenerated.replace("2250", "2251");
    await writeFile(join(tempRoot, "src/client/health-data.js"), mutatedGenerated);
    assert.throws(
      () => generateHealthData({ root: tempRoot, check: true }),
      /stale or differs/,
      "Check must reject a substantive one-character mutation"
    );

    // 4. Missing generated file throws
    await rm(join(tempRoot, "src/client/health-data.js"));
    assert.throws(
      () => generateHealthData({ root: tempRoot, check: true }),
      /does not exist/,
      "Check must reject missing generated file"
    );

  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("health-data validator rejects fractional integers, invalid calories, four-column meals, and empty supplements", async () => {
  const { validateHealthPlan, normalizeLineEndings } = await import("../scripts/generate-health-data.mjs");
  const canonicalRaw = await readFile(join(root, "data/health-plan.json"), "utf8");
  const basePlan = JSON.parse(normalizeLineEndings(canonicalRaw));

  // 1. Fractional integer rule
  const planWithFractional = structuredClone(basePlan);
  planWithFractional.rules.redFlagThreshold = 2.5;
  assert.throws(
    () => validateHealthPlan(planWithFractional),
    /rules\.redFlagThreshold/,
    "Must reject fractional integer rule"
  );

  // 2. Calories below 500
  const planWithLowCalories = structuredClone(basePlan);
  planWithLowCalories.nutrition.targets.gym.calories = 499;
  assert.throws(
    () => validateHealthPlan(planWithLowCalories),
    /calories/i,
    "Must reject calories below 500"
  );

  // 3. Four-column meal row
  const planWithFourColMeal = structuredClone(basePlan);
  planWithFourColMeal.nutrition.meals.gym[0] = ["06:30", "Omelette", "~530 kcal", "Extra Fourth Column"];
  assert.throws(
    () => validateHealthPlan(planWithFourColMeal),
    /Invalid meal entry/i,
    "Must reject meal row with four items"
  );

  // 4. Empty supplement list
  const planWithEmptySupplements = structuredClone(basePlan);
  planWithEmptySupplements.nutrition.supplements = [];
  assert.throws(
    () => validateHealthPlan(planWithEmptySupplements),
    /nutrition\.supplements/i,
    "Must reject empty supplement list"
  );
});

test("canonical health plan records all five upstream source files with explicitly unrecorded hashes", async () => {
  const canonicalRaw = await readFile(join(root, "data/health-plan.json"), "utf8");
  const plan = JSON.parse(canonicalRaw);

  assert.ok(plan.provenance && Array.isArray(plan.provenance.sourceDocuments));
  assert.equal(plan.provenance.sourceDocuments.length, 5);

  const expectedSources = [
    { fileName: "Training-Recovery-Guide.pdf", role: "training" },
    { fileName: "hygiene-routine-daily.pdf", role: "hygiene" },
    { fileName: "Mohamed_Nutrition_Plan.pdf", role: "nutrition" },
    { fileName: "Master-Health-Plan.md", role: "master" },
    { fileName: "exercises.json", role: "training structure" }
  ];

  for (const expected of expectedSources) {
    const doc = plan.provenance.sourceDocuments.find(d => d.fileName === expected.fileName);
    assert.ok(doc, `Source document ${expected.fileName} must be present`);
    assert.equal(doc.role, expected.role);
    assert.equal(doc.contentSha256, null, `Original hash for ${expected.fileName} must be null (unrecorded)`);
    assert.ok(typeof doc.status === "string" && doc.status.length > 0, "Must include concise status/reason");
  }
});

test("health navigation stays in document flow and synchronization uses a verified durable outbox",async()=>{
  const css=await read("dist/client/styles.css"),js=await read("dist/client/enhancements.js"),sync=await read("dist/client/sync.js"),outbox=await read("dist/client/sync-outbox.js");
  assert.match(css,/\.health-subnav\{[^}]*position:relative/); assert.doesNotMatch(css,/\.health-subnav\{[^}]*position:sticky/);
  assert.match(sync,/Notion did not return a verified save receipt/); assert.match(js,/Confirmed in Notion/);
  assert.match(sync,/syncEverything/); assert.match(sync,/collectEverything/); assert.match(sync,/processOutbox/);
  assert.match(sync,/REQUEST_TIMEOUT_MS=30000/); assert.match(sync,/nextAttemptAt/); assert.match(sync,/\/api\/notion-sync/);
  assert.match(outbox,/MAX_ATTEMPTS=12/);assert.match(outbox,/retryable_failed/);assert.match(outbox,/permanently_failed/);assert.doesNotMatch(sync,/serverJobId|HEARTBEAT_MS/);assert.doesNotMatch(sync,/\/api\/sync-status/);
  const center=await read("dist/client/sync-center.js");assert.match(center,/data-sync-all/);assert.match(center,/durable device outbox/);assert.match(center,/data-sync-retry-all/);
  const index=await read("dist/client/index.html");assert.match(index,/id="syncButton" aria-label="Sync everything"/);
});

test("durable state is split into IndexedDB and optional assets load on demand",async()=>{
  const storage=await read("dist/client/storage.js"),enhancements=await read("dist/client/enhancements.js");
  assert.match(storage,/indexedDB\.open/);assert.match(storage,/syncQueue/);assert.match(storage,/outbox/);assert.match(storage,/foodEntries/);assert.match(storage,/pagehide/);
  assert.match(enhancements,/loadOptionalScript\("qrcode\.js","qrcode"\)/);assert.match(enhancements,/REP_BUILD_VERSION/);
});

test("daily habits are durable, streak-aware, and included in direct sync",async()=>{
  const [habits,sync,app,sw,worker]=await Promise.all([read("dist/client/habits.js"),read("dist/client/sync.js"),read("dist/client/app.js"),read("dist/client/sw.js"),read("dist/server/index.js")]);
  for(const marker of ["Sleep","Night prayer","Fajr prayer","Sadqa","Quran wird","Quran memorization","Workout","Morning & evening adhkar","Reading","Water"])assert.match(habits,new RegExp(marker));
  assert.doesNotMatch(habits,/Fasting|en:"Charity"|30 minutes/);assert.match(habits,/Read pages of the Quran/);
  assert.match(habits,/state\.daily\.habits/);assert.match(habits,/payloadForDate/);assert.match(habits,/Habit tracker:/);assert.match(habits,/function streak/);assert.match(habits,/Last 7 days/);
  assert.match(habits,/state\.habitOrder/);assert.match(habits,/data-habit-reorder/);assert.match(habits,/data-habit-move/);assert.match(habits,/dragstart/);assert.match(habits,/Open Habit Log/);assert.match(habits,/queueHealth\("habit"/);
  assert.match(sync,/state\.daily\?\.habits/);assert.match(sync,/REP_HABITS\?\.payloadForDate/);assert.match(sync,/payloadForHabit/);assert.match(app,/state\.daily\?\.habits/);assert.match(sw,/\.\/habits\.js/);
  assert.match(worker,/function habitProperties/);assert.match(worker,/existingHabitPage/);assert.match(worker,/NOTION_HABIT_DATA_SOURCE_ID/);
});

test("startup and social assets stay within their performance budgets",async()=>{
  const social=await stat(join(root,"dist","client","rep-social-preview.png")),html=await read("dist/client/index.html"),sw=await read("dist/client/sw.js");
  assert.ok(social.size<300_000,`social preview is ${social.size} bytes`);
  assert.doesNotMatch(html,/src="app\.js/);assert.doesNotMatch(html,/src="enhancements\.js/);assert.match(html,/src="navigation\.js/);assert.doesNotMatch(sw,/qrcode\.js/);
});

test("timer chimes and the audio coach share one browser audio context",async()=>{
  const app=await read("dist/client/app.js"),coach=await read("dist/client/audio-coach.js");
  assert.match(app,/window\._repAudioCtx=new \(window\.AudioContext\|\|window\.webkitAudioContext\)\(\)/);
  assert.match(app,/audioCtx=window\._repAudioCtx/);
  assert.match(coach,/window\._repAudioCtx \|\| \(window\._repAudioCtx = new/);
});

test("priority cinematic motions use complete, mobile-sized three-frame cycles",async()=>{
  const app=await read("dist/client/app.js"),css=await read("dist/client/styles.css"),block=app.match(/const cinematicMotionFrames = \{([\s\S]+?)\n\};/)?.[1]||"";
  const assets=[...block.matchAll(/"(assets\/cinematic\/[^\"]+\.webp)"/g)].map(match=>match[1]);
  assert.equal(assets.length,39,"thirteen priority exercises each declare three frames");
  for(const asset of assets){
    const file=await stat(join(root,"dist","client",asset));
    assert.ok(file.size<180_000,`${asset} is ${file.size} bytes`);
  }
  assert.match(css,/cinematicFrameOne/);assert.match(css,/cinematicFrameTwo/);assert.match(css,/cinematicFrameThree/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)[\s\S]*?cinematic-motion>\.cinematic-frame:not\(:first-of-type\)\{opacity:0\}/);
});

test("active workout media stays bounded and exposes decode telemetry",async()=>{
  const app=await read("dist/client/app.js"),telemetry=await read("dist/client/telemetry.js");
  assert.match(app,/function primeUpcomingCinematicMedia/);assert.match(app,/data-rep-media-preload/);assert.match(app,/session\?\.exercises\?\.\[index\+1\]/);
  assert.match(app,/function observeCinematicMedia/);assert.match(app,/img\.decode/);assert.match(app,/recordMedia/);
  assert.match(telemetry,/mediaLoadMs:1200/);assert.match(telemetry,/mediaDecodeMs:120/);assert.match(telemetry,/recordMedia/);assert.match(telemetry,/maxDecodeMs/);
});

test("program discovery filters the real workout sessions without replacing their handlers",async()=>{
  const app=await read("dist/client/app.js"),enhancements=await read("dist/client/enhancements.js"),css=await read("dist/client/styles.css");
  assert.match(app,/data-program-category/);assert.match(app,/data-session="\$\{id\}"/);assert.match(app,/session-card-media/);
  for(const filter of ["all","gym","home","sport","cardio"])assert.match(enhancements,new RegExp(`\\[\\"${filter}\\"`));
  assert.match(enhancements,/data-program-filter="\$\{id\}"/);
  assert.match(enhancements,/card\.hidden=filter!=="all"/);assert.match(enhancements,/sessionGrid\?\.querySelectorAll\("\[data-session\]"\)/);
  assert.match(css,/\.program-discovery/);assert.match(css,/\.program-session-card\.has-session-media/);
});

test("browser pairing keeps only a non-secret marker and synchronizes tabs",async()=>{
  const auth=await read("dist/client/auth.js"),enhancements=await read("dist/client/enhancements.js");
  assert.match(auth,/cookieMarker="cookie"/);assert.match(auth,/BroadcastChannel/);assert.match(auth,/addEventListener\("storage"/);
  assert.doesNotMatch(enhancements,/localStorage\.setItem\(syncKeyStorage,caps\.credential/);
});

test("deployment client is deterministically built from source",async()=>{
  const meta=await read("dist/client/build-meta.js"),version=meta.match(/REP_BUILD_VERSION="([a-f0-9]{12})"/)?.[1];assert.ok(version);
  for(const file of ["safe-dom.js","build-meta.js","index.html","auth.js","storage.js","ui-state.js","ui-shell.js","store.js","importer.js","report-card.js","command-palette.js","recovery-map.js","plate-calculator.js","heart-rate-monitor.js","audio-coach.js","barcode-scanner.js","muscle-heatmap.js","custom-workouts.js","bootstrap.js","adaptive-coach.js","training-session.js","app.js","sync-outbox.js","telemetry.js","sync.js","sync-center.js","styles.css","sw.js","health-data.js","health-engine.js","health-coverage.js","performance-insights.js","product-suite.js","product-suite-ui.js","offline-nutrition.js","health-ui.js","performance-ui.js","habits.js","features.js","qrcode.js","enhancements.js"]){
    const source=await readFile(join(root,"src/client",file)).catch(()=>null),deployed=await readFile(join(root,"dist/client",file)).catch(()=>null);
    assert.ok(source,`src/client/${file} exists`);assert.ok(deployed,`dist/client/${file} exists`);const expected=Buffer.from(source.toString("utf8").replaceAll("__BUILD_VERSION__",version));assert.deepEqual(expected,deployed,`${file} is built from src/client`);
  }
  const navigationSource=await readFile(join(root,"src/client/navigation.js")),navigationBuilt=await readFile(join(root,"dist/client/navigation.js"));
  assert.deepEqual(navigationSource,navigationBuilt,"navigation.js is built from src/client");
});

test("deployment Worker is deterministically built from source",async()=>{
  const source=await read("src/server/index.js"),deployed=await read("dist/server/index.js");
  assert.match(source,/durable-objects\/device-coordinator\.ts/);assert.match(deployed,/DeviceCoordinator = class extends DurableObject/);assert.match(deployed,/validateTelemetry/);assert.doesNotMatch(deployed,/from "\.\/contracts\.ts"/);
});

test("offline versions, local dates, durable storage, and accessibility stay aligned",async()=>{
  const [html,bootstrap,sw,app,engine,storage,features,enhancements,css,worker]=await Promise.all([
    read("dist/client/index.html"),read("dist/client/bootstrap.js"),read("dist/client/sw.js"),read("dist/client/app.js"),read("dist/client/health-engine.js"),read("dist/client/storage.js"),read("dist/client/features.js"),read("dist/client/enhancements.js"),read("dist/client/styles.css"),read("dist/server/index.js")
  ]);
  assert.match(bootstrap,/REP_BUILD_VERSION/);assert.match(sw,/BUILD_VERSION/);assert.doesNotMatch(enhancements,/\?v=6[0-9]/);
  assert.doesNotMatch(html,/id="app" aria-live/);assert.match(enhancements,/role","dialog"/);assert.match(css,/font-size:16px/);
  assert.match(app,/function localDay/);assert.doesNotMatch(app,/function isoDay\(\)\{return new Date\(\)\.toISOString/);assert.match(engine,/\.getFullYear\(\)/);
  assert.match(storage,/state:\$\{key\}/);assert.match(storage,/JSON\.stringify\(legacy\.local\)/);assert.match(features,/minimumInterval=6\*60\*60\*1000/);
  assert.doesNotMatch(sw,/catch\(\(\) => caches\.match\("\.\/index\.html"\)\)/);
  assert.match(worker,/Health export is too large/);assert.match(worker,/entries\.length\s*>\s*120/);assert.match(worker,/coverage_minutes/);assert.match(worker,/version:\s*"71"/);assert.match(worker,/sync:\s*\{\s*mode:\s*"verified-outbox",\s*queued:\s*true/);
});

test("coverage-aware health features and native companion stay wired",async()=>{
  const [html,bootstrap,coverage,ui,storage,readme,swift]=await Promise.all([
    read("dist/client/index.html"),read("dist/client/bootstrap.js"),read("dist/client/health-coverage.js"),read("dist/client/health-ui.js"),read("dist/client/storage.js"),read("ios/RepHealthCompanion/README.md"),read("ios/RepHealthCompanion/HealthKitSyncCoordinator.swift")
  ]);
  assert.match(html,/health-coverage\.js\?v=[a-f0-9]{12}/);assert.match(bootstrap,/health-ui\.js/);
  for(const marker of ["coverage","longTerm","chargingAdvice","workoutGuard"])assert.match(coverage,new RegExp(marker));
  for(const marker of ["MORNING CHECK","WORKOUT PREFLIGHT","PERSONAL BASELINE","data-health-report","healthWorkflow","workout-preflight-panel"])assert.match(ui,new RegExp(marker));
  assert.match(storage,/bodyMeasurements/);assert.match(storage,/healthMetrics/);
  assert.match(readme,/Background Delivery/);assert.match(swift,/HKObserverQuery/);assert.match(swift,/enableBackgroundDelivery/);assert.match(swift,/KeychainStore/);
});

test("post-launch suite ships encrypted reports, photos, reminders, resume state, and native Live Activities",async()=>{
  const [suite,ui,features,app,sw,info,controller,intents,widget,worker]=await Promise.all([read("dist/client/product-suite.js"),read("dist/client/product-suite-ui.js"),read("dist/client/features.js"),read("dist/client/app.js"),read("dist/client/sw.js"),read("ios/RepHealthCompanion/Info.plist"),read("ios/RepHealthCompanion/WorkoutLiveActivityController.swift"),read("ios/RepHealthCompanion/WorkoutLiveActivityIntents.swift"),read("ios/RepHealthCompanion/RepWorkoutLiveActivityWidget.swift"),read("src/server/durable-objects/device-coordinator.ts")]);
  for(const marker of ["reconcileSchedule","analyzeExperiments","weeklySummary","createPrivateWeeklyLink","availableSubstitutions"])assert.match(suite,new RegExp(marker));
  for(const marker of ["PERSONAL OUTCOME LAB","ENCRYPTED PROGRESS VAULT","SMART REMINDERS","Save PDF"])assert.match(ui,new RegExp(marker));
  assert.match(features,/saveProgressPhoto/);assert.match(features,/AES-GCM/);assert.match(app,/resumePersistedRestTimer/);assert.match(sw,/resume-workout/);
  assert.match(info,/NSSupportsLiveActivities/);assert.match(controller,/Activity\.request/);assert.match(intents,/LiveActivityIntent/);assert.match(widget,/ActivityConfiguration/);assert.match(worker,/nextReminderEvent/);
});

test("performance intelligence is local, confidence-scored, and evidence-grounded",async()=>{
  const [engine,ui,enhancements,readme]=await Promise.all([read("dist/client/performance-insights.js"),read("dist/client/performance-ui.js"),read("dist/client/enhancements.js"),read("README.md")]);
  for(const marker of ["function e1rm","function strength","function nutrition","function experiments","function dataQuality","function goalForecast","function inbox","function ask"])assert.match(engine,new RegExp(marker));
  for(const marker of ["GOAL FORECAST","STRENGTH INTELLIGENCE","NUTRITION → OUTCOMES","INSIGHT INBOX","PERSONAL OUTCOME LAB","WHOLE-APP DATA QUALITY","ASK YOUR DATA · LOCAL","No upload"])assert.match(ui,new RegExp(marker));
  assert.doesNotMatch(engine,/\bfetch\s*\(/);assert.doesNotMatch(ui,/\bfetch\s*\(/);assert.match(engine,/language:\s*"association"/);assert.match(engine,/withRows\.length<4\|\|withoutRows\.length<4/);
  for(const field of ["analyticsGoal","insightControls","analyticsQuestions","analyticsLastQuestion"])assert.match(enhancements,new RegExp(field));
  assert.match(readme,/Theil–Sen/);assert.match(readme,/Ask Your Data does not call an external AI service/);
});
