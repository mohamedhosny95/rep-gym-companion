import test from "node:test";
import assert from "node:assert/strict";

globalThis.window={};
await import("../src/client/sync-outbox.js");
const outbox=window.REP_SYNC_OUTBOX;

test("durable outbox preserves intent through retry and verified removal",()=>{
  const item={id:"food:entry-1",kind:"food",payload:{id:"entry-1"}};
  let queue=outbox.enqueue([],item);assert.equal(queue.length,1);assert.equal(queue[0].status,"pending");
  queue=outbox.transmitting(queue,item.id);assert.equal(queue[0].attempts,1);assert.equal(queue[0].status,"transmitting");
  queue=outbox.failed(queue,item.id,"Notion unavailable");assert.equal(queue[0].status,"retryable_failed");assert.ok(Date.parse(queue[0].nextAttemptAt)>Date.now());
  queue=outbox.remove(queue,item.id);assert.deepEqual(queue,[]);
});

test("durable outbox exposes permanently failed work after the retry ceiling",()=>{
  const item={id:"sleep:2026-08-13",kind:"sleep",payload:{date:"2026-08-13"}};
  let queue=outbox.enqueue([],item);
  for(let attempt=0;attempt<outbox.MAX_ATTEMPTS;attempt++){queue=outbox.transmitting(queue,item.id);queue=outbox.failed(queue,item.id,"still unavailable");}
  assert.equal(queue[0].status,"permanently_failed");assert.equal(queue[0].nextAttemptAt,null);assert.equal(outbox.summary(queue).permanently_failed,1);
});

test("durable outbox computes exponential backoff delays with upper bounds",()=>{
  assert.equal(outbox.delayFor(1),5000);
  assert.equal(outbox.delayFor(2),10000);
  assert.equal(outbox.delayFor(3),20000);
  assert.ok(outbox.delayFor(12)<=30*60*1000);
});

test("enqueue deduplicates pending items while preserving latest payload",()=>{
  const item1={id:"habit:water",kind:"habit",payload:{count:1}};
  const item2={id:"habit:water",kind:"habit",payload:{count:2}};
  let queue=outbox.enqueue([],item1);
  queue=outbox.enqueue(queue,item2);
  assert.equal(queue.length,1);
  assert.equal(queue[0].item.payload.count,2);
  assert.equal(queue[0].status,"pending");
});

test("monotonically increments payload revision/version while normalizing legacy persisted entries",()=>{
  const legacyEntry={schema:1,id:"legacy:1",item:{id:"legacy:1",count:10},status:"pending",attempts:0};
  const normalized=outbox.normalize(legacyEntry);
  assert.equal(normalized.revision,1);
  assert.equal(normalized.version,1);

  let queue=outbox.enqueue([],[{id:"entry-1",val:"a"}][0]);
  assert.equal(queue[0].revision,1);
  assert.equal(queue[0].version,1);

  queue=outbox.enqueue(queue,{id:"entry-1",val:"b"});
  assert.equal(queue[0].revision,2);
  assert.equal(queue[0].version,2);
  assert.equal(queue[0].item.val,"b");

  queue=outbox.enqueue(queue,{id:"entry-1",val:"c"});
  assert.equal(queue[0].revision,3);
  assert.equal(queue[0].version,3);
  assert.equal(queue[0].item.val,"c");
});

test("reload during transmitting reclaims interrupted sends without losing attempts",()=>{
  const item={id:"food:snack-1",kind:"food",payload:{id:"snack-1",food_name:"Banana"}};
  let queue=outbox.enqueue([],item);
  queue=outbox.transmitting(queue,item.id);
  assert.equal(queue[0].status,"transmitting");
  assert.equal(queue[0].attempts,1);
  assert.ok(queue[0].transmittingAt);

  // Simulate process restart / reload: persisted queue is loaded and startup reclaim runs
  const reloaded=JSON.parse(JSON.stringify(queue));
  const reclaimed=outbox.reclaim(reloaded,{startup:true});
  assert.equal(reclaimed.length,1);
  assert.equal(reclaimed[0].status,"pending");
  assert.equal(reclaimed[0].attempts,1);
  assert.equal(reclaimed[0].transmittingAt,null);
  assert.equal(reclaimed[0].revision,1);

  // Reclaimed item is immediately due
  const dueItems=outbox.due(reclaimed);
  assert.equal(dueItems.length,1);
  assert.equal(dueItems[0].id,item.id);
});

