import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import worker, { PairingCoordinator } from "../dist/server/index.node.js";

class MemoryKV {
  constructor(){ this.values=new Map(); }
  async get(key,type){ const value=this.values.get(key); if(value===undefined)return null; return type==="json"?JSON.parse(value):value; }
  async put(key,value){ this.values.set(key,String(value)); }
  async delete(key){ this.values.delete(key); }
  async list({prefix="",limit=1000}={}){ return {keys:[...this.values.keys()].filter(key=>key.startsWith(prefix)).sort().slice(0,limit).map(name=>({name})),list_complete:true}; }
}

// A real Durable Object only ever runs one transaction() at a time — that
// serialization, not just the read/delete logic inside it, is what makes a
// claim atomic. This fake storage reproduces exactly that guarantee (via a
// promise queue) so tests exercise the actual exported PairingCoordinator
// class instead of re-describing its intended behavior in a mock.
class MemoryDurableObjectStorage {
  constructor(){ this.values=new Map(); this.queue=Promise.resolve(); }
  // Real storage I/O has latency, which is exactly the window a race needs to
  // slip through. Without a delay on both get and delete, two same-tick calls
  // stay in lockstep on Node's single-threaded event loop and never actually
  // interleave — a broken (non-transactional) claim path would pass this
  // suite by accident even though it isn't atomic. Delaying only get was not
  // enough: it let the first call's delete finish before the second call's
  // get resolved, so this only reproduces a genuine race with both delayed.
  async get(key){ await new Promise(resolve=>setTimeout(resolve,5)); return this.values.get(key); }
  async put(key,value){ this.values.set(key,value); }
  async delete(key){ await new Promise(resolve=>setTimeout(resolve,5)); this.values.delete(key); }
  transaction(callback){
    const run=()=>callback({get:key=>this.get(key),put:(key,value)=>this.put(key,value),delete:key=>this.delete(key)});
    const result=this.queue.then(run);
    this.queue=result.then(()=>{},()=>{});
    return result;
  }
}
class MemoryPairingCoordinatorNamespace {
  constructor(){ this.objects=new Map(); }
  idFromName(name){ return name; }
  get(id){
    if(!this.objects.has(id))this.objects.set(id,new PairingCoordinator({storage:new MemoryDurableObjectStorage()}));
    const instance=this.objects.get(id);
    return { fetch:(url,init)=>instance.fetch(new Request(url,init)) };
  }
}

const allowLimiter={limit:async()=>({success:true})};
const env=()=>({REP_SYNC_KEY:"correct-horse-battery-staple-and-more-entropy",PUSH_KV:new MemoryKV(),AI_RATE_LIMITER:allowLimiter,PAIR_RATE_LIMITER:allowLimiter});
const foodProperties=Object.fromEntries(Object.entries({Name:"title",Date:"date","Meal Type":"select","Log Method":"select",Calories:"number",Protein:"number",Carbs:"number",Fat:"number",Fiber:"number",Sugar:"number",Sodium:"number","Portion Size":"rich_text",Confidence:"select",Notes:"rich_text"}).map(([name,type])=>[name,{id:name,type}]));
const foodSource=()=>({id:"97671c61-586a-4443-aea6-00b1d9f835a7",object:"data_source",name:[{plain_text:"Food Entries"}],properties:foodProperties,in_trash:false,archived:false});
const call=(environment,path,init={},ctx)=>worker.fetch(new Request(`https://rep.example${path}`,init),environment,ctx);
const read=async response=>({status:response.status,cookie:response.headers.get("set-cookie"),body:await response.json()});

test("master key is exchanged once for a persistent, revocable device cookie",async()=>{
  const environment=env(),result=await read(await call(environment,"/api/pair-check",{method:"POST",headers:{"x-rep-sync-key":environment.REP_SYNC_KEY}}));
  assert.equal(result.status,200); assert.equal(result.body.ok,true); assert.equal(result.body.credential,"cookie"); assert.equal(result.body.persistent,true); assert.equal(result.body.expiresAt,null); assert.match(result.cookie,/^__Host-rep_session=rep1\./); assert.match(result.cookie,/HttpOnly/); assert.match(result.cookie,/SameSite=Strict/);
  const cookie=result.cookie.split(";",1)[0],device=await read(await call(environment,"/api/pair-check",{method:"POST",headers:{cookie}}));
  assert.equal(device.status,200); assert.equal(device.body.deviceCredential,true); assert.equal(device.body.credential,"cookie"); assert.equal(device.body.persistent,true); assert.equal(device.body.expiresAt,null);
  const registration=await environment.PUSH_KV.get(`device:${result.body.deviceId}`,"json");assert.equal(registration.expiresAt,undefined);
});

test("bad pairing credentials are rejected",async()=>{
  const result=await read(await call(env(),"/api/pair-check",{method:"POST",headers:{"x-rep-sync-key":"not-the-key"}}));
  assert.equal(result.status,401); assert.equal(result.body.ok,false);
});

test("QR handoff can be claimed once",async()=>{
  const environment=env(),handoff=await read(await call(environment,"/api/pair/handoff",{method:"POST",headers:{"x-rep-sync-key":environment.REP_SYNC_KEY}}));
  assert.equal(handoff.status,200); const token=new URL(handoff.body.url).searchParams.get("pair"); assert.ok(token);
  const claim=()=>call(environment,"/api/pair/claim",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token})});
  const first=await read(await claim()); assert.equal(first.status,200); assert.equal(first.body.credential,"cookie"); assert.match(first.cookie,/^__Host-rep_session=rep1\./);
  const second=await read(await claim()); assert.equal(second.status,401);
});

