import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const storageCode = readFileSync(join(root, "src/client/storage.js"), "utf8");

function createMockIndexedDB(sharedStores = new Map()) {
  let currentWriteTx = null;
  const writeTxQueue = [];

  function advanceTxQueue() {
    if (!currentWriteTx && writeTxQueue.length > 0) {
      const next = writeTxQueue.shift();
      next();
    }
  }

  return {
    _stores: sharedStores,
    open(name, version) {
      const request = { result: null, error: null, onsuccess: null, onerror: null, onupgradeneeded: null };
      setTimeout(() => {
        if (!sharedStores.has("records")) sharedStores.set("records", new Map());
        const db = {
          createObjectStore(storeName) {
            if (!sharedStores.has(storeName)) sharedStores.set(storeName, new Map());
            return {};
          },
          transaction(storeNames, mode = "readonly") {
            const storeMap = sharedStores.get("records");
            let pendingOps = 0;
            let completeCallback = null;
            let started = mode !== "readwrite" || !currentWriteTx;
            const queuedOps = [];

            function maybeComplete() {
              if (started && pendingOps === 0 && completeCallback) {
                const cb = completeCallback;
                completeCallback = null;
                setTimeout(() => {
                  if (cb) cb();
                  if (mode === "readwrite") {
                    currentWriteTx = null;
                    advanceTxQueue();
                  }
                }, 0);
              }
            }

            const txObj = {
              objectStore(storeName) {
                return {
                  get(key) {
                    pendingOps++;
                    const req = { result: undefined, error: null, onsuccess: null, onerror: null };
                    const execute = () => {
                      setTimeout(() => {
                        req.result = storeMap.get(key);
                        if (req.onsuccess) req.onsuccess();
                        pendingOps--;
                        maybeComplete();
                      }, 0);
                    };
                    if (started) execute();
                    else queuedOps.push(execute);
                    return req;
                  },
                  put(value, key) {
                    const execute = () => {
                      storeMap.set(key, JSON.parse(JSON.stringify(value)));
                    };
                    if (started) execute();
                    else queuedOps.push(execute);
                  },
                  clear() {
                    const execute = () => {
                      storeMap.clear();
                    };
                    if (started) execute();
                    else queuedOps.push(execute);
                  }
                };
              },
              get oncomplete() { return completeCallback; },
              set oncomplete(fn) {
                completeCallback = fn;
                maybeComplete();
              }
            };

            if (mode === "readwrite") {
              if (!currentWriteTx) {
                currentWriteTx = txObj;
              } else {
                writeTxQueue.push(() => {
                  currentWriteTx = txObj;
                  started = true;
                  for (const op of queuedOps) op();
                  maybeComplete();
                });
              }
            }

            return txObj;
          },
          close() {}
        };
        request.result = db;
        if (request.onsuccess) request.onsuccess();
      }, 0);
      return request;
    }
  };
}

function createMockLocalStorage(sharedMap = new Map()) {
  return {
    getItem(key) { return sharedMap.get(key) || null; },
    setItem(key, value) { sharedMap.set(key, String(value)); },
    removeItem(key) { sharedMap.delete(key); },
    clear() { sharedMap.clear(); }
  };
}

function createTabStorageContext(sharedIDB, sharedLS) {
  const listeners = new Map();
  const sandbox = {
    indexedDB: sharedIDB,
    localStorage: sharedLS,
    document: { addEventListener: () => {}, visibilityState: "visible" },
    addEventListener: (type, fn) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
    },
    removeEventListener: (type, fn) => {
      listeners.get(type)?.delete(fn);
    },
    dispatchEvent: (evt) => {
      const list = listeners.get(evt.type);
      if (list) for (const fn of list) fn(evt);
      return true;
    },
    clearTimeout,
    setTimeout,
    JSON,
    Map,
    Set,
    Promise,
    Error,
    Object,
    Array,
    Date,
    structuredClone: (val) => JSON.parse(JSON.stringify(val)),
    window: {}
  };
  sandbox.window = sandbox;
  const context = vm.createContext(sandbox);
  vm.runInContext(storageCode, context);
  return sandbox.window.REP_STORE;
}

test("Multi-tab concurrency: Independent tabs modifying disjoint LARGE_KEYS do not clobber each other in IndexedDB (using real storage.js)", async () => {
  const sharedStores = new Map();
  const sharedLSMap = new Map();
  const sharedIDB = createMockIndexedDB(sharedStores);
  const sharedLS = createMockLocalStorage(sharedLSMap);

  const tab1 = createTabStorageContext(sharedIDB, sharedLS);
  const tab2 = createTabStorageContext(sharedIDB, sharedLS);

  // Tab 1 & Tab 2 hydrate initial state
  const state1 = await tab1.hydrate("rep-app");
  const state2 = await tab2.hydrate("rep-app");

  // Tab 1 adds a food entry
  state1.foodEntries = [{ id: "f1", name: "Banana", calories: 105 }];
  tab1.persist("rep-app", state1);
  await tab1.flush();

  // Tab 2 checks a habit without reloading
  state2.daily = { habits: { "2026-08-23": { water: true } } };
  tab2.persist("rep-app", state2);
  await tab2.flush();

  // Inspect shared IndexedDB records
  const records = sharedStores.get("records");
  assert.equal(records.get("state:foodEntries").length, 1);
  assert.equal(records.get("state:foodEntries")[0].name, "Banana");
  assert.equal(records.get("state:daily").habits["2026-08-23"].water, true);

  // Re-hydration in a fresh tab 3 retrieves both mutations
  const tab3 = createTabStorageContext(sharedIDB, sharedLS);
  const state3 = await tab3.hydrate("rep-app");
  assert.equal(state3.foodEntries[0].name, "Banana");
  assert.equal(state3.daily.habits["2026-08-23"].water, true);
});