test("stale transmitting entry is reclaimed during due selection after timeout",()=>{
  const item={id:"workout:run-1",kind:"workout",workout:{id:"run-1"}};
  let queue=outbox.enqueue([],item);
  queue=outbox.transmitting(queue,item.id);

  // If transmission is fresh (< 30s), due() does not pick it up (already in flight)
  assert.equal(outbox.due(queue).length,0);

  // If transmission is stale (exceeded 30s timeout), due() reclaims it to pending
  queue[0].transmittingAt=new Date(Date.now()-35000).toISOString();
  const dueItems=outbox.due(queue);
  assert.equal(dueItems.length,1);
  assert.equal(dueItems[0].status,"pending");
  assert.equal(dueItems[0].transmittingAt,null);

  // Legacy transmitting entry missing transmittingAt is also treated as stale and reclaimed
  const legacyTransmitting=[{schema:1,id:"leg-t",item:{id:"leg-t"},status:"transmitting",attempts:1}];
  const dueLegacy=outbox.due(legacyTransmitting);
  assert.equal(dueLegacy.length,1);
  assert.equal(dueLegacy[0].status,"pending");
});

test("enqueue-during-flight followed by an older success never discards the newer payload",()=>{
  const itemV1={id:"habit:steps",kind:"habit",payload:{count:5000}};
  let queue=outbox.enqueue([],itemV1);
  assert.equal(queue[0].revision,1);

  // Begin transmission of revision 1
  queue=outbox.transmitting(queue,itemV1.id);
  assert.equal(queue[0].status,"transmitting");
  assert.equal(queue[0].attempts,1);

  // User updates the item while revision 1 is in flight
  const itemV2={id:"habit:steps",kind:"habit",payload:{count:10000}};
  queue=outbox.enqueue(queue,itemV2);
  assert.equal(queue.length,1);
  assert.equal(queue[0].revision,2);
  assert.equal(queue[0].version,2);
  assert.equal(queue[0].item.payload.count,10000);

  // Older request succeeds and tries to remove revision 1
  queue=outbox.remove(queue,itemV1.id,{revision:1});
  assert.equal(queue.length,1,"Newer revision must not be removed by older success");
  assert.equal(queue[0].status,"pending","Newer revision must be left pending for transmission");
  assert.equal(queue[0].revision,2);
  assert.equal(queue[0].item.payload.count,10000,"Newer payload must be intact");
  assert.equal(queue[0].transmittingAt,null);

  // Now revision 2 is transmitted and succeeds
  queue=outbox.transmitting(queue,itemV1.id);
  assert.equal(queue[0].status,"transmitting");
  assert.equal(queue[0].revision,2);

  queue=outbox.remove(queue,itemV1.id,{revision:2});
  assert.deepEqual(queue,[],"Queue must be empty once the matching revision succeeds");
});

test("enqueue-during-flight followed by an older failure keeps newer revision pending",()=>{
  const itemV1={id:"habit:water",kind:"habit",payload:{count:1}};
  let queue=outbox.enqueue([],itemV1);
  queue=outbox.transmitting(queue,itemV1.id);

  // New payload arrives while rev 1 is in flight
  const itemV2={id:"habit:water",kind:"habit",payload:{count:2}};
  queue=outbox.enqueue(queue,itemV2);
  assert.equal(queue[0].revision,2);

  // Older revision 1 request fails
  queue=outbox.failed(queue,itemV1.id,"Transient network failure",{revision:1});
  assert.equal(queue.length,1);
  assert.equal(queue[0].status,"pending","Newer revision must remain pending rather than failed");
  assert.equal(queue[0].revision,2);
  assert.equal(queue[0].item.payload.count,2);
});