test("QR handoff is claimed once through the real PairingCoordinator Durable Object",async()=>{
  // Same scenario as above, but with PAIRING_COORDINATOR bound so handoffState()
  // takes the Durable Object branch instead of the plain-KV fallback.
  const environment={...env(),PAIRING_COORDINATOR:new MemoryPairingCoordinatorNamespace()};
  const handoff=await read(await call(environment,"/api/pair/handoff",{method:"POST",headers:{"x-rep-sync-key":environment.REP_SYNC_KEY}}));
  assert.equal(handoff.status,200); const token=new URL(handoff.body.url).searchParams.get("pair"); assert.ok(token);
  const claim=()=>call(environment,"/api/pair/claim",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token})});
  const first=await read(await claim()); assert.equal(first.status,200); assert.equal(first.body.credential,"cookie"); assert.match(first.cookie,/^__Host-rep_session=rep1\./);
  const second=await read(await claim()); assert.equal(second.status,401);
});

test("two simultaneous QR claims against the same handoff cannot both succeed",async()=>{
  const environment={...env(),PAIRING_COORDINATOR:new MemoryPairingCoordinatorNamespace()};
  const handoff=await read(await call(environment,"/api/pair/handoff",{method:"POST",headers:{"x-rep-sync-key":environment.REP_SYNC_KEY}}));
  const token=new URL(handoff.body.url).searchParams.get("pair"); assert.ok(token);
  const claimOnce=()=>call(environment,"/api/pair/claim",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token})}).then(read);
  // Fired together, not sequentially, so the two requests actually race
  // inside PairingCoordinator's storage.transaction() rather than one
  // trivially completing before the other starts.
  const [a,b]=await Promise.all([claimOnce(),claimOnce()]);
  assert.deepEqual([a.status,b.status].sort(),[200,401]);
  const winner=a.status===200?a:b;
  assert.equal(winner.body.credential,"cookie"); assert.match(winner.cookie,/^__Host-rep_session=rep1\./);
});

test("Apple Shortcuts vitals import is validated and returned",async()=>{
  const environment=env(),headers={"content-type":"application/json","x-rep-sync-key":environment.REP_SYNC_KEY};
  const imported=await read(await call(environment,"/api/vitals/import",{method:"POST",headers,body:JSON.stringify(
    {date:"2026-08-10",sleep_hours:7.5,hrv_ms:58,resting_hr_bpm:54,respiratory_rate_bpm:14.2,active_energy_kcal:710,steps:10400,vo2_max:42.1,oxygen_saturation_pct:97,wrist_temperature_c:36.4,coverage_minutes:1320,heart_rate_samples:640,workout_hr_samples:80,watch_battery_pct:62,source:"Rep HealthKit Companion"}
  )}));
  assert.equal(imported.status,200); assert.equal(imported.body.ok,true);
  const pending=await read(await call(environment,"/api/vitals/pending?since=2026-08-09",{headers:{"x-rep-sync-key":environment.REP_SYNC_KEY}}));
  assert.deepEqual(pending.body.entries.map(entry=>entry.date),["2026-08-10"]);
  assert.equal(pending.body.entries[0].sleep_hours,7.5); assert.equal(pending.body.entries[0].hrv_ms,58);
  assert.equal(pending.body.entries[0].steps,10400); assert.equal(pending.body.entries[0].vo2_max,42.1); assert.equal(pending.body.entries[0].coverage_minutes,1320); assert.equal(pending.body.entries[0].heart_rate_samples,640); assert.equal(pending.body.entries[0].workout_hr_samples,80); assert.equal(pending.body.entries[0].watch_battery_pct,62); assert.equal(pending.body.entries[0].source,"Rep HealthKit Companion");
  assert.equal(typeof pending.body.entries[0].imported_at,"string"); assert.equal(pending.body.entries[0].import_runs.length,1);
  await read(await call(environment,"/api/vitals/import",{method:"POST",headers,body:JSON.stringify({date:"2026-08-10",active_energy_kcal:760,source:"HealthKit"})}));
  const refreshed=await read(await call(environment,"/api/vitals/pending?since=2026-08-10",{headers:{"x-rep-sync-key":environment.REP_SYNC_KEY}}));
  assert.equal(refreshed.body.entries.length,1); assert.equal(refreshed.body.entries[0].active_energy_kcal,760); assert.equal(refreshed.body.entries[0].sleep_hours,7.5); assert.equal(refreshed.body.entries[0].import_runs.length,2);
  const health=await read(await call(environment,"/api/automation-health",{headers:{"x-rep-sync-key":environment.REP_SYNC_KEY}}));assert.equal(health.status,200);assert.equal(health.body.healthkit.configured,true);
});

test("vitals routes require pairing and push stays disabled without VAPID keys",async()=>{
  const environment=env(),unauthorized=await read(await call(environment,"/api/vitals/pending?since=2026-01-01"));
  assert.equal(unauthorized.status,401);
  const key=await read(await call(environment,"/api/push/public-key")); assert.equal(key.status,200); assert.equal(key.body.key,null);
});

