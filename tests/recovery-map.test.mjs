import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

const context={window:{},esc:value=>String(value)};
runInNewContext(await readFile(new URL("../src/client/recovery-map.js",import.meta.url),"utf8"),context);
const map=context.window.REP_RECOVERY_MAP;

test("recent muscle load is unknown without completed exercise evidence",()=>{
  const empty=map.computeMuscleReadiness([]);
  assert.equal(empty.chest.score,null);
  assert.equal(empty.quads.score,null);
  assert.match(map.renderRecoveryMap({history:[]}),/No recent logged sets/);
  assert.doesNotMatch(map.renderRecoveryMap({history:[]}),/>100%<|Fresh/);
});

test("completed Chest Press and Leg Press sets affect their muscle groups",()=>{
  const sets=[1,2,3].map(()=>({reps:10}));
  const history=[{date:new Date().toISOString(),entries:[...sets.map(set=>({exercise:"Chest Press",...set})),...sets.map(set=>({exercise:"Leg Press",...set}))]}];
  const result=map.computeMuscleReadiness(history);
  assert.ok(result.chest.score<100);
  assert.ok(result.quads.score<100);
  assert.equal(result.chest.totalSets72h,3);
  assert.equal(result.quads.totalSets72h,3);
  assert.equal(result.lats.score,null);
});

test("unfinished sets in a new workout record do not create a recovery signal",()=>{
  const history=[{date:new Date().toISOString(),entries:[],loads:{"Chest Press":{sets:[{reps:10}]}}}];
  assert.equal(map.computeMuscleReadiness(history).chest.score,null);
});

test("legacy load-only records still recognize spaced exercise names",()=>{
  const history=[{date:new Date().toISOString(),loads:{"Seated Cable Row":{sets:[{reps:10}]},"Lat Pulldown":{sets:[{reps:10}]}}}];
  const result=map.computeMuscleReadiness(history);
  assert.equal(result.lats.totalSets72h,2);
});

test("normal posterior-chain lifts update load without marking unrelated muscles",()=>{
  const history=[{date:new Date().toISOString(),entries:[{exercise:"Back Extension",reps:12},{exercise:"Glute Bridges",reps:12},{exercise:"Leg Press",reps:10}]}];
  const result=map.computeMuscleReadiness(history);
  assert.equal(result.hamstrings.totalSets72h,2);
  assert.equal(result.glutes.totalSets72h,3);
  assert.equal(result.quads.totalSets72h,1);
  assert.equal(result.chest.score,null);
});