test("Multi-tab concurrency: Concurrent writes to the same key preserve additions instead of silent clobbering", async () => {
  const sharedStores = new Map();
  const sharedLSMap = new Map();
  const sharedIDB = createMockIndexedDB(sharedStores);
  const sharedLS = createMockLocalStorage(sharedLSMap);

  const tab1 = createTabStorageContext(sharedIDB, sharedLS);
  const tab2 = createTabStorageContext(sharedIDB, sharedLS);

  const state1 = await tab1.hydrate("rep-app");
  const state2 = await tab2.hydrate("rep-app");

  state1.foodEntries = [{ id: "f1", name: "Apple", calories: 95 }];
  tab1.persist("rep-app", state1);
  await tab1.flush();

  state2.foodEntries = [{ id: "f2", name: "Orange", calories: 60 }];
  tab2.persist("rep-app", state2);
  await tab2.flush();

  const records = sharedStores.get("records");
  const foods = records.get("state:foodEntries");
  assert.equal(foods.length, 2, "Both concurrent additions are preserved");
  assert.equal(foods[0].name, "Orange");
  assert.equal(foods[1].name, "Apple");

  // A later unrelated save from the stale tab must not reinterpret the
  // other tab's merged addition as an intentional deletion.
  state2.daily = { habits: { "2026-08-24": { water: true } } };
  tab2.persist("rep-app", state2);
  await tab2.flush();
  const foodsAfterLaterSave = records.get("state:foodEntries");
  assert.equal(foodsAfterLaterSave.length, 2, "A later stale-tab save preserves both additions");
  assert.ok(foodsAfterLaterSave.some(food => food.name === "Apple"));
  assert.ok(foodsAfterLaterSave.some(food => food.name === "Orange"));

  // A subsequent same-key addition from tab 2 preserves earlier merged addition from tab 1
  state2.foodEntries = [
    { id: "f2", name: "Orange", calories: 60 },
    { id: "f3", name: "Pear", calories: 80 }
  ];
  tab2.persist("rep-app", state2);
  await tab2.flush();
  const foodsAfterSubsequentAddition = records.get("state:foodEntries");
  assert.equal(foodsAfterSubsequentAddition.length, 3, "Subsequent addition preserves all 3 records");
  assert.ok(foodsAfterSubsequentAddition.some(food => food.name === "Apple"));
  assert.ok(foodsAfterSubsequentAddition.some(food => food.name === "Orange"));
  assert.ok(foodsAfterSubsequentAddition.some(food => food.name === "Pear"));

  // A subsequent intentional deletion of Orange from tab 2 deletes Orange while preserving Apple and Pear
  state2.foodEntries = [{ id: "f3", name: "Pear", calories: 80 }];
  tab2.persist("rep-app", state2);
  await tab2.flush();
  const foodsAfterDeletion = records.get("state:foodEntries");
  assert.equal(foodsAfterDeletion.length, 2, "Intentional deletion removes Orange and preserves Apple and Pear");
  assert.ok(foodsAfterDeletion.some(food => food.name === "Apple"));
  assert.ok(foodsAfterDeletion.some(food => food.name === "Pear"));
  assert.ok(!foodsAfterDeletion.some(food => food.name === "Orange"));
});

test("Multi-tab concurrency: Concurrent additions across multiple LARGE_KEYS (history, sleepLogs, bodyWeights) are preserved", async () => {
  const sharedStores = new Map();
  const sharedLSMap = new Map();
  const sharedIDB = createMockIndexedDB(sharedStores);
  const sharedLS = createMockLocalStorage(sharedLSMap);

  const tab1 = createTabStorageContext(sharedIDB, sharedLS);
  const tab2 = createTabStorageContext(sharedIDB, sharedLS);

  const state1 = await tab1.hydrate("rep-app");
  const state2 = await tab2.hydrate("rep-app");

  // Tab 1 logs workout and weight
  state1.history = [{ date: "2026-08-20", session: "gym", exercises: [{ name: "Squat" }] }];
  state1.bodyWeights = [{ week: "2026-W33", date: "2026-08-17", kg: 76.0 }];
  tab1.persist("rep-app", state1);
  await tab1.flush();

  // Tab 2 logs different workout, sleep, and subsequent weight
  state2.history = [{ date: "2026-08-21", session: "cardio", exercises: [{ name: "Running" }] }];
  state2.sleepLogs = [{ date: "2026-08-21", hours: 8.0, bedtime: "23:00", wake: "07:00" }];
  state2.bodyWeights = [{ week: "2026-W34", date: "2026-08-24", kg: 75.5 }];
  tab2.persist("rep-app", state2);
  await tab2.flush();

  const records = sharedStores.get("records");
  const history = records.get("state:history");
  const weights = records.get("state:bodyWeights");
  const sleep = records.get("state:sleepLogs");

  assert.equal(history.length, 2, "Both workouts preserved");
  assert.ok(history.some(h => h.session === "gym"));
  assert.ok(history.some(h => h.session === "cardio"));

  assert.equal(weights.length, 2, "Both weekly weights preserved");
  assert.ok(weights.some(w => w.week === "2026-W33" && w.kg === 76.0));
  assert.ok(weights.some(w => w.week === "2026-W34" && w.kg === 75.5));

  assert.equal(sleep.length, 1);
  assert.equal(sleep[0].hours, 8.0);
});