test("push subscription payloads are validated and stored",async()=>{
  const publicKey=Buffer.concat([Buffer.from([4]),Buffer.alloc(64,7)]).toString("base64url"),auth=Buffer.alloc(16,9).toString("base64url");
  const environment=env(),body={subscription:{endpoint:"https://push.example/subscription/1",keys:{p256dh:publicKey,auth}},time:"20:15",timezoneOffsetMinutes:-120,lang:"en"};
  const pairing=await read(await call(environment,"/api/pair-check",{method:"POST",headers:{"x-rep-sync-key":environment.REP_SYNC_KEY}})),cookie=pairing.cookie.split(";",1)[0];
  const response=await read(await call(environment,"/api/push/subscribe",{method:"POST",headers:{"content-type":"application/json","origin":"https://rep.example",cookie},body:JSON.stringify(body)}));
  const subscriptionKeys=[...environment.PUSH_KV.values.keys()].filter(key=>key.startsWith("sub:"));
  assert.equal(response.status,200); assert.equal(subscriptionKeys.length,1);
  assert.equal(subscriptionKeys[0].includes("push.example"),false); assert.ok(subscriptionKeys[0].length<100);
  const unauthenticated=await read(await call(environment,"/api/push/subscribe",{method:"POST",headers:{"content-type":"application/json"},body:"{}"})); assert.equal(unauthenticated.status,401);
});

test("cross-origin browser mutations are rejected before authentication",async()=>{
  const environment=env(),result=await read(await call(environment,"/api/pair-check",{method:"POST",headers:{origin:"https://evil.example","x-rep-sync-key":environment.REP_SYNC_KEY}}));
  assert.equal(result.status,403); assert.equal(result.body.error,"Origin is not allowed.");
});

test("a registered device can be listed and individually revoked",async()=>{
  const environment=env(),pairedResult=await read(await call(environment,"/api/pair-check",{method:"POST",headers:{"x-rep-sync-key":environment.REP_SYNC_KEY,"user-agent":"Test Browser"}})),cookie=pairedResult.cookie.split(";",1)[0];
  const listed=await read(await call(environment,"/api/pair/devices",{headers:{cookie}}));assert.equal(listed.status,200);assert.equal(listed.body.devices.length,1);assert.equal(listed.body.devices[0].current,true);
  const revoked=await read(await call(environment,"/api/pair/devices",{method:"DELETE",headers:{cookie,"content-type":"application/json"},body:JSON.stringify({deviceId:listed.body.devices[0].id})}));assert.equal(revoked.status,200);assert.match(revoked.cookie,/Max-Age=0/);
  const denied=await read(await call(environment,"/api/pair-check",{method:"POST",headers:{cookie}}));assert.equal(denied.status,401);
});

test("pairing rate limits are keyed by network identity, not guessed credentials",async()=>{
  const keys=[],environment={...env(),PAIR_RATE_LIMITER:{limit:async({key})=>{keys.push(key);return {success:true};}}};
  await call(environment,"/api/pair-check",{method:"POST",headers:{"cf-connecting-ip":"203.0.113.8","x-rep-sync-key":"guess-one"}});
  await call(environment,"/api/pair-check",{method:"POST",headers:{"cf-connecting-ip":"203.0.113.8","x-rep-sync-key":"guess-two"}});
  assert.equal(keys.length,2);assert.equal(keys[0],keys[1]);
});

test("canonical origin redirects pages and rejects API calls on preview origins",async()=>{
  const environment={...env(),CANONICAL_ORIGIN:"https://health.example"};
  const page=await worker.fetch(new Request("https://preview.example/settings"),environment);assert.equal(page.status,308);assert.equal(page.headers.get("location"),"https://health.example/settings");
  const api=await read(await worker.fetch(new Request("https://preview.example/api/pair-check",{method:"POST"}),environment));assert.equal(api.status,421);
});

test("all asset requests run through canonical-origin enforcement",()=>{
  const config=JSON.parse(readFileSync(new URL("../wrangler.jsonc",import.meta.url),"utf8"));
  assert.equal(config.assets.run_worker_first,true);
});

test("food sync ignores legacy optimistic markers and returns a verified Notion receipt",async()=>{
  const environment={...env(),NOTION_TOKEN:"secret"},entryId="food-receipt-1",idempotency=`food-${entryId}`;
  const digest=Buffer.from(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(idempotency))).toString("base64url");
  await environment.PUSH_KV.put(`sync:${digest}`,"done");
  const originalFetch=globalThis.fetch,calls=[];
  globalThis.fetch=async(input,init={})=>{
    const url=String(input);calls.push({url,method:init.method||"GET",body:init.body});
    if(url.endsWith("/query"))return new Response(JSON.stringify({results:[]}),{status:200,headers:{"content-type":"application/json"}});
    if(url.endsWith("/data_sources/97671c61-586a-4443-aea6-00b1d9f835a7"))return new Response(JSON.stringify(foodSource()),{status:200,headers:{"content-type":"application/json"}});
    if(url.endsWith("/pages")&&init.method==="POST")return new Response(JSON.stringify({id:"11111111-2222-4333-8444-555555555555",url:"https://www.notion.so/11111111222243338444555555555555",parent:{type:"data_source_id",data_source_id:"97671c61-586a-4443-aea6-00b1d9f835a7"},archived:false,in_trash:false}),{status:200,headers:{"content-type":"application/json"}});
    if(url.includes("/pages/11111111-2222-4333-8444-555555555555"))return new Response(JSON.stringify({id:"11111111-2222-4333-8444-555555555555",url:"https://www.notion.so/11111111222243338444555555555555",parent:{type:"data_source_id",data_source_id:"97671c61-586a-4443-aea6-00b1d9f835a7"},archived:false,in_trash:false}),{status:200,headers:{"content-type":"application/json"}});
    throw new Error(`Unexpected fetch ${url}`);
  };
  try{
    const request=()=>call(environment,"/api/notion-sync",{method:"POST",headers:{"content-type":"application/json","x-rep-sync-key":environment.REP_SYNC_KEY,"x-rep-idempotency-key":idempotency},body:JSON.stringify({kind:"food",payload:{id:entryId,date:"2026-08-11T10:00:00.000Z",food_name:"100 ml milk",mealType:"Snack",logMethod:"Ingredients",calories:61,protein_g:3.2,carbs_g:4.8,fat_g:3.3}})});
    const first=await read(await request());assert.equal(first.status,200);assert.equal(first.body.ok,true);assert.equal(first.body.verified,true);assert.equal(first.body.kind,"food");assert.equal(first.body.entryId,entryId);assert.match(first.body.notionUrl,/notion\.so/);assert.equal(calls.some(item=>item.url.endsWith("/pages")&&item.method==="POST"),true);
    const callCount=calls.length,second=await read(await request());assert.equal(second.body.duplicate,true);assert.equal(second.body.verified,true);assert.equal(calls.length,callCount);
  }finally{globalThis.fetch=originalFetch;}
});

