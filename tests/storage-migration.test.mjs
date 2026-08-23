import test from "node:test";
import assert from "node:assert/strict";

function createMockIndexedDB() {
  const stores = new Map();
  return {
    _stores: stores,
    open(name, version) {
      const request = { result: null, error: null, onsuccess: null, onerror: null, onupgradeneeded: null };
      setTimeout(() => {
        if (!stores.has("records")) stores.set("records", new Map());
        const db = {
          createObjectStore(storeName) {
            if (!stores.has(storeName)) stores.set(storeName, new Map());
            return {};
          },
          transaction(storeNames, mode = "readonly") {
            const storeMap = stores.get("records");
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

function createMockLocalStorage() {
  const store = new Map();
  return {
    getItem(key) { return store.get(key) || null; },
    setItem(key, value) { store.set(key, String(value)); },
    removeItem(key) { store.delete(key); },
    clear() { store.clear(); }
  };
}

test("storage.js single-step migration backfills missing LARGE_KEYS from legacy state", async () => {
  const mockIDB = createMockIndexedDB();
  const mockStorage = createMockLocalStorage();
  globalThis.window = globalThis;
  globalThis.indexedDB = mockIDB;
  globalThis.localStorage = mockStorage;
  globalThis.document = { addEventListener: () => {} };
  globalThis.addEventListener = () => {};

  // 1. Seed legacy monolithic state in records store
  const records = new Map();
  records.set("state", {
    history: [{ date: "2026-08-01", session: "gym", exercises: [] }],
    foodEntries: [{ id: "food-1", name: "Oatmeal", calories: 350 }],
    sleepLogs: [{ date: "2026-08-01", hours: 7.5 }],
    daily: { habits: { "2026-08-01": { habit1: true } } }
  });
  mockIDB._stores.set("records", records);

  // 2. Load storage.js
  await import("../src/client/storage.js");
  const store = globalThis.REP_STORE;

  // 3. Hydrate state
  const hydrated = await store.hydrate("rep-gym-companion-v1");

  // 4. Verify backfill of LARGE_KEYS
  assert.equal(hydrated.history.length, 1);
  assert.equal(hydrated.history[0].session, "gym");
  assert.equal(hydrated.foodEntries.length, 1);
  assert.equal(hydrated.foodEntries[0].name, "Oatmeal");
  assert.equal(hydrated.sleepLogs[0].hours, 7.5);

  // 5. When a mutation is made, persist updates the individual partitioned record
  hydrated.history.push({ date: "2026-08-02", session: "cardio", exercises: [] });
  store.persist("rep-gym-companion-v1", hydrated);
  await store.flush();

  assert.equal(records.get("state:history").length, 2);
  assert.equal(records.get("state:history")[1].session, "cardio");
});
