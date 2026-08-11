import test from "node:test";
import assert from "node:assert/strict";
import worker from "../dist/server/index.js";

class MemoryKV {
  constructor(){ this.values=new Map(); }
  async get(key,type){ const value=this.values.get(key); if(value===undefined)return null; return type==="json"?JSON.parse(value):value; }
  async put(key,value){ this.values.set(key,String(value)); }
  async delete(key){ this.values.delete(key); }
  async list({prefix="",limit=1000}={}){ return {keys:[...this.values.keys()].filter(key=>key.startsWith(prefix)).sort().slice(0,limit).map(name=>({name})),list_complete:true}; }
}

const allowLimiter={limit:async()=>({success:true})};
const env=()=>({REP_SYNC_KEY:"correct-horse-battery-staple",PUSH_KV:new MemoryKV(),AI_RATE_LIMITER:allowLimiter,PAIR_RATE_LIMITER:allowLimiter});
const call=(environment,path,init={})=>worker.fetch(new Request(`https://rep.example${path}`,init),environment);
const read=async response=>({status:response.status,body:await response.json()});

test("master key is exchanged for a signed, expiring device credential",async()=>{
  const environment=env(),result=await read(await call(environment,"/api/pair-check",{method:"POST",headers:{"x-rep-sync-key":environment.REP_SYNC_KEY}}));
  assert.equal(result.status,200); assert.equal(result.body.ok,true); assert.match(result.body.credential,/^rep1\./); assert.ok(Date.parse(result.body.expiresAt)>Date.now());
  const device=await read(await call(environment,"/api/pair-check",{method:"POST",headers:{"x-rep-sync-key":result.body.credential}}));
  assert.equal(device.status,200); assert.equal(device.body.deviceCredential,true); assert.equal(device.body.credential,undefined);
});

test("bad pairing credentials are rejected",async()=>{
  const result=await read(await call(env(),"/api/pair-check",{method:"POST",headers:{"x-rep-sync-key":"not-the-key"}}));
  assert.equal(result.status,401); assert.equal(result.body.ok,false);
});

test("QR handoff can be claimed once",async()=>{
  const environment=env(),handoff=await read(await call(environment,"/api/pair/handoff",{method:"POST",headers:{"x-rep-sync-key":environment.REP_SYNC_KEY}}));
  assert.equal(handoff.status,200); const token=new URL(handoff.body.url).searchParams.get("pair"); assert.ok(token);
  const claim=()=>call(environment,"/api/pair/claim",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token})});
  const first=await read(await claim()); assert.equal(first.status,200); assert.match(first.body.credential,/^rep1\./);
  const second=await read(await claim()); assert.equal(second.status,401);
});

test("Apple Shortcuts vitals import is validated and returned",async()=>{
  const environment=env(),headers={"content-type":"application/json","x-rep-sync-key":environment.REP_SYNC_KEY};
  const imported=await read(await call(environment,"/api/vitals/import",{method:"POST",headers,body:JSON.stringify(
    {date:"2026-08-10",sleep_hours:7.5,hrv_ms:58,resting_hr_bpm:54,respiratory_rate_bpm:14.2,active_energy_kcal:710}
  )}));
  assert.equal(imported.status,200); assert.equal(imported.body.ok,true);
  const pending=await read(await call(environment,"/api/vitals/pending?since=2026-08-09",{headers:{"x-rep-sync-key":environment.REP_SYNC_KEY}}));
  assert.deepEqual(pending.body.entries.map(entry=>entry.date),["2026-08-10"]);
  assert.equal(pending.body.entries[0].sleep_hours,7.5); assert.equal(pending.body.entries[0].hrv_ms,58);
});

test("vitals routes require pairing and push stays disabled without VAPID keys",async()=>{
  const environment=env(),unauthorized=await read(await call(environment,"/api/vitals/pending?since=2026-01-01"));
  assert.equal(unauthorized.status,401);
  const key=await read(await call(environment,"/api/push/public-key")); assert.equal(key.status,200); assert.equal(key.body.key,null);
});

test("push subscription payloads are validated and stored",async()=>{
  const publicKey=Buffer.concat([Buffer.from([4]),Buffer.alloc(64,7)]).toString("base64url"),auth=Buffer.alloc(16,9).toString("base64url");
  const environment=env(),body={subscription:{endpoint:"https://push.example/subscription/1",keys:{p256dh:publicKey,auth}},time:"20:15",timezoneOffsetMinutes:-120,lang:"en"};
  const response=await read(await call(environment,"/api/push/subscribe",{method:"POST",headers:{"content-type":"application/json","origin":"https://rep.example"},body:JSON.stringify(body)}));
  assert.equal(response.status,200); assert.equal([...environment.PUSH_KV.values.keys()].filter(key=>key.startsWith("sub:")).length,1);
  const invalid=await read(await call(environment,"/api/push/subscribe",{method:"POST",headers:{"content-type":"application/json"},body:"{}"})); assert.equal(invalid.status,400);
});
