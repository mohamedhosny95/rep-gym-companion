import test from "node:test";
import assert from "node:assert/strict";
import {readFile,access} from "node:fs/promises";
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
  assert.ok(sources.includes("auth.js")); assert.ok(sources.includes("enhancements.js")); assert.ok(sources.includes("features.js")); assert.ok(sources.includes("health-engine.js"));
});

test("the v61 service worker precaches authentication and never caches API responses",async()=>{
  const sw=await read("outputs/sw.js"); assert.match(sw,/rep-companion-v61/); assert.match(sw,/auth\.js\?v=61/); assert.match(sw,/pathname\.startsWith\("\/api\/"\)/);
});

test("the state migration preserves health data and adds coaching preferences",async()=>{
  const js=await read("outputs/enhancements.js"); for(const field of ["sleepLogs","activeEnergy","lastVitalsImportDate","mealTemplates","savedMeals","connectionCapabilities","lastSyncedAt","healthProfile","healthMetrics","healthSummarySignatures"])assert.match(js,new RegExp(field)); assert.match(js,/APP_SCHEMA=10/);
});

test("health navigation stays in document flow and food sync requires a verified receipt",async()=>{
  const css=await read("outputs/styles.css"),js=await read("outputs/enhancements.js");
  assert.match(css,/\.health-subnav\{[^}]*position:relative/); assert.doesNotMatch(css,/\.health-subnav\{[^}]*position:sticky/);
  assert.match(js,/Notion did not return a verified save receipt/); assert.match(js,/Confirmed in Notion/);
  assert.match(js,/syncPending=async function\(force=false\)/); assert.match(js,/delete item\.nextAttemptAt/); assert.match(js,/entry\.notionError/);
});

test("browser pairing keeps only a non-secret marker and synchronizes tabs",async()=>{
  const auth=await read("outputs/auth.js"),enhancements=await read("outputs/enhancements.js");
  assert.match(auth,/cookieMarker="cookie"/);assert.match(auth,/BroadcastChannel/);assert.match(auth,/addEventListener\("storage"/);
  assert.doesNotMatch(enhancements,/localStorage\.setItem\(syncKeyStorage,caps\.credential/);
});

test("client and deployment copies are byte-identical for source assets",async()=>{
  for(const file of ["index.html","auth.js","app.js","styles.css","sw.js","health-data.js","health-engine.js","features.js","qrcode.js","enhancements.js"]){
    const output=await readFile(join(root,"outputs",file)).catch(()=>null),deployed=await readFile(join(root,"dist/client",file)).catch(()=>null);
    assert.ok(output,`outputs/${file} exists`); assert.ok(deployed,`dist/client/${file} exists`); assert.deepEqual(deployed,output,`${file} is synchronized`);
  }
});