test("two truly simultaneous requests with the same idempotency key can each create a Notion page (documents a real gap, not a fixed guarantee)",async()=>{
  // The earlier "ignores legacy optimistic markers" test above only proves *sequential*
  // duplicate retries are deduped (the receipt from request 1 exists before request 2 starts).
  // Content-aware idempotency receipts are written only after a response completes, so they
  // cannot prevent two requests genuinely in flight at the same time - unlike the QR-claim
  // race, which IS closed by PairingCoordinator's storage.transaction(). This test exists so
  // that gap is a concrete, falsifiable check instead of an unverified assumption either way.
  const environment={...env(),NOTION_TOKEN:"secret"},entryId="race-entry-1",idempotency=`food-${entryId}`;
  let createCount=0;const pages={};
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async(input,init={})=>{
    const url=String(input);
    // Without a real delay here, Node's single-threaded scheduler runs one request's whole
    // chain to completion before the other's /query even fires (the same lesson the QR-claim
    // race test above already learned) - this would pass by accident even if the race is real.
    if(url.endsWith("/query")){await new Promise(resolve=>setTimeout(resolve,5));return new Response(JSON.stringify({results:[]}),{status:200,headers:{"content-type":"application/json"}});}
    if(url.endsWith("/data_sources/97671c61-586a-4443-aea6-00b1d9f835a7"))return new Response(JSON.stringify(foodSource()),{status:200,headers:{"content-type":"application/json"}});
    if(url.endsWith("/pages")&&init.method==="POST"){createCount++;const id=`race-page-${createCount}`;pages[id]={id,url:`https://www.notion.so/${id}`,parent:{type:"data_source_id",data_source_id:"97671c61-586a-4443-aea6-00b1d9f835a7"},archived:false,in_trash:false};return new Response(JSON.stringify(pages[id]),{status:200,headers:{"content-type":"application/json"}});}
    const match=Object.values(pages).find(page=>url.includes(`/pages/${page.id}`));if(match)return new Response(JSON.stringify(match),{status:200,headers:{"content-type":"application/json"}});
    throw new Error(`Unexpected fetch ${url}`);
  };
  try{
    const payload={id:entryId,date:"2026-08-13T10:00:00.000Z",food_name:"Oatmeal",mealType:"Breakfast",logMethod:"Ingredients",calories:300,protein_g:10,carbs_g:50,fat_g:5};
    const request=()=>call(environment,"/api/notion-sync",{method:"POST",headers:{"content-type":"application/json","x-rep-sync-key":environment.REP_SYNC_KEY,"x-rep-idempotency-key":idempotency},body:JSON.stringify({kind:"food",payload})}).then(read);
    const [a,b]=await Promise.all([request(),request()]);
    assert.equal(a.status,200);assert.equal(b.status,200);
    assert.equal(createCount,2,"a genuine concurrent race currently creates two Notion pages for one entry id - not yet closed the way the QR-claim race is");
  }finally{globalThis.fetch=originalFetch;}
});

