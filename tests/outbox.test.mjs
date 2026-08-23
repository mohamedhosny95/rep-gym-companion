import test from "node:test";
import assert from "node:assert/strict";

globalThis.window={};
await import("../dist/client/sync-outbox.js");
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

