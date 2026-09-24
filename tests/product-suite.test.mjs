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

test("an unrelated activity neither fulfills gym nor prevents its reschedule",()=>{
  const schedule={Sunday:{focus:"rest"},Monday:{focus:"rest"},Tuesday:{focus:"gym"},Wednesday:{focus:"recovery"},Thursday:{focus:"recovery"},Friday:{focus:"rest"},Saturday:{focus:"rest"}};
  const state={history:[{date:"2026-09-01T10:00:00Z",session:"activity",activityType:"other",activityLabel:"Walk"}],preferences:{schedule},onboarding:{completedAt:"2026-08-30T08:00:00Z"},weekOverrides:{},scheduleAdjustments:[],sleepLogs:[],recoveryCheckins:[]};
  const adjustment=suite.reconcileSchedule(state,"2026-09-02");
  assert.equal(adjustment.weekOverrides["2026-09-02"].focus,"gym");
  const report=suite.weeklySummary(state,"2026-09-02");
  assert.equal(report.completed,0);assert.equal(report.planned,1);assert.equal(report.adherence,0);assert.deepEqual(report.workouts,[]);
});

test("matching sport activity fulfills its day and duplicate sessions cannot inflate adherence",()=>{
  const schedule={Sunday:{focus:"rest"},Monday:{focus:"padel"},Tuesday:{focus:"gym"},Wednesday:{focus:"recovery"},Thursday:{focus:"recovery"},Friday:{focus:"rest"},Saturday:{focus:"rest"}};
  const state={history:[{date:"2026-08-31T10:00:00Z",session:"activity",activityType:"padel",activityLabel:"Padel"},{date:"2026-08-31T11:00:00Z",session:"padel"},{date:"2026-09-01T10:00:00Z",session:"gym"},{date:"2026-09-01T12:00:00Z",session:"gym"}],preferences:{schedule},onboarding:{completedAt:"2026-08-30T08:00:00Z"},weekOverrides:{},scheduleAdjustments:[],sleepLogs:[],recoveryCheckins:[]};
  const adjustment=suite.reconcileSchedule(state,"2026-09-02");
  assert.deepEqual(adjustment.weekOverrides,{});
  const report=suite.weeklySummary(state,"2026-09-02");
  assert.equal(report.completed,2);assert.equal(report.planned,2);assert.equal(report.adherence,100);assert.equal(report.workouts.length,4);
});

test("a completed rescheduled workout counts once and clears the next action",()=>{
  const schedule={Sunday:{focus:"rest"},Monday:{focus:"rest"},Tuesday:{focus:"gym"},Wednesday:{focus:"recovery"},Thursday:{focus:"recovery"},Friday:{focus:"rest"},Saturday:{focus:"rest"}};
  const base={preferences:{schedule},onboarding:{completedAt:"2026-08-30T08:00:00Z"},weekOverrides:{},scheduleAdjustments:[],sleepLogs:[],recoveryCheckins:[]};
  const walk={date:"2026-09-02T08:00:00Z",session:"activity",activityType:"other",activityLabel:"Walk"};
  const adjustment=suite.reconcileSchedule({...base,history:[walk]},"2026-09-02");
  assert.equal(adjustment.weekOverrides["2026-09-02"].sourceDate,"2026-09-01");
  const report=suite.weeklySummary({...base,weekOverrides:adjustment.weekOverrides,history:[walk,{date:"2026-09-02T10:00:00Z",session:"gym"}]},"2026-09-02");
  assert.equal(report.planned,1);assert.equal(report.completed,1);assert.equal(report.adherence,100);
  assert.doesNotMatch(report.nextAction,/Complete the next/);
});

test("an extra workout appears in the report without inflating planned adherence",()=>{
  const schedule={Sunday:{focus:"rest"},Monday:{focus:"rest"},Tuesday:{focus:"gym"},Wednesday:{focus:"recovery"},Thursday:{focus:"recovery"},Friday:{focus:"rest"},Saturday:{focus:"rest"}};
  const history=[{date:"2026-09-01T10:00:00Z",session:"gym"},{date:"2026-09-02T10:00:00Z",session:"gym"}];
  const report=suite.weeklySummary({preferences:{schedule},history,weekOverrides:{},sleepLogs:[],recoveryCheckins:[]},"2026-09-02");
  assert.equal(report.completed,1);assert.equal(report.adherence,100);assert.equal(report.totalWorkouts,2);assert.equal(report.workouts.length,2);
});

test("a completed custom lifting routine can fulfill a planned gym day",()=>{
  const schedule={Sunday:{focus:"rest"},Monday:{focus:"rest"},Tuesday:{focus:"gym"},Wednesday:{focus:"recovery"},Thursday:{focus:"recovery"},Friday:{focus:"rest"},Saturday:{focus:"rest"}};
  const history=[{date:"2026-09-01T10:00:00Z",session:"custom-upper",sets:3,entries:[{exercise:"Chest Press",reps:10}]}];
  const state={preferences:{schedule},history,weekOverrides:{},sleepLogs:[],recoveryCheckins:[]};
  const report=suite.weeklySummary(state,"2026-09-02");
  assert.equal(report.completed,1);assert.equal(report.adherence,100);
});

test("equipment-aware substitutions only return configured equipment",()=>{
  assert.deepEqual(suite.availableSubstitutions("Chest Press",["bodyweight"]).map(row=>row.name),["Push-Up"]);
});