test("habit check-ins create once and then update the same verified Notion row",async()=>{
  const environment={...env(),NOTION_TOKEN:"secret"},source="e4ed7261-0722-43be-84b7-a0fffc414a11",pageId="44444444-4444-4444-8444-444444444444",calls=[];
  let stored=false;
  const originalFetch=globalThis.fetch;
  const habitProperties=Object.fromEntries(Object.entries({Entry:"title",Date:"date",Habit:"select","Habit ID":"rich_text",Completed:"checkbox",Streak:"number",Source:"select","Updated At":"date",Notes:"rich_text"}).map(([name,type])=>[name,{id:name,type}]));
  globalThis.fetch=async(input,init={})=>{
    const url=String(input),body=init.body?JSON.parse(init.body):null;calls.push({url,method:init.method||"GET",body});
    if(url.endsWith(`/data_sources/${source}/query`)){const results=stored?[{id:pageId}]:[];return new Response(JSON.stringify({results}),{status:200,headers:{"content-type":"application/json"}});}
    if(url.endsWith(`/data_sources/${source}`))return new Response(JSON.stringify({id:source,object:"data_source",properties:habitProperties,in_trash:false,archived:false}),{status:200,headers:{"content-type":"application/json"}});
    if(url.endsWith("/pages")&&init.method==="POST"){stored=true;return new Response(JSON.stringify({id:pageId}),{status:200,headers:{"content-type":"application/json"}});}
    if(url.endsWith(`/pages/${pageId}`)&&init.method==="PATCH")return new Response(JSON.stringify({id:pageId}),{status:200,headers:{"content-type":"application/json"}});
    if(url.endsWith(`/pages/${pageId}`))return new Response(JSON.stringify({id:pageId,url:`https://www.notion.so/${pageId.replace(/-/g,"")}`,parent:{type:"data_source_id",data_source_id:source},archived:false,in_trash:false}),{status:200,headers:{"content-type":"application/json"}});
    throw new Error(`Unexpected fetch ${url}`);
  };
  try{
    const save=completed=>call(environment,"/api/notion-sync",{method:"POST",headers:{"content-type":"application/json","x-rep-sync-key":environment.REP_SYNC_KEY,"x-rep-idempotency-key":"habit-2026-08-12-quran-wird"},body:JSON.stringify({kind:"habit",payload:{date:"2026-08-12",id:"quran-wird",name:"Quran wird",nameAr:"ورد القرآن",completed,streak:completed?3:0,updatedAt:"2026-08-12T15:00:00.000Z",notes:"Read pages of the Quran"}})}).then(read);
    const created=await save(true);assert.equal(created.status,200);assert.equal(created.body.verified,true);assert.equal(created.body.kind,"habit");assert.equal(created.body.created,1);
    const updated=await save(false);assert.equal(updated.status,200);assert.equal(updated.body.verified,true);assert.equal(updated.body.updated,1);
    assert.equal(calls.filter(item=>item.url.endsWith("/pages")&&item.method==="POST").length,1);
    const patch=calls.find(item=>item.url.endsWith(`/pages/${pageId}`)&&item.method==="PATCH");assert.equal(patch.body.properties.Completed.checkbox,false);assert.equal(patch.body.properties["Habit ID"].rich_text[0].text.content,"quran-wird");
  }finally{globalThis.fetch=originalFetch;}
});

test("workout sync verifies each created page with a fresh Notion read before reporting success",async()=>{
  const environment={...env(),NOTION_TOKEN:"secret",NOTION_DATA_SOURCE_ID:"11111111-1111-4111-8111-111111111111"},pageId="22222222-2222-4222-8222-222222222222";
  const workout={id:"workout-1",date:"2026-08-11",entries:[{entry:"Bench Press · Set 1",exercise:"Bench Press",set:1,weight:60,reps:8}]};
  const originalFetch=globalThis.fetch,calls=[];
  globalThis.fetch=async(input,init={})=>{
    const url=String(input);calls.push({url,method:init.method||"GET"});
    if(url.endsWith("/query"))return new Response(JSON.stringify({results:[]}),{status:200,headers:{"content-type":"application/json"}});
    if(url.endsWith("/pages")&&init.method==="POST")return new Response(JSON.stringify({id:pageId,url:`https://www.notion.so/${pageId.replace(/-/g,"")}`,parent:{type:"data_source_id",data_source_id:environment.NOTION_DATA_SOURCE_ID},archived:false,in_trash:false}),{status:200,headers:{"content-type":"application/json"}});
    if(url.endsWith(`/pages/${pageId}`))return new Response(JSON.stringify({id:pageId,url:`https://www.notion.so/${pageId.replace(/-/g,"")}`,parent:{type:"data_source_id",data_source_id:environment.NOTION_DATA_SOURCE_ID},archived:false,in_trash:false}),{status:200,headers:{"content-type":"application/json"}});
    throw new Error(`Unexpected fetch ${url}`);
  };
  try{
    const saved=await read(await call(environment,"/api/notion-sync",{method:"POST",headers:{"content-type":"application/json","x-rep-sync-key":environment.REP_SYNC_KEY},body:JSON.stringify({workout})}));
    assert.equal(saved.status,200);assert.equal(saved.body.ok,true);assert.equal(saved.body.verified,true);assert.equal(saved.body.kind,"workout");assert.equal(saved.body.created,1);assert.equal(saved.body.skipped,0);assert.match(saved.body.notionUrl,/notion\.so/);
    assert.equal(calls.some(item=>item.method==="GET"&&item.url.endsWith(`/pages/${pageId}`)),true,"the created page must be re-read, not just trusted from the create response");
  }finally{globalThis.fetch=originalFetch;}
});

test("workout sync reports failure instead of a false receipt when Notion can't confirm the created page",async()=>{
  const environment={...env(),NOTION_TOKEN:"secret",NOTION_DATA_SOURCE_ID:"11111111-1111-4111-8111-111111111111"},pageId="33333333-3333-4333-8333-333333333333";
  const workout={id:"workout-2",date:"2026-08-11",entries:[{entry:"Squat · Set 1",exercise:"Squat",set:1,weight:100,reps:5}]};
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async(input,init={})=>{
    const url=String(input);
    if(url.endsWith("/query"))return new Response(JSON.stringify({results:[]}),{status:200,headers:{"content-type":"application/json"}});
    if(url.endsWith("/pages")&&init.method==="POST")return new Response(JSON.stringify({id:pageId,url:`https://www.notion.so/${pageId.replace(/-/g,"")}`,parent:{type:"data_source_id",data_source_id:environment.NOTION_DATA_SOURCE_ID},archived:false,in_trash:false}),{status:200,headers:{"content-type":"application/json"}});
    // The create response looks fine, but Notion's own re-read of the page (e.g. it landed archived, or in the wrong database) says otherwise — the response must trust the re-read, not the create call.
    if(url.endsWith(`/pages/${pageId}`))return new Response(JSON.stringify({id:pageId,url:`https://www.notion.so/${pageId.replace(/-/g,"")}`,parent:{type:"data_source_id",data_source_id:environment.NOTION_DATA_SOURCE_ID},archived:true,in_trash:false}),{status:200,headers:{"content-type":"application/json"}});
    throw new Error(`Unexpected fetch ${url}`);
  };
  try{
    const saved=await read(await call(environment,"/api/notion-sync",{method:"POST",headers:{"content-type":"application/json","x-rep-sync-key":environment.REP_SYNC_KEY},body:JSON.stringify({workout})}));
    assert.equal(saved.status,502);assert.equal(saved.body.ok,false);assert.match(saved.body.error,/did not confirm/);
  }finally{globalThis.fetch=originalFetch;}
});

