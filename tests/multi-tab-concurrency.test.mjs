import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const storageCode = readFileSync(join(root, "src/client/storage.js"), "utf8");

function createMockIndexedDB(sharedStores = new Map()) {
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
            const tx = { oncomplete: null, onerror: null };
            return {
              objectStore(storeName) {
                return {
                  get(key) {
                    const req = { result: undefined, error: null, onsuccess: null, onerror: null };
                    setTimeout(() => {
                      req.result = storeMap.get(key);
                      if (req.onsuccess) req.onsuccess();
                    }, 0);
                    return req;
                  },
                  put(value, key) {
                    storeMap.set(key, JSON.parse(JSON.stringify(value)));
                  },
                  clear() {
                    storeMap.clear();
                  }
                };
              },
              get oncomplete() { return tx._oncomplete; },
              set oncomplete(fn) {
                tx._oncomplete = fn;
                setTimeout(() => { if (fn) fn(); }, 0);
              }
            };
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
  const sandbox = {
    indexedDB: sharedIDB,
    localStorage: sharedLS,
    document: { addEventListener: () => {}, visibilityState: "visible" },
    addEventListener: () => {},
    clearTimeout,
    setTimeout,
    JSON,
    Map,
    Promise,
    Error,
    Object,
    Array,
    Date,
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

test("Multi-tab concurrency: Concurrent writes to the same key follow last-write-wins without corruption (using real storage.js)", async () => {
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
  assert.equal(records.get("state:foodEntries")[0].name, "Orange");
});
