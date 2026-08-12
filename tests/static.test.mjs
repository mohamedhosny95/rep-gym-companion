import test from "node:test";
import assert from "node:assert/strict";
import {readFile,access,stat} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const read=path=>readFile(join(root,path),"utf8");

test("the mobile shell exposes four primary tabs",async()=>{
  const html=await read("dist/client/index.html"),tabs=[...html.matchAll(/data-app-tab="([^"]+)"/g)].map(match=>match[1]);
  assert.deepEqual(tabs,["home","train","food","health"]);
});

test("every local script in the document exists",async()=>{
  const html=await read("dist/client/index.html"),sources=[...html.matchAll(/<script src="([^"?]+)(?:\?[^\"]*)?"/g)].map(match=>match[1]);
  await Promise.all(sources.map(source=>access(join(root,"dist","client",source))));
  assert.ok(sources.includes("auth.js")); assert.ok(sources.includes("storage.js")); assert.ok(sources.includes("bootstrap.js")); assert.ok(sources.includes("features.js")); assert.ok(sources.includes("health-engine.js"));
  const bootstrap=await read("dist/client/bootstrap.js");for(const source of ["app.js","sync.js","enhancements.js","habits.js"])assert.match(bootstrap,new RegExp(source.replace(".","\\.")));
  assert.doesNotMatch(html,/qrcode\.js/);
});

test("the content-versioned service worker uses network-first navigation and never caches API responses",async()=>{
  const sw=await read("dist/client/sw.js"),meta=await read("dist/client/build-meta.js"),version=meta.match(/REP_BUILD_VERSION="([a-f0-9]{12})"/)?.[1];assert.ok(version,"content build version is generated");assert.match(sw,new RegExp(`rep-companion-\\$\\{BUILD_VERSION\\}`));assert.match(sw,/\.\/auth\.js/);assert.match(sw,/\.\/sync-center\.js/);assert.match(sw,/\.\/health-coverage\.js/);assert.match(sw,/pathname\.startsWith\("\/api\/"\)/);
  assert.match(sw,/request\.mode === "navigate"/);assert.doesNotMatch(sw,/qrcode\.js/);
});

test("the state migration preserves health data and adds coaching preferences",async()=>{
  const js=await read("dist/client/enhancements.js"); for(const field of ["sleepLogs","activeEnergy","lastVitalsImportDate","mealTemplates","savedMeals","connectionCapabilities","lastSyncedAt","healthProfile","healthMetrics","healthSummarySignatures","bodyMeasurements","chargingPlan","workoutChecks","nutritionView","trainingView","systemHealth","syncActivity","settingsSection"])assert.match(js,new RegExp(field)); assert.match(js,/APP_SCHEMA=15/);
});