test("outbox delivery returns a verified receipt without an untracked background job",async()=>{
  const environment={...env(),NOTION_TOKEN:"secret"},entryId="food-direct-1",context={promises:[],waitUntil(promise){this.promises.push(promise);}};
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async(input,init={})=>{
    const url=String(input);
    if(url.endsWith("/query"))return new Response(JSON.stringify({results:[]}),{status:200,headers:{"content-type":"application/json"}});
    if(url.endsWith("/data_sources/97671c61-586a-4443-aea6-00b1d9f835a7"))return new Response(JSON.stringify(foodSource()),{status:200,headers:{"content-type":"application/json"}});
    if(url.endsWith("/pages")&&init.method==="POST")return new Response(JSON.stringify({id:"aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",url:"https://www.notion.so/aaaaaaaabbbb4ccc8dddeeeeeeeeeeee",parent:{type:"data_source_id",data_source_id:"97671c61-586a-4443-aea6-00b1d9f835a7"},archived:false,in_trash:false}),{status:200,headers:{"content-type":"application/json"}});
    if(url.includes("/pages/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"))return new Response(JSON.stringify({id:"aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",url:"https://www.notion.so/aaaaaaaabbbb4ccc8dddeeeeeeeeeeee",parent:{type:"data_source_id",data_source_id:"97671c61-586a-4443-aea6-00b1d9f835a7"},archived:false,in_trash:false}),{status:200,headers:{"content-type":"application/json"}});
    throw new Error(`Unexpected fetch ${url}`);
  };
  try{
    const saved=await read(await call(environment,"/api/notion-sync",{method:"POST",headers:{"content-type":"application/json","x-rep-sync-key":environment.REP_SYNC_KEY,"x-rep-idempotency-key":`food-${entryId}`},body:JSON.stringify({kind:"food",payload:{id:entryId,date:"2026-08-11T10:00:00.000Z",food_name:"Milk",mealType:"Breakfast",logMethod:"Ingredients",calories:103,protein_g:7,carbs_g:10,fat_g:4}})},context));
    assert.equal(saved.status,200);assert.equal(saved.body.ok,true);assert.equal(saved.body.verified,true);assert.equal(saved.body.entryId,entryId);assert.equal(context.promises.length,0);
    const status=await read(await call(environment,"/api/sync-status",{headers:{"x-rep-sync-key":environment.REP_SYNC_KEY}}));
    assert.equal(status.status,410);assert.match(status.body.error,/removed/);
  }finally{globalThis.fetch=originalFetch;}
});

test("authenticated system health reports verified outbox synchronization",async()=>{
  const environment={...env(),NOTION_TOKEN:"secret",GEMINI_API_KEY:"ai"},originalFetch=globalThis.fetch;
  globalThis.fetch=async(input,init={})=>{assert.equal(init.method,undefined);return new Response(JSON.stringify(foodSource()),{status:200,headers:{"content-type":"application/json"}});};
  try{
    const result=await read(await call(environment,"/api/system-health",{headers:{"x-rep-sync-key":environment.REP_SYNC_KEY}}));
    assert.equal(result.status,200);assert.equal(result.body.version,"69");assert.equal(result.body.notion.healthy,true);assert.equal(result.body.notion.schema.valid,true);assert.match(result.body.notion.destination.url,/6433f54c687e4813869aaadeaf3acaab/);assert.deepEqual(result.body.sync,{mode:"verified-outbox",queued:true});assert.equal(result.body.outbox,undefined);assert.equal(result.body.services.foodAi,true);
  }finally{globalThis.fetch=originalFetch;}
});

test("Notion destination guard reports schema drift with the correct visible view",async()=>{
  const environment={...env(),NOTION_TOKEN:"secret"},originalFetch=globalThis.fetch;
  globalThis.fetch=async()=>new Response(JSON.stringify({...foodSource(),properties:{...foodProperties,Notes:undefined}}),{status:200,headers:{"content-type":"application/json"}});
  try{const result=await read(await call(environment,"/api/system-health",{headers:{"x-rep-sync-key":environment.REP_SYNC_KEY}}));assert.equal(result.body.notion.healthy,false);assert.deepEqual(result.body.notion.schema.missing,["Notes"]);assert.equal(result.body.notion.destination.name,"View of Food Entries");}finally{globalThis.fetch=originalFetch;}
});

