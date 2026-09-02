import test from "node:test";
import assert from "node:assert/strict";

await import("../src/client/adaptive-coach.js");
const coach=globalThis.REP_ADAPTIVE_COACH;

test("adaptive Today Plan turns readiness into a concrete safe session",()=>{
  const state={};
  assert.equal(coach.todayPlan({state,focus:"gym",recommendation:{mode:"normal",volumeFactor:1,intensityFactor:1},date:"2026-09-01"}).targetSession,"gym");
  const reduced=coach.todayPlan({state,focus:"gym",recommendation:{mode:"reduced",volumeFactor:.7,intensityFactor:.85},date:"2026-09-01"});
  assert.equal(reduced.targetSession,"gymLite");assert.ok(reduced.adjustments.some(item=>item.includes("2 sets")));
  assert.equal(coach.todayPlan({state,focus:"football",recommendation:{mode:"recovery"},date:"2026-09-01"}).targetSession,"bad");
  assert.equal(coach.todayPlan({state,focus:"gym",recommendation:{mode:"pause"},date:"2026-09-01"}).targetSession,null);
});

test("one-tap adaptive application reduces loads and clears stale set results",()=>{
  const state={logs:{"Leg Press":{sets:[{weight:"100",reps:"12",rpe:"8"}]}},trainingTargets:{},swaps:{}};
  const sessions={gymLite:{exercises:[{name:"Leg Press",sets:2}]}};
  const plan=coach.todayPlan({state,focus:"gym",recommendation:{mode:"reduced",volumeFactor:.7,intensityFactor:.85},date:"2026-09-01"});
  coach.applyPlan(state,plan,sessions);
  assert.equal(state.activeWorkoutPlan.targetSession,"gymLite");assert.equal(state.logs["Leg Press"].sets.length,2);assert.equal(state.logs["Leg Press"].sets[0].weight,"90");assert.equal(state.logs["Leg Press"].sets[0].reps,"");
});

test("automatic progression creates exact targets and applies them to the next workout",()=>{
  const record={id:44,date:"2026-09-01T18:00:00Z",session:"gym",entries:[{exercise:"Chest Press",weight:60,reps:12,rpe:7},{exercise:"Chest Press",weight:60,reps:12,rpe:7}]};
  const state={logs:{"Chest Press":{sets:[{weight:"60",reps:"12",rpe:"7"}]}},history:[record],trainingTargets:{}};
  const performance={progressionAdvice:()=>({status:"bump",suggestedWeight:61.25,message:"Two strong sessions."})};
  const proposals=coach.buildProgressionProposals(state,record,performance);
  assert.equal(proposals.length,1);assert.equal(proposals[0].status,"bump");assert.equal(proposals[0].targetWeight,61.25);
  coach.applyProgression(state,proposals);
  assert.equal(state.trainingTargets["Chest Press"].targetWeight,61.25);assert.equal(state.logs["Chest Press"].sets[0].weight,"61.25");assert.equal(state.logs["Chest Press"].sets[0].reps,"");
});

test("guided setup normalization creates a usable weekly schedule",()=>{
  const profile=coach.normalizeOnboarding({goal:"muscle",daysPerWeek:3,equipment:["machines"]});
  assert.equal(profile.goal,"muscle");assert.equal(profile.daysPerWeek,3);assert.deepEqual(profile.equipment,["machines"]);
  const schedule=coach.suggestedSchedule(profile.daysPerWeek);
  assert.equal(Object.values(schedule).filter(day=>day.focus==="gym").length,3);assert.equal(schedule.Friday.focus,"rest");
  assert.equal(Object.values(coach.suggestedSchedule(5)).filter(day=>day.focus==="gym").length,5);
  assert.equal(Object.values(coach.suggestedSchedule(6)).filter(day=>day.focus==="gym").length,6);
});
