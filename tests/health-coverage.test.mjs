import test from "node:test";
import assert from "node:assert/strict";
await import("../dist/client/health-coverage.js");
const coverage=globalThis.REP_HEALTH_COVERAGE;

function state(days=28){
  const healthMetrics={},sleepLogs=[],recoveryCheckins=[],bodyWeights=[];
  for(let offset=days-1;offset>=0;offset--){
    const date=coverage.shift("2026-08-12",-offset);
    healthMetrics[date]={steps:8000,active_energy_kcal:520,coverage_minutes:1320,heart_rate_samples:640,workout_hr_samples:80,watch_battery_pct:58,vo2_max:41};
    sleepLogs.push({date,hours:7.5,hrv:52+offset/10,rhr:57,resp:14});
    recoveryCheckins.push({date:`${date}T05:00:00Z`,energy:4,soreness:2,stress:2,pain:false});
    bodyWeights.push({date,weight:84-offset/100});
  }
  return {healthMetrics,sleepLogs,recoveryCheckins,bodyWeights,activeEnergy:{},lastVitalsImportAt:new Date().toISOString()};
}

test("complete Apple Watch days earn high data confidence",()=>{
  const result=coverage.coverage(state(),"2026-08-12");
  assert.equal(result.score,100);
  assert.equal(result.confidence,"high");
  assert.deepEqual(result.missing,[]);
});

test("coverage remains separate from readiness and names missing measurements",()=>{
  const value=state();
  delete value.healthMetrics["2026-08-12"].coverage_minutes;
  value.recoveryCheckins=[];
  const result=coverage.coverage(value,"2026-08-12");
  assert.equal(result.score,75);
  assert.equal(result.confidence,"medium");
  assert.deepEqual(result.missing,["Watch coverage","Morning check-in"]);
});

test("long-term trends require a personal baseline and preserve 90-day windows",()=>{
  const value=state(90),result=coverage.longTerm(value,"2026-08-12"),hrv=result.metrics.find(metric=>metric.name==="hrv");
  assert.equal(hrv.count7,7);
  assert.equal(hrv.count28,28);
  assert.equal(hrv.count90,90);
  assert.equal(hrv.mature,true);
  assert.ok(result.weight.current);
});

test("workout guard blocks pain even when device checks pass",()=>{
  const value=state();
  value.recoveryCheckins.find(row=>String(row.date).startsWith("2026-08-12")).pain=true;
  const result=coverage.workoutGuard(value,"2026-08-12");
  assert.equal(result.ready,false);
  assert.equal(result.pain,true);
  assert.match(result.message,/Pain was reported/);
});
