import test from "node:test";
import assert from "node:assert/strict";
await import("../src/client/health-coverage.js");
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

test("Watch coverage and workout heart rate never appear or count against the score, since neither import path can ever supply them",()=>{
  const value=state();
  delete value.healthMetrics["2026-08-12"].coverage_minutes;
  delete value.healthMetrics["2026-08-12"].workout_hr_samples;
  const result=coverage.coverage(value,"2026-08-12");
  assert.equal(result.score,100);
  assert.equal(result.confidence,"high");
  assert.deepEqual(result.missing,[]);
  assert.ok(!result.items.some(item=>item.id==="wear"||item.id==="workout"));
});

test("coverage remains separate from readiness and names missing measurements",()=>{
  const value=state();
  value.recoveryCheckins=[];
  const result=coverage.coverage(value,"2026-08-12");
  assert.equal(result.score,88);
  assert.equal(result.confidence,"high");
  assert.deepEqual(result.missing,["Morning check-in"]);
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

test("workout guard blocks session when illness is reported",()=>{
  const value=state();
  value.recoveryCheckins.find(row=>String(row.date).startsWith("2026-08-12")).illness=true;
  const result=coverage.workoutGuard(value,"2026-08-12");
  assert.equal(result.ready,false);
  assert.equal(result.illness,true);
  assert.match(result.message,/Illness was reported/);
});

test("coverage and long-term caches reflect mutations immediately without reload",()=>{
  const value=state();
  value.recoveryCheckins=[];
  const c1=coverage.coverage(value,"2026-08-12");
  assert.ok(c1.missing.includes("Morning check-in"));
  value.recoveryCheckins.push({date:"2026-08-12",energy:4,soreness:2,stress:2});
  const c2=coverage.coverage(value,"2026-08-12");
  assert.ok(!c2.missing.includes("Morning check-in"));
  assert.equal(c2.score,100);

  const lt1=coverage.longTerm(value,"2026-08-12");
  const prevWeight=lt1.weight.current;
  value.bodyWeights.unshift({date:"2026-08-12",weight:91.5});
  const lt2=coverage.longTerm(value,"2026-08-12");
  assert.equal(lt2.weight.current,91.5);
  assert.notEqual(lt2.weight.current,prevWeight);
});

test("long-term weight sorts explicitly by date and uses the true latest measurement regardless of storage order",()=>{
  const val=state(14);
  val.bodyWeights=[
    {date:"2026-08-12",weight:78.5},
    {date:"2026-08-11",weight:79.0},
    {date:"2026-08-10",weight:79.5},
    {date:"2026-08-09",weight:80.0},
    {date:"2026-08-08",weight:80.5},
    {date:"2026-08-07",weight:81.0},
    {date:"2026-08-06",weight:81.5},
    {date:"2026-08-05",weight:82.0}
  ];
  const res=coverage.longTerm(val,"2026-08-12");
  assert.equal(res.weight.current,78.5);
  const expected7=(78.5+79.0+79.5+80.0+80.5+81.0+81.5)/7;
  assert.equal(res.weight.average7,expected7);

  val.bodyWeights.unshift({dateKey:"2026-08-12",createdAt:"2026-08-12T18:00:00Z",weight:78.2});
  val.bodyWeights.push({dateKey:"2026-08-12",createdAt:"2026-08-12T08:00:00Z",weight:78.8});
  const resIntra=coverage.longTerm(val,"2026-08-12");
  assert.equal(resIntra.weight.current,78.2);

  val.bodyMeasurements=[
    {dateKey:"2026-08-12",waist_cm:82.5},
    {dateKey:"2026-08-05",waist_cm:85.0}
  ];
  assert.equal(coverage.longTerm(val,"2026-08-12").waistCm,82.5);
});

test("Cairo post-midnight local-day checkin and weights are correctly matched by local dateKey with UTC createdAt",()=>{
  const cairoTime=new Date("2026-08-11T22:30:00.000Z");
  assert.equal(coverage.dateKey(cairoTime,"Africa/Cairo"),"2026-08-12");

  const val=state();
  val.recoveryCheckins=[
    {dateKey:"2026-08-12",createdAt:"2026-08-11T22:30:00.000Z",date:"2026-08-11T22:30:00.000Z",energy:4,soreness:2,stress:2,illness:true}
  ];
  const c=coverage.checkinFor(val,"2026-08-12");
  assert.ok(c);
  assert.equal(c.illness,true);

  const cov=coverage.coverage(val,"2026-08-12");
  assert.ok(!cov.missing.includes("Morning check-in"));

  const guard=coverage.workoutGuard(val,"2026-08-12");
  assert.equal(guard.ready,false);
  assert.equal(guard.illness,true);
  assert.match(guard.message,/Illness was reported/);

  val.bodyWeights=[{dateKey:"2026-08-12",createdAt:"2026-08-11T22:30:00.000Z",date:"2026-08-11T22:30:00.000Z",weight:81.2}];
  assert.equal(coverage.longTerm(val,"2026-08-12").weight.current,81.2);
  assert.equal(coverage.weightFor(val,"2026-08-12").weight,81.2);

  val.recoveryCheckins=[{date:"2026-08-12",energy:5,soreness:1,stress:1,pain:false}];
  assert.ok(coverage.checkinFor(val,"2026-08-12"));
});

