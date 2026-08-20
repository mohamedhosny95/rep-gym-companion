import test from "node:test";
import assert from "node:assert/strict";
await import("../src/client/store.js");
const engine = globalThis.REP_STORE_ENGINE;

test("ReactiveStore initializes and gets state", () => {
  const store = engine.createStore({ session: "gym", view: "home" });
  assert.equal(store.get("session"), "gym");
  assert.equal(store.get("view"), "home");
});

test("ReactiveStore notifies subscribers on key change", () => {
  const store = engine.createStore({ count: 0 });
  let notifiedVal = null, notifiedPrev = null;
  const unsubscribe = store.subscribe("count", (val, prev) => {
    notifiedVal = val;
    notifiedPrev = prev;
  });

  store.set("count", 5);
  assert.equal(notifiedVal, 5);
  assert.equal(notifiedPrev, 0);

  unsubscribe();
  store.set("count", 10);
  assert.equal(notifiedVal, 5); // Unsubscribed, should not receive 10
});

test("ReactiveStore batch update notifies changed keys", () => {
  const store = engine.createStore({ a: 1, b: 2 });
  const changes = [];
  store.subscribe("*", (key, val, prev) => {
    changes.push({ key, val, prev });
  });

  store.update({ a: 10, b: 20 });
  assert.equal(changes.length, 2);
  assert.equal(store.get("a"), 10);
  assert.equal(store.get("b"), 20);
});

test("ReactiveStore event bus emits and receives events", () => {
  const store = engine.createStore({});
  let payloadReceived = null;
  const off = store.on("workout:complete", data => {
    payloadReceived = data;
  });

  store.emit("workout:complete", { id: "gym-1", sets: 12 });
  assert.deepEqual(payloadReceived, { id: "gym-1", sets: 12 });

  off();
  store.emit("workout:complete", { id: "gym-2", sets: 15 });
  assert.deepEqual(payloadReceived, { id: "gym-1", sets: 12 });
});
