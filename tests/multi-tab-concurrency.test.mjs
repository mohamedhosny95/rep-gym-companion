import test from "node:test";
import assert from "node:assert/strict";

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
  const DB_NAME="health-os-state-v1",STORE="records",LARGE_KEYS=["history","foodEntries","sleepLogs","recoveryCheckins","bodyWeights","bodyMeasurements","syncQueue","outbox","daily","logs","completed","healthMetrics"];
  const serialized = new Map();
  let pendingTimer = null, pendingWrite = null;

  function open() {
    return new Promise((resolve, reject) => {
      const request = sharedIDB.open(DB_NAME, 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function readDurable() {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE), store = tx.objectStore(STORE), result = {};
      let remaining = LARGE_KEYS.length + 1, legacy = null;
      const done = () => {
        if (--remaining) return;
        if (legacy && typeof legacy === "object") {
          for (const key of LARGE_KEYS) {
            if (result[key] === undefined && legacy[key] !== undefined) result[key] = legacy[key];
          }
        }
        db.close();
        resolve(result);
      };
      for (const key of LARGE_KEYS) {
        const req = store.get(`state:${key}`);
        req.onsuccess = () => { if (req.result !== undefined) result[key] = req.result; done(); };
        req.onerror = () => reject(req.error);
      }
      const old = store.get("state");
      old.onsuccess = () => { legacy = old.result; done(); };
      old.onerror = () => reject(old.error);
    });
  }

  async function writeDurable(values) {
    const changed = [];
    for (const [key, value] of Object.entries(values || {})) {
      const next = JSON.stringify(value);
      if (serialized.get(key) !== next) changed.push([key, value, next]);
    }
    if (!changed.length) return;
    const db = await open();
    try {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite"), store = tx.objectStore(STORE);
        for (const [key, value] of changed) store.put(value, `state:${key}`);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    } finally { db.close(); }
    for (const [key,, next] of changed) serialized.set(key, next);
  }

  function split(payload) {
    const local = { ...payload }, durable = {};
    for (const key of LARGE_KEYS) {
      if (key in local) { durable[key] = local[key]; delete local[key]; }
    }
    return { local, durable };
  }

  async function hydrate(storageKey) {
    let parsed = {};
    try { parsed = JSON.parse(sharedLS.getItem(storageKey) || "{}"); } catch {}
    const legacy = split(parsed), indexed = await readDurable().catch(() => ({})), durable = { ...legacy.durable, ...indexed };
    for (const [key, value] of Object.entries(durable)) serialized.set(key, JSON.stringify(value));
    sharedLS.setItem(storageKey, JSON.stringify(legacy.local));
    return { ...legacy.local, ...durable };
  }

  function persist(storageKey, payload) {
    const { local, durable } = split(payload);
    sharedLS.setItem(storageKey, JSON.stringify(local));
    pendingWrite = { ...(pendingWrite || {}), ...durable };
    clearTimeout(pendingTimer);
    pendingTimer = setTimeout(async () => {
      const next = pendingWrite;
      pendingWrite = null;
      if (next) await writeDurable(next).catch(() => {});
    }, 0);
  }

  async function flush() {
    clearTimeout(pendingTimer);
    const next = pendingWrite;
    pendingWrite = null;
    if (next) await writeDurable(next).catch(() => {});
  }

  return { hydrate, persist, flush, readDurable, serialized };
}

test("Multi-tab concurrency: Independent tabs modifying disjoint LARGE_KEYS do not clobber each other in IndexedDB", async () => {
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

test("Multi-tab concurrency: Concurrent writes to the same key follow last-write-wins without corruption", async () => {
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
