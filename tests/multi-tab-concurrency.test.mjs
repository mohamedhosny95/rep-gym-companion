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