test("Multi-tab concurrency: Independent object-field changes merge without clobbering (daily, completed, logs, healthMetrics)", async () => {
  const sharedStores = new Map();
  const sharedLSMap = new Map();
  const sharedIDB = createMockIndexedDB(sharedStores);
  const sharedLS = createMockLocalStorage(sharedLSMap);

  const tab1 = createTabStorageContext(sharedIDB, sharedLS);
  const tab2 = createTabStorageContext(sharedIDB, sharedLS);

  const state1 = await tab1.hydrate("rep-app");
  const state2 = await tab2.hydrate("rep-app");

  // Tab 1 updates daily habits for day 1, completed set 1, and bench press logs
  state1.daily = { habits: { "2026-08-23": { water: true } }, hygiene: { "2026-08-23": { teeth: true } } };
  state1.completed = { "gym-0": [0, 1] };
  state1.logs = { "Bench Press": { sets: [{ weight: "80", reps: "8" }] } };
  state1.healthMetrics = { "2026-08-23": { date: "2026-08-23", steps: 8500 } };
  tab1.persist("rep-app", state1);
  await tab1.flush();

  // Tab 2 updates daily habits for day 2, completed sets for gym-1, incline press logs, and vo2Max
  state2.daily = { habits: { "2026-08-24": { sleep: true } } };
  state2.completed = { "gym-1": [0] };
  state2.logs = { "Incline Press": { sets: [{ weight: "60", reps: "10" }] } };
  state2.healthMetrics = { "2026-08-23": { date: "2026-08-23", vo2Max: 48 } };
  tab2.persist("rep-app", state2);
  await tab2.flush();

  const records = sharedStores.get("records");
  const daily = records.get("state:daily");
  const completed = records.get("state:completed");
  const logs = records.get("state:logs");
  const metrics = records.get("state:healthMetrics");

  // daily merged
  assert.equal(daily.habits["2026-08-23"].water, true);
  assert.equal(daily.habits["2026-08-24"].sleep, true);
  assert.equal(daily.hygiene["2026-08-23"].teeth, true);

  // completed merged
  assert.deepEqual(completed["gym-0"], [0, 1]);
  assert.deepEqual(completed["gym-1"], [0]);

  // logs merged
  assert.equal(logs["Bench Press"].sets[0].weight, "80");
  assert.equal(logs["Incline Press"].sets[0].weight, "60");

  // healthMetrics merged independent fields on the same date
  assert.equal(metrics["2026-08-23"].steps, 8500);
  assert.equal(metrics["2026-08-23"].vo2Max, 48);

  // A subsequent save from tab 2 with additional habit preserves tab 1's habits and hygiene
  state2.daily.habits["2026-08-25"] = { workout: true };
  tab2.persist("rep-app", state2);
  await tab2.flush();

  const dailyAfterSubsequentSave = records.get("state:daily");
  assert.equal(dailyAfterSubsequentSave.habits["2026-08-23"].water, true);
  assert.equal(dailyAfterSubsequentSave.habits["2026-08-24"].sleep, true);
  assert.equal(dailyAfterSubsequentSave.habits["2026-08-25"].workout, true);
  assert.equal(dailyAfterSubsequentSave.hygiene["2026-08-23"].teeth, true);
});

test("Multi-tab concurrency: Concurrent updates to independent fields of the same entity merge cleanly", async () => {
  const sharedStores = new Map();
  const sharedLSMap = new Map();
  const sharedIDB = createMockIndexedDB(sharedStores);
  const sharedLS = createMockLocalStorage(sharedLSMap);

  // Seed with existing food entry
  const tabInit = createTabStorageContext(sharedIDB, sharedLS);
  const stateInit = await tabInit.hydrate("rep-app");
  stateInit.foodEntries = [{ id: "f1", name: "Apple", calories: 95, protein_g: 0.5, rawNote: "fruit" }];
  tabInit.persist("rep-app", stateInit);
  await tabInit.flush();

  // Tab 1 and Tab 2 hydrate base
  const tab1 = createTabStorageContext(sharedIDB, sharedLS);
  const tab2 = createTabStorageContext(sharedIDB, sharedLS);
  const state1 = await tab1.hydrate("rep-app");
  const state2 = await tab2.hydrate("rep-app");

  // Tab 1 updates calories only
  state1.foodEntries[0].calories = 105;
  tab1.persist("rep-app", state1);
  await tab1.flush();

  // Tab 2 updates name and note only
  state2.foodEntries[0].name = "Honeycrisp Apple";
  state2.foodEntries[0].rawNote = "Crisp Honeycrisp";
  tab2.persist("rep-app", state2);
  await tab2.flush();

  const records = sharedStores.get("records");
  const foods = records.get("state:foodEntries");
  assert.equal(foods.length, 1);
  assert.equal(foods[0].id, "f1");
  assert.equal(foods[0].name, "Honeycrisp Apple");
  assert.equal(foods[0].calories, 105);
  assert.equal(foods[0].rawNote, "Crisp Honeycrisp");
  assert.equal(foods[0].protein_g, 0.5);
  assert.equal(tab2.getConflicts().length, 0, "No conflict for independent fields");
});

