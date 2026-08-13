import test from "node:test";
import assert from "node:assert/strict";
await import("../src/client/performance-insights.js");
const engine=globalThis.REP_PERFORMANCE_INSIGHTS;
const now="2026-08-13",day=offset=>engine.shiftDay(now,offset);

function session(index,{exercise="Chest Press",weight=50,reps=10,rpe=8}={}){
  const date=day(-index*3);
  return {id:`s${index}`,date:`${date}T10:00:00Z`,session:"gym",entries:[{exercise,set:1,weight,reps,rpe},{exercise,set:2,weight,reps,rpe}],loads:{}};
}

function populatedState(){
  const history=Array.from({length:16},(_,index)=>session(index,{weight:index%2===0?58:50}));
  const foodEntries=[],water={},sleepLogs=[];
  for(let offset=-27;offset<=0;offset++){
    const date=day(offset),high=offset%2===0;
    foodEntries.push({id:`f${offset}`,date:`${date}T18:00:00Z`,calories:high?2100:1950,protein_g:high?180:120,carbs_g:220,fat_g:65,source:"Manual"});
    water[date]=high?3400:2500;sleepLogs.push({date,hours:high?8:6.5});
  }
  const bodyWeights=Array.from({length:8},(_,index)=>({week:`w${index}`,date:day(-index*7),kg:80+index*.25}));
  return {history,foodEntries,water,sleepLogs,bodyWeights,recoveryCheckins:[],healthMetrics:{[now]:{source:"Rep HealthKit Companion"}},healthProfile:{baseSleepHours:7.5},preferences:{schedule:{},targets:{gym:{calories:2100,protein:175,water:3300},active:{calories:2000,protein:170,water:3200},flex:{calories:2000,protein:150,water:3000}}},analyticsGoal:{type:"strength",exercise:"Chest Press",target:90},insightControls:{dismissed:{},snoozed:{}}};
}

test("estimated 1RM is deterministic and caps high-rep inflation",()=>{
  assert.equal(engine.e1rm(60,10),80);assert.equal(engine.e1rm(60,20),90);assert.equal(engine.e1rm(0,10),null);
});

test("strength intelligence calculates per-lift trends, volume, and muscle sets",()=>{
  const result=engine.strength(populatedState(),now),chest=result.exercises.find(item=>item.exercise==="Chest Press");
  assert.ok(chest.currentE1rm>70);assert.equal(chest.sessionCount,16);assert.ok(result.totalVolume>0);assert.ok(result.muscleSets.Chest>0);assert.match(result.dateRange,/2026/);
});

test("plateau detection requires repeated sessions across time",()=>{
  const state=populatedState();state.history=Array.from({length:6},(_,index)=>session(index,{weight:50,reps:10}));
  const result=engine.strength(state,now);assert.equal(result.exercises[0].plateau,true);assert.equal(result.plateaus.length,1);
});

test("nutrition analytics keep adherence coverage separate and bound maintenance uncertainty",()=>{
  const result=engine.nutrition(populatedState(),now);
  assert.equal(result.adherence28.loggedDays,28);assert.equal(result.adherence28.coverage,100);assert.ok(result.maintenance.low<result.maintenance.high);assert.ok(result.weightSlopePerWeek<0);
});

test("goal forecasts use a range and never return a single promised date",()=>{
  const state=populatedState();state.history=Array.from({length:10},(_,index)=>session(index,{weight:60-index,reps:10}));
  const forecast=engine.goalForecast(state,state.analyticsGoal,now);
  assert.equal(forecast.status,"forecast");assert.equal(forecast.dateRange.length,2);assert.ok(forecast.range[1]>=forecast.range[0]);assert.match(forecast.evidence,/sessions/);
});

test("personal experiments enforce four observations per comparison group",()=>{
  const results=engine.experiments(populatedState(),now);
  assert.ok(results.length>=1);assert.ok(results.every(item=>item.withDays>=4&&item.withoutDays>=4));assert.ok(results.every(item=>item.language==="association"));
});

test("data quality reports duplicates, provenance, freshness, and domain scores",()=>{
  const state=populatedState(),before=engine.nutrition(state,now).adherence28.averageCalories;state.foodEntries.push({...state.foodEntries[0]});
  const quality=engine.dataQuality(state,now);
  assert.ok(quality.duplicateCount>=1);assert.equal(engine.nutrition(state,now).adherence28.averageCalories,before);assert.equal(quality.healthSources[0].source,"Rep HealthKit Companion");assert.equal(quality.domains.length,4);assert.ok(quality.overall>0);
});

test("insight inbox honors dismiss and snooze controls",()=>{
  const state=populatedState();state.history=Array.from({length:6},(_,index)=>session(index,{weight:50,reps:10}));
  const first=engine.inbox(state,state.insightControls,now),plateau=first.find(item=>item.kind==="plateau");assert.ok(plateau);
  state.insightControls.dismissed[plateau.id]=new Date().toISOString();assert.ok(!engine.inbox(state,state.insightControls,now).some(item=>item.id===plateau.id));
});

test("Ask Your Data returns evidence and explicit analytical boundaries",()=>{
  const answer=engine.ask(populatedState(),"How consistent is my protein?",now);
  assert.match(answer.title,/Nutrition/);assert.ok(answer.evidence.length>=2);assert.match(answer.boundary,/no diagnosis|no proof/i);
  assert.match(engine.ask(populatedState(),"ما مدى انتظام البروتين؟",now).title,/Nutrition/);
});