test("health navigation stays in document flow and synchronization is direct and unified",async()=>{
  const css=await read("dist/client/styles.css"),js=await read("dist/client/enhancements.js"),sync=await read("dist/client/sync.js");
  assert.match(css,/\.health-subnav\{[^}]*position:relative/); assert.doesNotMatch(css,/\.health-subnav\{[^}]*position:sticky/);
  assert.match(sync,/Notion did not return a verified save receipt/); assert.match(js,/Confirmed in Notion/);
  assert.match(sync,/syncEverything/); assert.match(sync,/collectEverything/); assert.match(sync,/data is saved on this device/);
  assert.match(sync,/REQUEST_TIMEOUT_MS=30000/); assert.match(sync,/Nothing was queued/); assert.match(sync,/\/api\/notion-sync/);
  assert.doesNotMatch(sync,/serverJobId|nextAttemptAt|HEARTBEAT_MS|setInterval\(resume/);assert.doesNotMatch(sync,/\/api\/sync-status/);
  const center=await read("dist/client/sync-center.js");assert.match(center,/data-sync-all/);assert.match(center,/There is no device or server queue/);assert.doesNotMatch(center,/data-sync-retry/);
});

test("durable state is split into IndexedDB and optional assets load on demand",async()=>{
  const storage=await read("dist/client/storage.js"),enhancements=await read("dist/client/enhancements.js");
  assert.match(storage,/indexedDB\.open/);assert.match(storage,/syncQueue/);assert.match(storage,/foodEntries/);assert.match(storage,/pagehide/);
  assert.match(enhancements,/loadOptionalScript\("qrcode\.js","qrcode"\)/);assert.match(enhancements,/REP_BUILD_VERSION/);
});

test("daily habits are bilingual, durable, streak-aware, and included in direct sync",async()=>{
  const [habits,sync,app,sw]=await Promise.all([read("dist/client/habits.js"),read("dist/client/sync.js"),read("dist/client/app.js"),read("dist/client/sw.js")]);
  for(const marker of ["Sleep","قيام الليل","صلاة الفجر","Sadqa","صدقة","ورد القرآن","حفظ القرآن","Workout","أذكار الصباح والمساء","Read","Water"])assert.match(habits,new RegExp(marker));
  assert.doesNotMatch(habits,/Fasting|صيام|en:"Charity"/);assert.match(habits,/Read pages of the Quran/);
  assert.match(habits,/state\.daily\.habits/);assert.match(habits,/payloadForDate/);assert.match(habits,/Habit tracker:/);assert.match(habits,/function streak/);assert.match(habits,/Last 7 days/);
  assert.match(sync,/state\.daily\?\.habits/);assert.match(sync,/REP_HABITS\?\.payloadForDate/);assert.match(app,/state\.daily\?\.habits/);assert.match(sw,/\.\/habits\.js/);
});

test("startup and social assets stay within their performance budgets",async()=>{
  const social=await stat(join(root,"dist","client","rep-social-preview.png")),html=await read("dist/client/index.html"),sw=await read("dist/client/sw.js");
  assert.ok(social.size<300_000,`social preview is ${social.size} bytes`);
  assert.doesNotMatch(html,/src="app\.js/);assert.doesNotMatch(html,/src="enhancements\.js/);assert.doesNotMatch(sw,/qrcode\.js/);
});

test("browser pairing keeps only a non-secret marker and synchronizes tabs",async()=>{
  const auth=await read("dist/client/auth.js"),enhancements=await read("dist/client/enhancements.js");
  assert.match(auth,/cookieMarker="cookie"/);assert.match(auth,/BroadcastChannel/);assert.match(auth,/addEventListener\("storage"/);
  assert.doesNotMatch(enhancements,/localStorage\.setItem\(syncKeyStorage,caps\.credential/);
});

test("deployment client is deterministically built from source",async()=>{
  const meta=await read("dist/client/build-meta.js"),version=meta.match(/REP_BUILD_VERSION="([a-f0-9]{12})"/)?.[1];assert.ok(version);
  for(const file of ["build-meta.js","index.html","auth.js","storage.js","ui-state.js","ui-shell.js","bootstrap.js","app.js","sync.js","sync-center.js","styles.css","sw.js","health-data.js","health-engine.js","health-coverage.js","health-ui.js","habits.js","features.js","qrcode.js","enhancements.js"]){
    const source=await readFile(join(root,"src/client",file)).catch(()=>null),deployed=await readFile(join(root,"dist/client",file)).catch(()=>null);
    assert.ok(source,`src/client/${file} exists`);assert.ok(deployed,`dist/client/${file} exists`);const expected=Buffer.from(source.toString("utf8").replaceAll("__BUILD_VERSION__",version));assert.deepEqual(expected,deployed,`${file} is built from src/client`);
  }
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
  assert.match(worker,/Health export is too large/);assert.match(worker,/entries\.length>120/);assert.match(worker,/coverage_minutes/);assert.match(worker,/version:"67"/);assert.match(worker,/sync:\{mode:"direct",queued:false\}/);
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