test("scheduled monitoring stores current Notion and outbox health",async()=>{
  const environment={...env(),NOTION_TOKEN:"secret"},context={promises:[],waitUntil(promise){this.promises.push(promise);}},originalFetch=globalThis.fetch;
  globalThis.fetch=async()=>new Response(JSON.stringify(foodSource()),{status:200,headers:{"content-type":"application/json"}});
  try{await worker.scheduled({scheduledTime:Date.now()},environment,context);await Promise.all(context.promises);const monitor=await environment.PUSH_KV.get("system:health:latest","json");assert.equal(monitor.notion.healthy,true);assert.deepEqual(monitor.sync,{mode:"verified-outbox",queued:true});assert.equal(monitor.issue,false);assert.ok(monitor.checkedAt);}finally{globalThis.fetch=originalFetch;}
});

test("non-food health syncs are pre-flighted against Notion schema drift the same way food is",async()=>{
  const environment={...env(),NOTION_TOKEN:"secret"},source="94f3f3a9-ca95-4f34-90dc-36090a9ec00c",originalFetch=globalThis.fetch;
  const missingSoreness=Object.fromEntries(Object.entries({"Check-in":"title",Date:"date",Energy:"number","Sleep Hours":"number",Pain:"checkbox","Red Flags":"number",Recommendation:"select",Notes:"rich_text"}).map(([name,type])=>[name,{id:name,type}]));
  globalThis.fetch=async(input)=>{
    const url=String(input);
    if(url.endsWith(`/data_sources/${source}`))return new Response(JSON.stringify({id:source,object:"data_source",properties:missingSoreness,in_trash:false,archived:false}),{status:200,headers:{"content-type":"application/json"}});
    throw new Error(`Unexpected fetch ${url}`);
  };
  try{
    const result=await read(await call(environment,"/api/notion-sync",{method:"POST",headers:{"content-type":"application/json","x-rep-sync-key":environment.REP_SYNC_KEY},body:JSON.stringify({kind:"recovery",payload:{date:"2026-08-13",soreness:2,energy:3,sleep:7,pain:false,flags:0,recommendation:"Progress",notes:""}})}));
    assert.equal(result.status,502);assert.match(result.body.error,/Missing: Soreness/);
  }finally{globalThis.fetch=originalFetch;}
});

test("exceeding a rate limit returns 429 instead of proceeding",async()=>{
  // Every other rate-limit test only checks bucket *keying* — this is the one that
  // actually exercises the blocking path (rateLimited() -> rateLimitResponse()).
  const environment={...env(),PAIR_RATE_LIMITER:{limit:async()=>({success:false})}};
  const result=await read(await call(environment,"/api/pair-check",{method:"POST",headers:{"x-rep-sync-key":environment.REP_SYNC_KEY}}));
  assert.equal(result.status,429);assert.equal(result.body.ok,false);assert.equal(result.body.error,"Too many requests. Try again shortly.");
});

test("device management is rejected without any authentication",async()=>{
  const environment=env();
  const listed=await read(await call(environment,"/api/pair/devices"));
  assert.equal(listed.status,401);
  const revoked=await read(await call(environment,"/api/pair/devices",{method:"DELETE",headers:{"content-type":"application/json"},body:JSON.stringify({deviceId:"11111111-1111-4111-8111-111111111111"})}));
  assert.equal(revoked.status,401);
});

test("revoking one paired device does not affect a second device's own session",async()=>{
  // This app is single-owner, so any paired device may manage any other paired
  // device by design (there is no separate-account boundary to enforce) — but
  // revoke must still target only the requested device, not the caller's own
  // session, and the revoked device's session must actually stop working.
  const environment=env();
  const deviceA=await read(await call(environment,"/api/pair-check",{method:"POST",headers:{"x-rep-sync-key":environment.REP_SYNC_KEY,"user-agent":"Device A"}}));
  const deviceB=await read(await call(environment,"/api/pair-check",{method:"POST",headers:{"x-rep-sync-key":environment.REP_SYNC_KEY,"user-agent":"Device B"}}));
  const cookieA=deviceA.cookie.split(";",1)[0],cookieB=deviceB.cookie.split(";",1)[0];
  const listed=await read(await call(environment,"/api/pair/devices",{headers:{cookie:cookieA}}));
  assert.equal(listed.body.devices.length,2);
  const other=listed.body.devices.find(device=>!device.current);
  assert.ok(other,"device B must be visible as a non-current device from device A's session");
  const revoked=await read(await call(environment,"/api/pair/devices",{method:"DELETE",headers:{cookie:cookieA,"content-type":"application/json"},body:JSON.stringify({deviceId:other.id})}));
  assert.equal(revoked.status,200);assert.equal(revoked.cookie,null,"revoking a different device must not clear the caller's own session cookie");
  const stillValidA=await read(await call(environment,"/api/pair-check",{method:"POST",headers:{cookie:cookieA}}));
  assert.equal(stillValidA.status,200);
  const nowInvalidB=await read(await call(environment,"/api/pair-check",{method:"POST",headers:{cookie:cookieB}}));
  assert.equal(nowInvalidB.status,401);
});

class MemoryR2Bucket {
  constructor(){ this.objects=new Map(); }
  async put(key,value){ this.objects.set(key,String(value)); }
  async get(key){ const value=this.objects.get(key); return value===undefined?null:{text:async()=>value}; }
  async delete(key){ this.objects.delete(key); }
  async list({prefix=""}={}){ return {objects:[...this.objects.keys()].filter(key=>key.startsWith(prefix)).sort().map(key=>({key}))}; }
}

