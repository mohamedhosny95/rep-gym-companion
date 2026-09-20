import test from "node:test";
import assert from "node:assert/strict";

globalThis.window = globalThis;
await import("../src/client/sync-outbox.js");
const outbox = globalThis.REP_SYNC_OUTBOX;

test("Sync Outbox: Rapid queuing and state transitions under rapid connection flapping", () => {
  let queue = [];
  const totalItems = 50;

  // Enqueue 50 items
  for (let i = 0; i < totalItems; i++) {
    queue = outbox.enqueue(queue, { id: `food-${i}`, type: "food", calories: 200 + i });
  }
  assert.equal(queue.length, totalItems);
  assert.equal(outbox.summary(queue).pending, totalItems);

  // Simulate connection flapping: 20 items fail transiently, 10 succeed, 20 remain pending
  for (let i = 0; i < 20; i++) {
    queue = outbox.transmitting(queue, `food-${i}`);
    queue = outbox.failed(queue, `food-${i}`, "Network timeout (offline flap)");
  }
  for (let i = 20; i < 30; i++) {
    queue = outbox.transmitting(queue, `food-${i}`);
    queue = outbox.remove(queue, `food-${i}`); // Synced
  }

  const summary = outbox.summary(queue);
  assert.equal(summary.retryable_failed, 20);
  assert.equal(summary.pending, 20);
  assert.equal(summary.total, 40);
});

test("Sync Outbox: Handles clock skew gracefully in due() calculations", () => {
  let queue = [];
  queue = outbox.enqueue(queue, { id: "item-clock-skew", type: "habit" });
  queue = outbox.transmitting(queue, "item-clock-skew");
  queue = outbox.failed(queue, "item-clock-skew", "503 Service Unavailable");

  // Simulate past clock skew (e.g. system clock set back 1 year)
  queue[0].nextAttemptAt = "2020-01-01T00:00:00.000Z";
  let dueItems = outbox.due(queue);
  assert.equal(dueItems.length, 1, "Item with past timestamp should be immediately due");

  // Simulate future clock skew (e.g. timestamp set 1 hour in future)
  queue[0].nextAttemptAt = new Date(Date.now() + 3600000).toISOString();
  dueItems = outbox.due(queue);
  assert.equal(dueItems.length, 0, "Item with future timestamp should not be due yet");

  // With { all: true }, all non-permanently-failed items are returned regardless of clock
  dueItems = outbox.due(queue, { all: true });
  assert.equal(dueItems.length, 1);
});

test("Sync Outbox: Permanent failure transition and manual recovery", () => {
  let queue = [];
  queue = outbox.enqueue(queue, { id: "item-corrupt", type: "workout" });

  // Exceed max attempts
  for (let attempt = 1; attempt <= outbox.MAX_ATTEMPTS; attempt++) {
    queue = outbox.transmitting(queue, "item-corrupt");
    queue = outbox.failed(queue, "item-corrupt", `Attempt ${attempt} rejected`);
  }

  assert.equal(queue[0].status, "permanently_failed");
  assert.equal(outbox.due(queue).length, 0);

  // Manual recovery: Force re-enqueue resets attempts and status to pending
  queue = outbox.enqueue(queue, { id: "item-corrupt", type: "workout", fixed: true }, { force: true });
  assert.equal(queue[0].status, "pending");
  assert.equal(queue[0].attempts, 0);
  assert.equal(outbox.due(queue).length, 1);
});

