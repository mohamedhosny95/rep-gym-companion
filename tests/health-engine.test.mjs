import test from "node:test";
import assert from "node:assert/strict";
await import("../dist/client/health-engine.js");
const health=globalThis.REP_HEALTH_ENGINE;
const profile={wakeTime:"06:30",baseSleepHours:7.5,baselineDays:28};
const date=(offset=0)=>new Date(Date.UTC(2026,7,11+offset,12)).toISOString().slice(0,10);
function matureState(){
  const sleepLogs=Array.from({length:18},(_,index)=>({date:date(index-18),hours:7.5+(index%3-.5)*.1,hrv:60+(index%3-1)*2,rhr:55+(index%3-1),resp:14+(index%3-1)*.2}));
  return {sleepLogs:[...sleepLogs,{date:date(),hours:8,hrv:64,rhr:53,resp:14}],history:[],activeEnergy:{},recoveryCheckins:[{date:date(),sleep:4,energy:4,soreness:1,pain:false}],daily:{journal:{}}};
}

test("readiness is explainable and gains confidence from a mature personal baseline",()=>{
  const result=health.readiness(matureState(),date(),profile);
  assert.equal(result.confidence,"high"); assert.ok(result.score>=65); assert.equal(result.components.length,5); assert.ok(result.reasons.length>0);
});

test("pain overrides a strong wearable score",()=>{
  const state=matureState(); state.recoveryCheckins[0].pain=true;
  const result=health.trainingRecommendation(state,date(),profile);
  assert.equal(result.mode,"pause"); assert.equal(result.volumeFactor,0);
});

test("sleep coaching includes personal need, debt, and prior-day demand",()=>{
  const state=matureState(); state.history.push({date:date(-1),calories:700,entries:[{rpe:9}]});
  const need=health.sleepNeed(state,date(),profile),bed=health.bedtime(state,date(),profile);
  assert.ok(need.demand>0); assert.match(bed.time,/^\d{2}:\d{2}$/); assert.ok(bed.reason.includes("training demand"));
});

test("Apple Active Energy is authoritative while workout duration and RPE still affect strain",()=>{
  const state=matureState(); state.activeEnergy[date()]=500; state.history.push({date:date(),duration:3600,calories:300,entries:[{rpe:8}]});
  const withSession=health.strain(state,date()),energyOnly=health.strain({...state,history:[]},date());
  assert.ok(withSession>energyOnly); assert.ok(withSession<21);
});

test("weekly review never claims diagnosis or causation",()=>{
  const review=health.weeklyReview(matureState(),date(),profile);
  assert.equal(typeof review.headline,"string"); assert.ok(review.daysLogged>=1);
  assert.ok(health.experiments(matureState(),profile).every(item=>item.language==="association"));
});

test("health engine handles empty, sparse, and corrupt data without throwing",()=>{
  const emptyState={sleepLogs:[],history:[],activeEnergy:{},recoveryCheckins:[],daily:{journal:{}}};
  const emptyReadiness=health.readiness(emptyState,date(),profile);
  assert.equal(emptyReadiness.score,null);
  assert.equal(emptyReadiness.confidence,"low");

  const corruptState={
    sleepLogs:[{date:null,hours:"invalid"},{date:"",hours:-5},{date:date(),hours:0}],
    history:[{date:null,duration:null,entries:[{rpe:null}]}],
    activeEnergy:{[date()]:"NaN"},
    recoveryCheckins:null
  };
  const strain=health.strain(corruptState,date());
  assert.equal(strain,0);
  const baseline=health.baseline(corruptState,"hours",date(),28);
  assert.equal(baseline.count,0);
  assert.equal(baseline.value,null);
});

