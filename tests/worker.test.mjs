import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import worker from "../dist/server/index.js";

class MemoryKV {
  constructor(){ this.values=new Map(); }
  async get(key,type){ const value=this.values.get(key); if(value===undefined)return null; return type==="json"?JSON.parse(value):value; }
  async put(key,value){ this.values.set(key,String(value)); }
  async delete(key){ this.values.delete(key); }
  async list({prefix="",limit=1000}={}){ return {keys:[...this.values.keys()].filter(key=>key.startsWith(prefix)).sort().slice(0,limit).map(name=>({name})),list_complete:true}; }
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
  const response=await read(await call(environment,"/api/push/subscribe",{method:"POST",headers:{"content-type":"application/json","origin":"https://rep.example","x-rep-sync-key":environment.REP_SYNC_KEY},body:JSON.stringify(body)}));
  assert.equal(response.status,200); assert.equal([...environment.PUSH_KV.values.keys()].filter(key=>key.startsWith("sub:")).length,1);
  const unauthenticated=await read(await call(environment,"/api/push/subscribe",{method:"POST",headers:{"content-type":"application/json"},body:"{}"})); assert.equal(unauthenticated.status,401);
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

test("sync writes directly even when an execution context is supplied",async()=>{
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

test("authenticated system health reports direct synchronization",async()=>{
  const environment={...env(),NOTION_TOKEN:"secret",GEMINI_API_KEY:"ai"},originalFetch=globalThis.fetch;
  globalThis.fetch=async(input,init={})=>{assert.equal(init.method,undefined);return new Response(JSON.stringify(foodSource()),{status:200,headers:{"content-type":"application/json"}});};
  try{
    const result=await read(await call(environment,"/api/system-health",{headers:{"x-rep-sync-key":environment.REP_SYNC_KEY}}));
    assert.equal(result.status,200);assert.equal(result.body.version,"67");assert.equal(result.body.notion.healthy,true);assert.equal(result.body.notion.schema.valid,true);assert.match(result.body.notion.destination.url,/6433f54c687e4813869aaadeaf3acaab/);assert.deepEqual(result.body.sync,{mode:"direct",queued:false});assert.equal(result.body.outbox,undefined);assert.equal(result.body.services.foodAi,true);
  }finally{globalThis.fetch=originalFetch;}
});

test("Notion destination guard reports schema drift with the correct visible view",async()=>{
  const environment={...env(),NOTION_TOKEN:"secret"},originalFetch=globalThis.fetch;
  globalThis.fetch=async()=>new Response(JSON.stringify({...foodSource(),properties:{...foodProperties,Notes:undefined}}),{status:200,headers:{"content-type":"application/json"}});
  try{const result=await read(await call(environment,"/api/system-health",{headers:{"x-rep-sync-key":environment.REP_SYNC_KEY}}));assert.equal(result.body.notion.healthy,false);assert.deepEqual(result.body.notion.schema.missing,["Notes"]);assert.equal(result.body.notion.destination.name,"View of Food Entries");}finally{globalThis.fetch=originalFetch;}
});

test("scheduled monitoring stores current Notion and direct-sync health",async()=>{
  const environment={...env(),NOTION_TOKEN:"secret"},context={promises:[],waitUntil(promise){this.promises.push(promise);}},originalFetch=globalThis.fetch;
  globalThis.fetch=async()=>new Response(JSON.stringify(foodSource()),{status:200,headers:{"content-type":"application/json"}});
  try{await worker.scheduled({scheduledTime:Date.now()},environment,context);await Promise.all(context.promises);const monitor=await environment.PUSH_KV.get("system:health:latest","json");assert.equal(monitor.notion.healthy,true);assert.deepEqual(monitor.sync,{mode:"direct",queued:false});assert.equal(monitor.issue,false);assert.ok(monitor.checkedAt);}finally{globalThis.fetch=originalFetch;}
});
