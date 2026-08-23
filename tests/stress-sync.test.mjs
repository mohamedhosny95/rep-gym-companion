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