test("Multi-tab concurrency: Intentional deletion from writing tab is preserved and does NOT resurrect deleted records", async () => {
  const sharedStores = new Map();
  const sharedLSMap = new Map();
  const sharedIDB = createMockIndexedDB(sharedStores);
  const sharedLS = createMockLocalStorage(sharedLSMap);

  // Seed two food entries
  const tabInit = createTabStorageContext(sharedIDB, sharedLS);
  const stateInit = await tabInit.hydrate("rep-app");
  stateInit.foodEntries = [
    { id: "f1", name: "Apple", calories: 95 },
    { id: "f2", name: "Banana", calories: 105 }
  ];
  tabInit.persist("rep-app", stateInit);
  await tabInit.flush();

  // Tab 1 & Tab 2 hydrate
  const tab1 = createTabStorageContext(sharedIDB, sharedLS);
  const tab2 = createTabStorageContext(sharedIDB, sharedLS);
  const state1 = await tab1.hydrate("rep-app");
  const state2 = await tab2.hydrate("rep-app");

  // Tab 1 deletes f1 intentionally
  state1.foodEntries = state1.foodEntries.filter(e => e.id !== "f1");
  tab1.persist("rep-app", state1);
  await tab1.flush();

  // IDB should have only f2
  const records = sharedStores.get("records");
  assert.equal(records.get("state:foodEntries").length, 1);
  assert.equal(records.get("state:foodEntries")[0].id, "f2");

  // Tab 2 now mutates another field (e.g. daily) without touching foodEntries
  state2.daily = { habits: { "2026-08-23": { water: true } } };
  tab2.persist("rep-app", state2);
  await tab2.flush();

  // Verify f1 was NOT resurrected by Tab 2's write
  const freshRecords = sharedStores.get("records");
  assert.equal(freshRecords.get("state:foodEntries").length, 1);
  assert.equal(freshRecords.get("state:foodEntries")[0].id, "f2");
});

test("Multi-tab concurrency: Concurrent addition during intentional deletion preserves addition while deleting target", async () => {
  const sharedStores = new Map();
  const sharedLSMap = new Map();
  const sharedIDB = createMockIndexedDB(sharedStores);
  const sharedLS = createMockLocalStorage(sharedLSMap);

  // Seed f1
  const tabInit = createTabStorageContext(sharedIDB, sharedLS);
  const stateInit = await tabInit.hydrate("rep-app");
  stateInit.foodEntries = [{ id: "f1", name: "Apple", calories: 95 }];
  tabInit.persist("rep-app", stateInit);
  await tabInit.flush();

  // Tab 1 & Tab 2 hydrate base with f1
  const tab1 = createTabStorageContext(sharedIDB, sharedLS);
  const tab2 = createTabStorageContext(sharedIDB, sharedLS);
  const state1 = await tab1.hydrate("rep-app");
  const state2 = await tab2.hydrate("rep-app");

  // Tab 1 concurrently adds f2
  state1.foodEntries = [
    { id: "f2", name: "Banana", calories: 105 },
    { id: "f1", name: "Apple", calories: 95 }
  ];
  tab1.persist("rep-app", state1);
  await tab1.flush();

  // Tab 2 deletes f1 (only has empty array)
  state2.foodEntries = [];
  tab2.persist("rep-app", state2);
  await tab2.flush();

  // Durable store should contain f2, and f1 should remain deleted
  const records = sharedStores.get("records");
  const foods = records.get("state:foodEntries");
  assert.equal(foods.length, 1, "f1 deleted, f2 preserved");
  assert.equal(foods[0].id, "f2");
  assert.equal(foods[0].name, "Banana");
});

test("Multi-tab concurrency: Ambiguous conflicting scalar updates preserve newer durable value and surface conflict signal", async () => {
  const sharedStores = new Map();
  const sharedLSMap = new Map();
  const sharedIDB = createMockIndexedDB(sharedStores);
  const sharedLS = createMockLocalStorage(sharedLSMap);

  // Seed f1
  const tabInit = createTabStorageContext(sharedIDB, sharedLS);
  const stateInit = await tabInit.hydrate("rep-app");
  stateInit.foodEntries = [{ id: "f1", name: "Apple", calories: 95 }];
  tabInit.persist("rep-app", stateInit);
  await tabInit.flush();

  // Tab 1 & Tab 2 hydrate
  const tab1 = createTabStorageContext(sharedIDB, sharedLS);
  const tab2 = createTabStorageContext(sharedIDB, sharedLS);
  const state1 = await tab1.hydrate("rep-app");
  const state2 = await tab2.hydrate("rep-app");

  // Tab 1 updates calories to 120
  state1.foodEntries[0].calories = 120;
  tab1.persist("rep-app", state1);
  await tab1.flush();

  // Tab 2 concurrently updates calories to 150
  let conflictReceived = null;
  tab2.onConflict = (c) => { conflictReceived = c; };

  state2.foodEntries[0].calories = 150;
  tab2.persist("rep-app", state2);
  await tab2.flush();

  const records = sharedStores.get("records");
  const foods = records.get("state:foodEntries");
  assert.equal(foods.length, 1);
  // Newer durable value (120) must be preserved
  assert.equal(foods[0].calories, 120, "Preserves newer durable value");

  // Conflict signal must be surfaced
  assert.ok(conflictReceived !== null, "Conflict callback was invoked");
  assert.equal(conflictReceived.key, "foodEntries");
  assert.equal(conflictReceived.durable, 120);
  assert.equal(conflictReceived.local, 150);

  const tab2Conflicts = tab2.getConflicts();
  assert.equal(tab2Conflicts.length, 1);
  assert.equal(tab2Conflicts[0].key, "foodEntries");
});