test("the daily backup cron exports every Notion source to R2 and prunes old backups",async()=>{
  const environment={...env(),NOTION_TOKEN:"secret",BACKUP_BUCKET:new MemoryR2Bucket()},context={promises:[],waitUntil(promise){this.promises.push(promise);}},originalFetch=globalThis.fetch;
  // Pre-seed 31 stale backups so retention pruning has something to trim.
  for(let day=1;day<=31;day++)await environment.BACKUP_BUCKET.put(`notion-backup/2026-06-${String(day).padStart(2,"0")}.json`,"{}");
  globalThis.fetch=async(input)=>{
    const url=String(input);
    if(url.endsWith("/query"))return new Response(JSON.stringify({results:[{id:"page-1",url:"https://www.notion.so/page1",created_time:"2026-08-01T00:00:00.000Z",last_edited_time:"2026-08-01T00:00:00.000Z",archived:false,in_trash:false,properties:{}}],has_more:false,next_cursor:null}),{status:200,headers:{"content-type":"application/json"}});
    throw new Error(`Unexpected fetch ${url}`);
  };
  try{
    await worker.scheduled({cron:"17 3 * * *",scheduledTime:Date.now()},environment,context);
    await Promise.all(context.promises);
    const status=await environment.PUSH_KV.get("system:backup:latest","json");
    assert.ok(status.lastBackupAt);assert.equal(status.partialFailure,false);
    assert.equal(status.recordCount,6,"one page from each of the six Notion sources");
    const listed=await environment.BACKUP_BUCKET.list({prefix:"notion-backup/"});
    assert.equal(listed.objects.length,30,"retention keeps at most 30 backups");
    const stored=await environment.BACKUP_BUCKET.get(status.key),bundle=JSON.parse(await stored.text());
    assert.deepEqual(Object.keys(bundle.sources).sort(),["food","habit","hygiene","nutrition","recovery","workout"]);
    assert.equal(bundle.sources.food.pages[0].id,"page-1");
  }finally{globalThis.fetch=originalFetch;}
});

test("the 5-minute cron still runs the existing health monitor, not the backup job",async()=>{
  const environment={...env(),NOTION_TOKEN:"secret",BACKUP_BUCKET:new MemoryR2Bucket()},context={promises:[],waitUntil(promise){this.promises.push(promise);}},originalFetch=globalThis.fetch;
  globalThis.fetch=async()=>new Response(JSON.stringify(foodSource()),{status:200,headers:{"content-type":"application/json"}});
  try{
    await worker.scheduled({cron:"*/5 * * * *",scheduledTime:Date.now()},environment,context);
    await Promise.all(context.promises);
    assert.equal(await environment.PUSH_KV.get("system:backup:latest","json"),null);
    assert.ok(await environment.PUSH_KV.get("system:health:latest","json"));
  }finally{globalThis.fetch=originalFetch;}
});

test("oversized sync and food-analyze payloads are rejected before processing",async()=>{
  const environment={...env(),NOTION_TOKEN:"secret"};
  const syncResult=await read(await call(environment,"/api/notion-sync",{method:"POST",headers:{"content-type":"application/json","x-rep-sync-key":environment.REP_SYNC_KEY},body:JSON.stringify({kind:"food",payload:{id:"big-1",date:"2026-08-13",food_name:"x".repeat(2_100_000)}})}));
  assert.equal(syncResult.status,413);
  const analyzeResult=await read(await call(environment,"/api/food/analyze",{method:"POST",headers:{"content-type":"application/json","x-rep-sync-key":environment.REP_SYNC_KEY},body:JSON.stringify({mode:"photo",image:"x".repeat(13_600_000),mimeType:"image/jpeg"})}));
  assert.equal(analyzeResult.status,413);
});

test("malformed JSON and a dedupe-marker-breaking food id are rejected cleanly, not silently accepted",async()=>{
  const environment={...env(),NOTION_TOKEN:"secret"};
  const malformed=await read(await call(environment,"/api/notion-sync",{method:"POST",headers:{"content-type":"application/json","x-rep-sync-key":environment.REP_SYNC_KEY},body:"{not valid json"}));
  assert.equal(malformed.status,502);
  // Would have collided with a different entry's marker under the old `contains` lookup
  // (Finding #22); FOOD_ID_PATTERN now rejects it outright before any Notion call.
  const craftedId=await read(await call(environment,"/api/notion-sync",{method:"POST",headers:{"content-type":"application/json","x-rep-sync-key":environment.REP_SYNC_KEY},body:JSON.stringify({kind:"food",payload:{id:"food-1][REP:other-entry",date:"2026-08-13",food_name:"Snack"}})}));
  assert.equal(craftedId.status,400);assert.match(craftedId.body.error,/Invalid food entry/);
});

test("client telemetry accepts only paired, bounded web-vital samples",async()=>{
  const environment=env(),sample={build:"abc123",lcpMs:1200,cls:0.01,interactionMs:80,longTaskMs:60,loadMs:900};
  const accepted=await read(await call(environment,"/api/telemetry",{method:"POST",headers:{"content-type":"application/json","x-rep-sync-key":environment.REP_SYNC_KEY},body:JSON.stringify(sample)}));
  assert.equal(accepted.status,202);assert.equal(accepted.body.ok,true);
  const invalid=await read(await call(environment,"/api/telemetry",{method:"POST",headers:{"content-type":"application/json","x-rep-sync-key":environment.REP_SYNC_KEY},body:JSON.stringify({...sample,lcpMs:-1})}));
  assert.equal(invalid.status,400);
  const unauthorized=await read(await call(environment,"/api/telemetry",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(sample)}));
  assert.equal(unauthorized.status,401);
});
