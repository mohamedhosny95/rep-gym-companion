import test from "node:test";
import assert from "node:assert/strict";

await import("../src/client/product-suite.js");
const suite=globalThis.REP_PRODUCT_SUITE;

test("missed workouts move to an available recovery day and preserve Friday rest",()=>{
  const schedule={Sunday:{focus:"gym",morning:true},Monday:{focus:"rest",morning:false},Tuesday:{focus:"gym",morning:true},Wednesday:{focus:"recovery",morning:true},Thursday:{focus:"recovery",morning:true},Friday:{focus:"rest",morning:false},Saturday:{focus:"recovery",morning:true}};
  const result=suite.reconcileSchedule({preferences:{schedule},history:[],onboarding:{completedAt:"2026-08-30T08:00:00Z"},weekOverrides:{},scheduleAdjustments:[]},"2026-09-02");
  assert.equal(result.weekOverrides["2026-09-02"].focus,"gym");
  assert.equal(result.weekOverrides["2026-09-02"].sourceDate,"2026-08-30");
  assert.equal(result.weekOverrides["2026-09-03"].sourceDate,"2026-09-01");
  assert.equal(result.weekOverrides["2026-09-04"],undefined);
});

test("custom experiments require five yes and five no next-day readiness samples",()=>{
  const state={customExperiments:[{id:"stretch",label:"Stretching",createdAt:"2026-01-01"}],experimentCheckins:{},sleepLogs:[],recoveryCheckins:[],healthProfile:{baseSleepHours:8}};
  for(let index=0;index<10;index++){const key=suite.shiftDay("2026-08-20",index),next=suite.shiftDay(key,1);state.experimentCheckins[key]={stretch:index<5};state.sleepLogs.push({date:next,hours:index<5?8:6});}
  const result=suite.analyzeExperiments(state,"2026-09-02")[0];
  assert.equal(result.ready,true);assert.equal(result.yesDays,5);assert.equal(result.noDays,5);assert.equal(result.effect,25);assert.equal(result.language,"association");assert.match(result.boundary,/not proof of causation/);
});

test("weekly summary returns adherence, PRs, readiness, and one next action",()=>{
  const state={history:[{id:"a",date:"2026-09-01T08:00:00Z",session:"gym"}],preferences:{schedule:{Thursday:{focus:"gym"},Friday:{focus:"rest"},Saturday:{focus:"rest"},Sunday:{focus:"rest"},Monday:{focus:"rest"},Tuesday:{focus:"gym"},Wednesday:{focus:"rest"}}},weekOverrides:{},sleepLogs:[{date:"2026-09-01",hours:8}],recoveryCheckins:[],healthProfile:{baseSleepHours:8}};
  const performance={analyze:()=>({strength:{prs:[{exercise:"Chest Press",currentE1rm:80,bestDate:"2026-09-01"}]}})};
  const result=suite.weeklySummary(state,"2026-09-02",performance);
  assert.equal(result.completed,1);assert.equal(result.planned,2);assert.equal(result.adherence,50);assert.equal(result.prs[0].exercise,"Chest Press");assert.ok(result.nextAction.length>20);
});

test("equipment-aware substitutions only return configured equipment",()=>{
  assert.deepEqual(suite.availableSubstitutions("Chest Press",["bodyweight"]).map(row=>row.name),["Push-Up"]);
});