test("Sync Outbox: Rapid enqueue-during-flight with interleaved out-of-order completions preserves latest revisions", () => {
  let queue = [];
  const totalItems = 30;

  // Enqueue 30 items
  for (let i = 0; i < totalItems; i++) {
    queue = outbox.enqueue(queue, { id: `item-${i}`, payload: { step: 1 } });
  }
  assert.equal(queue.length, totalItems);

  // All 30 items enter transmitting at revision 1
  for (let i = 0; i < totalItems; i++) {
    queue = outbox.transmitting(queue, `item-${i}`);
    assert.equal(queue.find(e => e.id === `item-${i}`).revision, 1);
  }

  // While in flight:
  // Items 0..19 get updated to step 2 (revision 2)
  for (let i = 0; i < 20; i++) {
    queue = outbox.enqueue(queue, { id: `item-${i}`, payload: { step: 2 } });
    assert.equal(queue.find(e => e.id === `item-${i}`).revision, 2);
  }

  // Items 0..9 get updated again to step 3 (revision 3)
  for (let i = 0; i < 10; i++) {
    queue = outbox.enqueue(queue, { id: `item-${i}`, payload: { step: 3 } });
    assert.equal(queue.find(e => e.id === `item-${i}`).revision, 3);
  }

  // Older revision 1 responses arrive for all 30 items
  for (let i = 0; i < totalItems; i++) {
    queue = outbox.remove(queue, `item-${i}`, { revision: 1 });
  }

  // Items 20..29 had no updates, so their revision 1 success removed them
  // Items 0..19 had newer revisions, so they were left pending
  assert.equal(queue.length, 20);
  const summaryAfterV1 = outbox.summary(queue);
  assert.equal(summaryAfterV1.pending, 20);
  assert.equal(summaryAfterV1.transmitting, 0);

  // Verify payloads and revisions
  for (let i = 0; i < 10; i++) {
    const entry = queue.find(e => e.id === `item-${i}`);
    assert.equal(entry.revision, 3);
    assert.equal(entry.item.payload.step, 3);
    assert.equal(entry.status, "pending");
  }
  for (let i = 10; i < 20; i++) {
    const entry = queue.find(e => e.id === `item-${i}`);
    assert.equal(entry.revision, 2);
    assert.equal(entry.item.payload.step, 2);
    assert.equal(entry.status, "pending");
  }

  // Older revision 2 responses arrive for items 0..19
  for (let i = 0; i < 20; i++) {
    queue = outbox.remove(queue, `item-${i}`, { revision: 2 });
  }

  // Items 10..19 were at revision 2, so they are now removed
  // Items 0..9 were at revision 3, so they remain pending
  assert.equal(queue.length, 10);
  for (let i = 0; i < 10; i++) {
    const entry = queue.find(e => e.id === `item-${i}`);
    assert.equal(entry.revision, 3);
    assert.equal(entry.item.payload.step, 3);
    assert.equal(entry.status, "pending");
  }

  // Finally, revision 3 responses arrive for items 0..9
  for (let i = 0; i < 10; i++) {
    queue = outbox.remove(queue, `item-${i}`, { revision: 3 });
  }

  assert.equal(queue.length, 0);
  assert.equal(outbox.summary(queue).total, 0);
});

test("Sync Outbox: Reclaims stale and interrupted transmissions under mixed timeouts", () => {
  let queue = [];
  const now = Date.now();

  // 10 items fresh transmitting, 10 items stale transmitting (>30s)
  for (let i = 0; i < 20; i++) {
    queue = outbox.enqueue(queue, { id: `stale-${i}`, count: i });
    queue = outbox.transmitting(queue, `stale-${i}`);
  }

  // Set 10 items to stale timestamps (35 seconds in the past)
  for (let i = 0; i < 10; i++) {
    const entry = queue.find(e => e.id === `stale-${i}`);
    entry.transmittingAt = new Date(now - 35000).toISOString();
  }
  // 10 items remain fresh (set timestamp to now)
  for (let i = 10; i < 20; i++) {
    const entry = queue.find(e => e.id === `stale-${i}`);
    entry.transmittingAt = new Date(now).toISOString();
  }

  // due() should reclaim and return only the 10 stale items
  const dueItems = outbox.due(queue, { now });
  assert.equal(dueItems.length, 10);
  for (const item of dueItems) {
    assert.equal(item.status, "pending");
    assert.ok(Number(item.id.replace("stale-", "")) < 10);
  }

  // Reclaim with startup=true should reclaim ALL remaining transmitting items
  const startupReclaimed = outbox.reclaim(queue, { startup: true, now });
  const summary = outbox.summary(startupReclaimed);
  assert.equal(summary.transmitting, 0);
  assert.equal(summary.pending, 20);
});

