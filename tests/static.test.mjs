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

test("every local script in the document exists",async()=>{
  const html=await read("dist/client/index.html"),sources=[...html.matchAll(/<script src="([^"?]+)(?:\?[^\"]*)?"/g)].map(match=>match[1]);
  await Promise.all(sources.map(source=>access(join(root,"dist","client",source))));
  assert.ok(sources.includes("vendor/dompurify.min.js")); assert.ok(sources.includes("safe-dom.js")); assert.ok(sources.includes("auth.js")); assert.ok(sources.includes("storage.js")); assert.ok(sources.includes("bootstrap.js")); assert.ok(sources.includes("features.js")); assert.ok(sources.includes("health-engine.js")); assert.ok(sources.includes("performance-insights.js")); assert.ok(sources.includes("adaptive-coach.js")); assert.ok(sources.includes("training-session.js"));
  const bootstrap=await read("dist/client/bootstrap.js");for(const source of ["app.js","sync-outbox.js","telemetry.js","sync.js","enhancements.js","habits.js","performance-ui.js"])assert.match(bootstrap,new RegExp(source.replace(".","\\.")));
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
});

test("the state migration preserves health data and adds coaching preferences",async()=>{
  const js=await read("dist/client/enhancements.js"); for(const field of ["sleepLogs","activeEnergy","lastVitalsImportDate","mealTemplates","savedMeals","habitOrder","connectionCapabilities","lastSyncedAt","healthProfile","healthMetrics","healthSummarySignatures","bodyMeasurements","chargingPlan","workoutChecks","analyticsGoal","insightControls","analyticsQuestions","onboarding","activeWorkoutPlan","progressionProposals","trainingTargets","nutritionView","trainingView","systemHealth","syncActivity","settingsSection"])assert.match(js,new RegExp(field)); assert.match(js,/APP_SCHEMA=19/);
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
  assert.doesNotMatch(html,/src="app\.js/);assert.doesNotMatch(html,/src="enhancements\.js/);assert.doesNotMatch(sw,/qrcode\.js/);
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
  for(const file of ["safe-dom.js","build-meta.js","index.html","auth.js","storage.js","ui-state.js","ui-shell.js","store.js","importer.js","report-card.js","command-palette.js","recovery-map.js","plate-calculator.js","heart-rate-monitor.js","audio-coach.js","barcode-scanner.js","muscle-heatmap.js","custom-workouts.js","bootstrap.js","adaptive-coach.js","training-session.js","app.js","sync-outbox.js","telemetry.js","sync.js","sync-center.js","styles.css","sw.js","health-data.js","health-engine.js","health-coverage.js","performance-insights.js","offline-nutrition.js","health-ui.js","performance-ui.js","habits.js","features.js","qrcode.js","enhancements.js"]){
    const source=await readFile(join(root,"src/client",file)).catch(()=>null),deployed=await readFile(join(root,"dist/client",file)).catch(()=>null);
    assert.ok(source,`src/client/${file} exists`);assert.ok(deployed,`dist/client/${file} exists`);const expected=Buffer.from(source.toString("utf8").replaceAll("__BUILD_VERSION__",version));assert.deepEqual(expected,deployed,`${file} is built from src/client`);
  }
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
  assert.match(app,/function localDay/);assert.doesNotMatch(app,/function isoDay\(\)\{return new Date\(\)\.toISOString/);assert.match(engine,/date\.getFullYear\(\)/);
  assert.match(storage,/state:\$\{key\}/);assert.match(storage,/JSON\.stringify\(legacy\.local\)/);assert.match(features,/minimumInterval=6\*60\*60\*1000/);
  assert.doesNotMatch(sw,/catch\(\(\) => caches\.match\("\.\/index\.html"\)\)/);
  assert.match(worker,/Health export is too large/);assert.match(worker,/entries\.length\s*>\s*120/);assert.match(worker,/coverage_minutes/);assert.match(worker,/version:\s*"69"/);assert.match(worker,/sync:\s*\{\s*mode:\s*"verified-outbox",\s*queued:\s*true/);
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

test("performance intelligence is local, confidence-scored, and evidence-grounded",async()=>{
  const [engine,ui,enhancements,readme]=await Promise.all([read("dist/client/performance-insights.js"),read("dist/client/performance-ui.js"),read("dist/client/enhancements.js"),read("README.md")]);
  for(const marker of ["function e1rm","function strength","function nutrition","function experiments","function dataQuality","function goalForecast","function inbox","function ask"])assert.match(engine,new RegExp(marker));
  for(const marker of ["GOAL FORECAST","STRENGTH INTELLIGENCE","NUTRITION → OUTCOMES","INSIGHT INBOX","PERSONAL OUTCOME LAB","WHOLE-APP DATA QUALITY","ASK YOUR DATA · LOCAL","No upload"])assert.match(ui,new RegExp(marker));
  assert.doesNotMatch(engine,/\bfetch\s*\(/);assert.doesNotMatch(ui,/\bfetch\s*\(/);assert.match(engine,/language:\s*"association"/);assert.match(engine,/withRows\.length<4\|\|withoutRows\.length<4/);
  for(const field of ["analyticsGoal","insightControls","analyticsQuestions","analyticsLastQuestion"])assert.match(enhancements,new RegExp(field));
  assert.match(readme,/Theil–Sen/);assert.match(readme,/Ask Your Data does not call an external AI service/);
});
