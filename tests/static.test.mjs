import test from "node:test";
import assert from "node:assert/strict";
import {readFile,access,stat} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const read=path=>readFile(join(root,path),"utf8");

test("the mobile shell exposes four primary tabs",async()=>{
  const html=await read("outputs/index.html"),tabs=[...html.matchAll(/data-app-tab="([^"]+)"/g)].map(match=>match[1]);
  assert.deepEqual(tabs,["home","train","food","health"]);
});

test("every local script in the document exists",async()=>{
  const html=await read("outputs/index.html"),sources=[...html.matchAll(/<script src="([^"?]+)(?:\?[^\"]*)?"/g)].map(match=>match[1]);
  await Promise.all(sources.map(source=>access(join(root,"outputs",source))));
  assert.ok(sources.includes("auth.js")); assert.ok(sources.includes("storage.js")); assert.ok(sources.includes("bootstrap.js")); assert.ok(sources.includes("features.js")); assert.ok(sources.includes("health-engine.js"));
  const bootstrap=await read("outputs/bootstrap.js");for(const source of ["app.js","sync.js","enhancements.js"])assert.match(bootstrap,new RegExp(source.replace(".","\\.")));
  assert.doesNotMatch(html,/qrcode\.js/);
});

test("the v63 service worker uses network-first navigation and never caches API responses",async()=>{
  const sw=await read("outputs/sw.js"); assert.match(sw,/rep-companion-v63/); assert.match(sw,/auth\.js\?v=63/); assert.match(sw,/pathname\.startsWith\("\/api\/"\)/);
  assert.match(sw,/request\.mode === "navigate"/);assert.doesNotMatch(sw,/qrcode\.js/);
});

test("the state migration preserves health data and adds coaching preferences",async()=>{
  const js=await read("outputs/enhancements.js"); for(const field of ["sleepLogs","activeEnergy","lastVitalsImportDate","mealTemplates","savedMeals","connectionCapabilities","lastSyncedAt","healthProfile","healthMetrics","healthSummarySignatures","nutritionView","trainingView","systemHealth"])assert.match(js,new RegExp(field)); assert.match(js,/APP_SCHEMA=11/);
});

test("health navigation stays in document flow and food sync requires a verified receipt",async()=>{
  const css=await read("outputs/styles.css"),js=await read("outputs/enhancements.js"),sync=await read("outputs/sync.js");
  assert.match(css,/\.health-subnav\{[^}]*position:relative/); assert.doesNotMatch(css,/\.health-subnav\{[^}]*position:sticky/);
  assert.match(sync,/Notion did not return a verified save receipt/); assert.match(js,/Confirmed in Notion/);
  assert.match(sync,/syncPending=async function\(force=false\)/); assert.match(sync,/delete item\.nextAttemptAt/); assert.match(sync,/entry\.notionError/);
  assert.match(sync,/REQUEST_TIMEOUT_MS=25000/); assert.match(sync,/HEARTBEAT_MS=60000/); assert.match(sync,/Notion confirmation timed out/);
  assert.match(sync,/addEventListener\("pageshow",resume\)/); assert.match(sync,/addEventListener\("focus",resume\)/); assert.match(sync,/setInterval\(resume,HEARTBEAT_MS\)/);
});

test("durable state is split into IndexedDB and optional assets load on demand",async()=>{
  const storage=await read("outputs/storage.js"),enhancements=await read("outputs/enhancements.js");
  assert.match(storage,/indexedDB\.open/);assert.match(storage,/syncQueue/);assert.match(storage,/foodEntries/);assert.match(storage,/pagehide/);
  assert.match(enhancements,/loadOptionalScript\("qrcode\.js","qrcode"\)/);assert.match(enhancements,/script\.src=`\$\{src\}\?v=63`/);
});

test("startup and social assets stay within their performance budgets",async()=>{
  const social=await stat(join(root,"outputs","rep-social-preview.png")),html=await read("outputs/index.html"),sw=await read("outputs/sw.js");
  assert.ok(social.size<300_000,`social preview is ${social.size} bytes`);
  assert.doesNotMatch(html,/src="app\.js/);assert.doesNotMatch(html,/src="enhancements\.js/);assert.doesNotMatch(sw,/qrcode\.js/);
});

test("browser pairing keeps only a non-secret marker and synchronizes tabs",async()=>{
  const auth=await read("outputs/auth.js"),enhancements=await read("outputs/enhancements.js");
  assert.match(auth,/cookieMarker="cookie"/);assert.match(auth,/BroadcastChannel/);assert.match(auth,/addEventListener\("storage"/);
  assert.doesNotMatch(enhancements,/localStorage\.setItem\(syncKeyStorage,caps\.credential/);
});

test("client and deployment copies are byte-identical for source assets",async()=>{
  for(const file of ["index.html","auth.js","storage.js","bootstrap.js","app.js","sync.js","styles.css","sw.js","health-data.js","health-engine.js","features.js","qrcode.js","enhancements.js"]){
    const output=await readFile(join(root,"outputs",file)).catch(()=>null),deployed=await readFile(join(root,"dist/client",file)).catch(()=>null);
    assert.ok(output,`outputs/${file} exists`); assert.ok(deployed,`dist/client/${file} exists`); assert.deepEqual(deployed,output,`${file} is synchronized`);
  }
});