test("Multi-tab concurrency: Deletion vs modification conflict preserves newer durable modified value and signals conflict", async () => {
  const sharedStores = new Map();
  const sharedLSMap = new Map();
  const sharedIDB = createMockIndexedDB(sharedStores);
  const sharedLS = createMockLocalStorage(sharedLSMap);

  // Seed f1
  const tabInit = createTabStorageContext(sharedIDB, sharedLS);
  const stateInit = await tabInit.hydrate("rep-app");
  stateInit.foodEntries = [{ id: "f1", name: "Apple", calories: 95 }];
  tabInit.persist("rep-app", stateInit);
  await tabInit.flush();

  // Tab 1 & Tab 2 hydrate
  const tab1 = createTabStorageContext(sharedIDB, sharedLS);
  const tab2 = createTabStorageContext(sharedIDB, sharedLS);
  const state1 = await tab1.hydrate("rep-app");
  const state2 = await tab2.hydrate("rep-app");

  // Tab 1 modifies f1
  state1.foodEntries[0].calories = 130;
  tab1.persist("rep-app", state1);
  await tab1.flush();

  // Tab 2 deletes f1
  state2.foodEntries = [];
  tab2.persist("rep-app", state2);
  await tab2.flush();

  const records = sharedStores.get("records");
  const foods = records.get("state:foodEntries");
  assert.equal(foods.length, 1, "Preserves modified durable item over stale deletion");
  assert.equal(foods[0].id, "f1");
  assert.equal(foods[0].calories, 130);

  const conflicts = tab2.getConflicts();
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].key, "foodEntries");
});

test("Multi-tab concurrency: Simultaneous flushes from two tabs queue safely and merge both tabs' deltas", async () => {
  const sharedStores = new Map();
  const sharedLSMap = new Map();
  const sharedIDB = createMockIndexedDB(sharedStores);
  const sharedLS = createMockLocalStorage(sharedLSMap);

  const tab1 = createTabStorageContext(sharedIDB, sharedLS);
  const tab2 = createTabStorageContext(sharedIDB, sharedLS);

  const state1 = await tab1.hydrate("rep-app");
  const state2 = await tab2.hydrate("rep-app");

  state1.foodEntries = [{ id: "f1", name: "Apple", calories: 95 }];
  state2.foodEntries = [{ id: "f2", name: "Orange", calories: 60 }];

  tab1.persist("rep-app", state1);
  tab2.persist("rep-app", state2);

  // Simultaneous flushes without awaiting tab1 before tab2
  await Promise.all([tab1.flush(), tab2.flush()]);

  const records = sharedStores.get("records");
  const foods = records.get("state:foodEntries");
  assert.equal(foods.length, 2, "Both food entries preserved under concurrent flush");
  assert.ok(foods.some(f => f.name === "Apple"));
  assert.ok(foods.some(f => f.name === "Orange"));
});

test("Defect 1: Revision-aware outbox deletion retains concurrently newer revision 2 when tab A acknowledges revision 1", async () => {
  const sharedStores = new Map();
  const sharedLSMap = new Map();
  const sharedIDB = createMockIndexedDB(sharedStores);
  const sharedLS = createMockLocalStorage(sharedLSMap);

  // 1. Seed durable store with outbox revision 1
  const tabInit = createTabStorageContext(sharedIDB, sharedLS);
  const stateInit = await tabInit.hydrate("rep-app");
  stateInit.outbox = [
    { id: "sync:1", revision: 1, version: 1, item: { id: "sync:1", data: "initial" }, status: "pending" }
  ];
  tabInit.persist("rep-app", stateInit);
  await tabInit.flush();

  // Verify seed in records
  const records = sharedStores.get("records");
  assert.equal(records.get("state:outbox").length, 1);
  assert.equal(records.get("state:outbox")[0].revision, 1);

  // 2. Both tabs hydrate outbox revision 1
  const tabA = createTabStorageContext(sharedIDB, sharedLS);
  const tabB = createTabStorageContext(sharedIDB, sharedLS);
  const stateA = await tabA.hydrate("rep-app");
  const stateB = await tabB.hydrate("rep-app");
  assert.equal(stateA.outbox[0].revision, 1);
  assert.equal(stateB.outbox[0].revision, 1);

  // 3. Tab A acknowledges revision 1 and persists an empty outbox
  stateA.outbox = [];
  tabA.persist("rep-app", stateA);

  // 4. Tab B has already changed/enqueued the same id at revision 2
  stateB.outbox = [
    { id: "sync:1", revision: 2, version: 2, item: { id: "sync:1", data: "updated" }, status: "pending" }
  ];
  tabB.persist("rep-app", stateB);

  // Flush A first (A persists empty outbox)
  await tabA.flush();
  assert.equal(records.get("state:outbox").length, 0, "Tab A flush left durable outbox empty");

  // Tab B flushes after A
  await tabB.flush();

  // 5. Durable IndexedDB and a fresh reload must retain revision 2
  const durableOutbox = records.get("state:outbox");
  assert.equal(durableOutbox.length, 1, "Durable outbox retains revision 2");
  assert.equal(durableOutbox[0].id, "sync:1");
  assert.equal(durableOutbox[0].revision, 2);
  assert.equal(durableOutbox[0].item.data, "updated");

  // Fresh reload in tab C
  const tabC = createTabStorageContext(sharedIDB, sharedLS);
  const stateC = await tabC.hydrate("rep-app");
  assert.equal(stateC.outbox.length, 1, "Fresh reload retains revision 2");
  assert.equal(stateC.outbox[0].id, "sync:1");
  assert.equal(stateC.outbox[0].revision, 2);
  assert.equal(stateC.outbox[0].item.data, "updated");

  // Intentional deletion when there is no newer revision is preserved
  stateC.outbox = [];
  tabC.persist("rep-app", stateC);
  await tabC.flush();
  assert.equal(records.get("state:outbox").length, 0, "Intentional deletion of observed revision is preserved");

  const tabD = createTabStorageContext(sharedIDB, sharedLS);
  const stateD = await tabD.hydrate("rep-app");
  assert.equal(stateD.outbox.length, 0, "Durable outbox remains empty after intentional deletion");
});

