import test from 'node:test';
import assert from 'node:assert/strict';
import '../src/client/health-engine.js';
import '../src/client/health-coverage.js';
import '../src/client/health-summary.js';
import '../src/client/appearance.js';
const summary=globalThis.AWJ_HEALTH_SUMMARY,engine=globalThis.AWJ_HEALTH_ENGINE;
const date='2026-10-10',now=Date.parse('2026-10-10T12:00:00Z');
const empty=()=>({sleepLogs:[],history:[],activeEnergy:{},healthMetrics:{},recoveryCheckins:[]});

test('missing and malformed measurements never create zero scores',()=>{
  for(const value of [null,undefined,'','   ',false,[],{},NaN,Infinity,'unknown']){
    const state=empty();state.sleepLogs=[{date,hours:value,hrv:value,rhr:value,resp:value}];
    const result=summary.daily(state,date,{},now);
    assert.equal(result.sleep.value,null);assert.equal(result.recovery.value,null);
    assert.equal(result.strain.value,null);assert.equal(result.coverage.score,0);
    assert.ok(result.vitals.every(metric=>metric.value===null));
  }
});
test('zero activity is valid while zero heart measurements are unavailable',()=>{
  const state=empty();state.healthMetrics[date]={steps:0,active_energy_kcal:0};
  state.sleepLogs=[{date,hours:0,hrv:0,rhr:0,resp:0}];
  const result=summary.daily(state,date,{},now);
  assert.equal(result.strain.value,0);assert.equal(result.activity.steps,0);
  assert.equal(result.activity.activeEnergy,0);assert.equal(result.sleep.value,null);
  assert.ok(result.vitals.every(metric=>metric.value===null));
});
test('step-only input cannot manufacture a strain estimate',()=>{
  const state=empty();state.healthMetrics[date]={steps:8000};
  assert.equal(summary.daily(state,date).strain.value,null);
});
test('workout-only strain is explicitly partial and uses the established calculation',()=>{
  const state=empty();state.history=[{date,duration:1800,calories:200,entries:[{rpe:6}]}];
  const strain=summary.daily(state,date).strain;
  assert.equal(strain.value,engine.strain(state,date));assert.equal(strain.partial,true);
  assert.deepEqual(strain.inputs,['Logged workouts']);
});
test('recovery uses the existing engine and marks a limited baseline',()=>{
  const state=empty();state.sleepLogs=[{date,hours:7.5}];
  const result=summary.daily(state,date);
  assert.equal(result.recovery.value,engine.readiness(state,date).score);
  assert.equal(result.recovery.confidence,'low');assert.equal(result.recovery.calibrating,true);
});
test('older vitals retain their date and source and never fill today’s recovery ring',()=>{
  const state=empty();state.sleepLogs=[{date:'2026-10-09',hours:8,hrv:60}];
  state.healthMetrics['2026-10-09']={source:'Apple Health',importedAt:'2026-10-09T08:00:00Z'};
  const result=summary.daily(state,date,{},now);
  assert.equal(result.recovery.value,null);assert.equal(result.sleep.value,null);
  assert.equal(result.vitals[0].date,'2026-10-09');assert.equal(result.vitals[0].freshness,'stale');
  assert.equal(result.vitals[0].source,'Apple Health');
});
test('general sync never marks a health import fresh',()=>{
  const state=empty();state.lastSyncedAt='2026-10-10T11:59:00Z';
  state.sleepLogs=[{date,hours:8,hrv:60}];
  const result=summary.daily(state,date,{},now);
  assert.equal(result.coverage.lastImport,null);assert.equal(result.coverage.staleHours,null);
  assert.equal(result.vitals[0].freshness,'unknown');
});
test('manual readings retain their source even when another metric was imported today',()=>{
  const state=empty();state.sleepLogs=[{date,hours:8,hrv:65,source:'Manual log'}];
  state.healthMetrics[date]={source:'Apple Health',importedAt:'2026-10-10T11:00:00Z'};
  state.lastVitalsImportDate=date;state.lastVitalsImportAt='2026-10-10T11:00:00Z';
  const metric=summary.daily(state,date,{},now).vitals[0];
  assert.equal(metric.source,'Manual log');assert.equal(metric.importedAt,null);assert.equal(metric.freshness,'unknown');
});
test('charts retain gaps, explicit zeros and calendar days; averages exclude gaps',()=>{
  const state=empty();state.activeEnergy[date]=0;state.activeEnergy['2026-10-08']=500;
  const rows=summary.series(state,'strain',date);
  assert.equal(rows.length,7);assert.equal(rows[5].value,null);assert.equal(rows[6].value,0);
  assert.equal(summary.average(rows),engine.strain(state,'2026-10-08')/2);
});
test('weekly health totals distinguish missing activity from recorded zero',()=>{
  const state=empty();assert.equal(engine.weeklyReview(state,date).totalStrain,null);
  state.activeEnergy[date]=0;assert.equal(engine.weeklyReview(state,date).totalStrain,0);
});
test('legacy zero placeholders never become valid baseline or body measurements',()=>{
  const state=empty();state.sleepLogs=[{date,hours:0,hrv:0,rhr:0,resp:0}];
  state.bodyWeights=[{date,kg:0}];state.bodyMeasurements=[{date,waist_cm:0}];
  const report=AWJ_HEALTH_COVERAGE.longTerm(state,date);
  assert.ok(report.metrics.every(metric=>metric.current===null));
  assert.equal(report.weight.current,null);assert.equal(report.waistCm,null);
});

test('appearance migration preserves unrelated preferences and persists a light selection',()=>{
  const legacy={language:'ar',weightUnit:'lb',waterUnit:'oz',themeMode:'default',customSetting:{enabled:true}};
  const migrated=AWJ_APPEARANCE.normalize(legacy);
  assert.equal(migrated.themeMode,'oled');assert.equal(migrated.appearanceVersion,1);
  assert.deepEqual(migrated.customSetting,legacy.customSetting);assert.equal(migrated.language,'ar');
  assert.equal(AWJ_APPEARANCE.normalize({...migrated,themeMode:'default'}).themeMode,'default');
  assert.equal(AWJ_APPEARANCE.normalize({}).themeMode,'oled');
});