test("Defect 2: replace() is exclusive with queued/in-flight writes, invalidating prior writes and guaranteeing replacement state", async () => {
  const sharedStores = new Map();
  const sharedLSMap = new Map();
  const sharedIDB = createMockIndexedDB(sharedStores);
  const sharedLS = createMockLocalStorage(sharedLSMap);

  const tab = createTabStorageContext(sharedIDB, sharedLS);
  const state = await tab.hydrate("rep-app");

  // 1. Queue a pending write
  state.foodEntries = [{ id: "stale-food", name: "Old Stale Food", calories: 999 }];
  tab.persist("rep-app", state);
  const pendingFlush = tab.flush();

  // 2. Concurrently call replace() with replacement data
  const replacementState = {
    foodEntries: [{ id: "fresh-food", name: "Fresh Banana", calories: 105 }],
    history: [{ date: "2026-08-25", session: "gym", exercises: [] }]
  };
  await tab.replace("rep-app", replacementState);

  // Wait for prior flush to settle
  await pendingFlush;

  // 3. Durable data must equal replacement, never stale queued state
  const records = sharedStores.get("records");
  const durableFoods = records.get("state:foodEntries");
  assert.equal(durableFoods.length, 1);
  assert.equal(durableFoods[0].id, "fresh-food");
  assert.equal(durableFoods[0].name, "Fresh Banana");

  const durableHistory = records.get("state:history");
  assert.equal(durableHistory.length, 1);
  assert.equal(durableHistory[0].date, "2026-08-25");

  // Fresh reload must see only replacement state
  const tabReload = createTabStorageContext(sharedIDB, sharedLS);
  const reloaded = await tabReload.hydrate("rep-app");
  assert.equal(reloaded.foodEntries.length, 1);
  assert.equal(reloaded.foodEntries[0].id, "fresh-food");
  assert.equal(reloaded.history.length, 1);
  assert.equal(reloaded.history[0].date, "2026-08-25");
});

test("Defect 2: clear() is exclusive with queued/in-flight writes, invalidating prior writes and leaving durable data empty", async () => {
  const sharedStores = new Map();
  const sharedLSMap = new Map();
  const sharedIDB = createMockIndexedDB(sharedStores);
  const sharedLS = createMockLocalStorage(sharedLSMap);

  const tab = createTabStorageContext(sharedIDB, sharedLS);
  const state = await tab.hydrate("rep-app");

  // 1. Queue a pending write
  state.foodEntries = [{ id: "queued-food", name: "Queued Food", calories: 500 }];
  state.history = [{ date: "2026-08-25", session: "cardio" }];
  tab.persist("rep-app", state);
  const pendingFlush = tab.flush();

  // 2. Concurrently call clear()
  await tab.clear();

  // Wait for prior flush to settle
  await pendingFlush;

  // 3. Durable data must remain empty
  const records = sharedStores.get("records");
  assert.equal(records.size, 0, "Object store must be completely cleared");

  // Fresh reload must see empty large keys
  const tabReload = createTabStorageContext(sharedIDB, sharedLS);
  const reloaded = await tabReload.hydrate("rep-app");
  assert.deepEqual(reloaded.foodEntries || [], []);
  assert.deepEqual(reloaded.history || [], []);
});

test("Defect 3: Anonymous workout-set concurrent edits merge independent field changes into one set without duplicating", async () => {
  const sharedStores = new Map();
  const sharedLSMap = new Map();
  const sharedIDB = createMockIndexedDB(sharedStores);
  const sharedLS = createMockLocalStorage(sharedLSMap);

  // 1. Seed base anonymous set object: {weight:"50", reps:"5"}
  const tabInit = createTabStorageContext(sharedIDB, sharedLS);
  const stateInit = await tabInit.hydrate("rep-app");
  stateInit.logs = {
    "Bench Press": {
      sets: [{ weight: "50", reps: "5" }]
    }
  };
  tabInit.persist("rep-app", stateInit);
  await tabInit.flush();

  // 2. Tab 1 & Tab 2 hydrate base
  const tab1 = createTabStorageContext(sharedIDB, sharedLS);
  const tab2 = createTabStorageContext(sharedIDB, sharedLS);
  const state1 = await tab1.hydrate("rep-app");
  const state2 = await tab2.hydrate("rep-app");

  // 3. Tab 1 changes weight to 55
  state1.logs["Bench Press"].sets[0].weight = "55";
  tab1.persist("rep-app", state1);
  await tab1.flush();

  // 4. Tab 2 changes reps to 6
  state2.logs["Bench Press"].sets[0].reps = "6";
  tab2.persist("rep-app", state2);
  await tab2.flush();

  // 5. Durable state must contain one set with both independent field changes, not two duplicate sets
  const records = sharedStores.get("records");
  const durableLogs = records.get("state:logs");
  const sets = durableLogs["Bench Press"].sets;

  assert.equal(sets.length, 1, "Must contain exactly one set, not duplicate sets");
  assert.equal(sets[0].weight, "55", "Independent weight change from Tab 1 merged");
  assert.equal(sets[0].reps, "6", "Independent reps change from Tab 2 merged");

  // 6. Fresh reload sees the merged set
  const tab3 = createTabStorageContext(sharedIDB, sharedLS);
  const state3 = await tab3.hydrate("rep-app");
  assert.equal(state3.logs["Bench Press"].sets.length, 1);
  assert.equal(state3.logs["Bench Press"].sets[0].weight, "55");
  assert.equal(state3.logs["Bench Press"].sets[0].reps, "6");

  // 7. Verify multiple distinct anonymous sets maintain their individual identities
  state3.logs["Bench Press"].sets = [
    { weight: "55", reps: "6" },
    { weight: "55", reps: "6" }
  ];
  tab3.persist("rep-app", state3);
  await tab3.flush();

  const tab4 = createTabStorageContext(sharedIDB, sharedLS);
  const tab5 = createTabStorageContext(sharedIDB, sharedLS);
  const state4 = await tab4.hydrate("rep-app");
  const state5 = await tab5.hydrate("rep-app");

  // Tab 4 updates set 0 note
  state4.logs["Bench Press"].sets[0].note = "felt easy";
  tab4.persist("rep-app", state4);
  await tab4.flush();

  // Tab 5 updates set 1 reps
  state5.logs["Bench Press"].sets[1].reps = "8";
  tab5.persist("rep-app", state5);
  await tab5.flush();

  const setsAfter = records.get("state:logs")["Bench Press"].sets;
  assert.equal(setsAfter.length, 2, "Genuinely distinct anonymous sets are preserved as distinct");
  assert.equal(setsAfter[0].note, "felt easy");
  assert.equal(setsAfter[0].reps, "6");
  assert.equal(setsAfter[1].reps, "8");
});

test("Regression 1: Non-outbox versioned array retains generic merge semantics and does not receive outbox acknowledgement/deletion semantics", async () => {
  const sharedStores = new Map();
  const sharedLSMap = new Map();
  const sharedIDB = createMockIndexedDB(sharedStores);
  const sharedLS = createMockLocalStorage(sharedLSMap);

  // 1. Seed base state with versioned items in a non-outbox LARGE_KEYS collection (customExperiments)
  const tabInit = createTabStorageContext(sharedIDB, sharedLS);
  const stateInit = await tabInit.hydrate("rep-app");
  stateInit.customExperiments = [
    { id: "exp:1", revision: 1, version: 1, title: "Experiment 1", notes: "base notes", status: "active" }
  ];
  tabInit.persist("rep-app", stateInit);
  await tabInit.flush();

  const records = sharedStores.get("records");
  assert.equal(records.get("state:customExperiments").length, 1);

  // 2. Tab A and Tab B hydrate base state
  const tabA = createTabStorageContext(sharedIDB, sharedLS);
  const tabB = createTabStorageContext(sharedIDB, sharedLS);
  const stateA = await tabA.hydrate("rep-app");
  const stateB = await tabB.hydrate("rep-app");

  // 3. Tab B modifies the item (e.g. updates notes without bumping revision, so dRev <= bRev)
  stateB.customExperiments[0].notes = "Tab B updated notes";
  tabB.persist("rep-app", stateB);
  await tabB.flush();

  // 4. Tab A deletes the item (stateA.customExperiments = [], observing only base revision 1)
  stateA.customExperiments = [];
  tabA.persist("rep-app", stateA);
  await tabA.flush();

  // 5. In outbox semantics, Tab A's deletion would be treated as an acknowledgement of revision 1 (since dRev <= bRev),
  // causing durable store to delete the item and drop Tab B's edits.
  // In generic merge semantics, Tab B's modification in durable store must be preserved against Tab A's deletion!
  const durableExperiments = records.get("state:customExperiments");
  assert.equal(durableExperiments.length, 1, "Non-outbox array preserves modified durable item against concurrent deletion");
  assert.equal(durableExperiments[0].id, "exp:1");
  assert.equal(durableExperiments[0].notes, "Tab B updated notes");

  // A conflict must be recorded under generic merge semantics (item modified in durable but deleted in local)
  const tabAConflicts = tabA.getConflicts();
  assert.ok(tabAConflicts.length > 0, "Conflict was recorded under generic merge semantics");
  assert.equal(tabAConflicts[0].key, "customExperiments");

  // 6. Furthermore, verify generic property-level merge semantics on versioned items:
  // Tab C updates title and bumps revision to 2
  const tabC = createTabStorageContext(sharedIDB, sharedLS);
  const tabD = createTabStorageContext(sharedIDB, sharedLS);
  const stateC = await tabC.hydrate("rep-app");
  const stateD = await tabD.hydrate("rep-app");

  stateC.customExperiments[0].title = "Updated Title";
  stateC.customExperiments[0].revision = 2;
  tabC.persist("rep-app", stateC);
  await tabC.flush();

  // Tab D concurrently updates status (at revision 1)
  stateD.customExperiments[0].status = "paused";
  tabD.persist("rep-app", stateD);
  await tabD.flush();

  // In generic merge semantics, independent fields merge (title: "Updated Title", status: "paused")
  // rather than revision 2 clobbering revision 1 entirely
  const afterMerge = records.get("state:customExperiments");
  assert.equal(afterMerge.length, 1);
  assert.equal(afterMerge[0].title, "Updated Title", "Tab C title update merged");
  assert.equal(afterMerge[0].status, "paused", "Tab D status update merged without outbox clobber");
});

test("Regression 2: Concurrent legacy body-weight additions and updates remain keyed by their dates without positional set collapsing or rebinding", async () => {
  const sharedStores = new Map();
  const sharedLSMap = new Map();
  const sharedIDB = createMockIndexedDB(sharedStores);
  const sharedLS = createMockLocalStorage(sharedLSMap);

  // 1. Seed base state with legacy bodyWeights rows (date + weight, without week or set fields)
  const tabInit = createTabStorageContext(sharedIDB, sharedLS);
  const stateInit = await tabInit.hydrate("rep-app");
  stateInit.bodyWeights = [
    { date: "2026-08-01", weight: 80.0 },
    { date: "2026-07-25", weight: 80.5 }
  ];
  tabInit.persist("rep-app", stateInit);
  await tabInit.flush();

  const records = sharedStores.get("records");
  assert.equal(records.get("state:bodyWeights").length, 2);

  // 2. Concurrent additions at index 0 from Tab 1 and Tab 2
  const tab1 = createTabStorageContext(sharedIDB, sharedLS);
  const tab2 = createTabStorageContext(sharedIDB, sharedLS);
  const state1 = await tab1.hydrate("rep-app");
  const state2 = await tab2.hydrate("rep-app");

  // Tab 1 prepends a new weigh-in for 2026-08-08 at index 0
  state1.bodyWeights = [
    { date: "2026-08-08", weight: 79.8 },
    { date: "2026-08-01", weight: 80.0 },
    { date: "2026-07-25", weight: 80.5 }
  ];
  tab1.persist("rep-app", state1);

  // Tab 2 concurrently prepends a different weigh-in for 2026-08-15 at index 0
  state2.bodyWeights = [
    { date: "2026-08-15", weight: 79.2 },
    { date: "2026-08-01", weight: 80.0 },
    { date: "2026-07-25", weight: 80.5 }
  ];
  tab2.persist("rep-app", state2);

  // Flush Tab 1 then Tab 2
  await tab1.flush();
  await tab2.flush();

  // 3. Both additions must be preserved and keyed by date, NOT collapsed by positional set:0
  const durableWeights = records.get("state:bodyWeights");
  assert.equal(durableWeights.length, 4, "Must contain all 4 records without positional collapsing");
  const dates = durableWeights.map(w => w.date);
  assert.ok(dates.includes("2026-08-15"), "Tab 2 addition preserved");
  assert.ok(dates.includes("2026-08-08"), "Tab 1 addition preserved");
  assert.ok(dates.includes("2026-08-01"), "Base record 1 preserved");
  assert.ok(dates.includes("2026-07-25"), "Base record 2 preserved");

  const w15 = durableWeights.find(w => w.date === "2026-08-15");
  const w08 = durableWeights.find(w => w.date === "2026-08-08");
  assert.equal(w15.weight, 79.2);
  assert.equal(w08.weight, 79.8);

  // 4. Concurrent update to an existing date while another tab prepends an addition
  const tab3 = createTabStorageContext(sharedIDB, sharedLS);
  const tab4 = createTabStorageContext(sharedIDB, sharedLS);
  const state3 = await tab3.hydrate("rep-app");
  const state4 = await tab4.hydrate("rep-app");

  // Tab 3 updates weight for 2026-08-01 (which is at index 2 in state3)
  const target = state3.bodyWeights.find(w => w.date === "2026-08-01");
  target.weight = 80.2;
  tab3.persist("rep-app", state3);

  // Tab 4 prepends another entry for 2026-08-22 (shifting all indices)
  state4.bodyWeights = [
    { date: "2026-08-22", weight: 78.5 },
    ...state4.bodyWeights
  ];
  tab4.persist("rep-app", state4);

  await tab3.flush();
  await tab4.flush();

  // 5. The update must remain bound to date 2026-08-01 and not rebound by position
  const weightsAfter = records.get("state:bodyWeights");
  assert.equal(weightsAfter.length, 5, "Contains 5 records total");

  const updatedRec = weightsAfter.find(w => w.date === "2026-08-01");
  assert.equal(updatedRec.weight, 80.2, "Date 2026-08-01 received the updated weight");

  const newRec = weightsAfter.find(w => w.date === "2026-08-22");
  assert.equal(newRec.weight, 78.5, "New date 2026-08-22 addition preserved");

  // 6. Fresh reload sees all 5 records correctly
  const tabReload = createTabStorageContext(sharedIDB, sharedLS);
  const stateReload = await tabReload.hydrate("rep-app");
  assert.equal(stateReload.bodyWeights.length, 5);
  assert.equal(stateReload.bodyWeights.find(w => w.date === "2026-08-01").weight, 80.2);
  assert.equal(stateReload.bodyWeights.find(w => w.date === "2026-08-22").weight, 78.5);
});
