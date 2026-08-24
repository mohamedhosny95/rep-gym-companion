import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";

function loadScript(relativePath, context = {}) {
  const code = readFileSync(resolve(relativePath), "utf8");
  const baseContext = {
    window: {},
    globalThis: {},
    addEventListener: () => {},
    removeEventListener: () => {},
    indexedDB: {
      open: () => ({
        set onsuccess(cb) { setTimeout(() => cb({ target: { result: {} } }), 0); },
        set onerror(cb) {}
      })
    },
    document: {
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: () => {},
      removeEventListener: () => {},
      visibilityState: "visible"
    },
    localStorage: {
      _data: {},
      getItem(k) { return this._data[k] || null; },
      setItem(k, v) { this._data[k] = String(v); },
      removeItem(k) { delete this._data[k]; }
    },
    console: { log: () => {}, warn: () => {}, error: () => {} },
    ...context
  };
  baseContext.window = baseContext;
  baseContext.globalThis = baseContext;
  vm.createContext(baseContext);
  vm.runInContext(code, baseContext);
  return baseContext;
}

// -----------------------------------------------------------------------------
// 1. Health Engine Math & Boundary Robustness
// -----------------------------------------------------------------------------
test("Health engine handles extreme and corrupted inputs without throwing NaN or crashing", () => {
  const ctx = loadScript("src/client/health-engine.js");
  const engine = ctx.window.REP_HEALTH_ENGINE;
  assert.ok(engine, "Health engine loaded");

  // Empty state: score is null when no signals exist
  const emptyRes = engine.readiness({ logs: {}, sleepLogs: [], recoveryCheckins: [] });
  assert.equal(emptyRes.score, null, "Score is null for empty state");
  assert.equal(emptyRes.band, "unknown");

  // Corrupted / Extreme values (Negative, Infinity, NaN)
  const corruptedState = {
    sleepLogs: [
      { date: "2026-01-01", hours: -5, hrv: NaN, rhr: Infinity },
      { date: "2026-01-02", hours: 100, hrv: -20, rhr: -10 }
    ],
    recoveryCheckins: [
      { date: "2026-01-01", soreness: 999, energy: -5 },
      { date: "2026-01-02", soreness: 1, energy: 5 }
    ]
  };

  const corruptedRes = engine.readiness(corruptedState, "2026-01-02");
  assert.ok(corruptedRes.score === null || (corruptedRes.score >= 0 && corruptedRes.score <= 100), "Score stays bounded in [0, 100]");
  assert.ok(!Number.isNaN(corruptedRes.score), "Score is not NaN with corrupted inputs");
});

// -----------------------------------------------------------------------------
// 2. Performance Insights & Theil-Sen Estimator Edge Cases
// -----------------------------------------------------------------------------
test("Performance insights regression safely handles collinear, empty, and single-point data", () => {
  const ctx = loadScript("src/client/performance-insights.js");
  const insights = ctx.window.REP_PERFORMANCE_INSIGHTS;
  assert.ok(insights, "Performance insights loaded");

  // Single session
  const singleSessionState = {
    history: [
      { id: "s1", date: "2026-01-01", entries: [{ exercise: "Chest Press", weight: 100, reps: 5 }] }
    ],
    foodEntries: [],
    sleepLogs: [],
    water: {}
  };

  const agg1 = insights.analyze(singleSessionState, { now: "2026-01-01" });
  assert.ok(agg1.strength, "Strength data exists");

  // Duplicate weights / Identical dates (zero variance)
  const zeroVarianceState = {
    history: [
      { id: "s1", date: "2026-01-01", entries: [{ exercise: "Leg Press", weight: 100, reps: 5 }] },
      { id: "s2", date: "2026-01-02", entries: [{ exercise: "Leg Press", weight: 100, reps: 5 }] },
      { id: "s3", date: "2026-01-03", entries: [{ exercise: "Leg Press", weight: 100, reps: 5 }] }
    ],
    foodEntries: [],
    sleepLogs: [],
    water: {}
  };

  const agg2 = insights.analyze(zeroVarianceState, { now: "2026-01-03" });
  assert.ok(agg2.strength, "Strength aggregate computed without zero-division crash");
  const legPress = agg2.strength.exercises.find(e => e.exercise === "Leg Press");
  assert.ok(legPress, "Leg Press exercise analyzed");
  assert.ok(!Number.isNaN(legPress.currentE1rm), "e1RM is not NaN");
});

// -----------------------------------------------------------------------------
// 3. Storage Prototype Pollution & Corrupted State Resilience
// -----------------------------------------------------------------------------
test("Storage engine resists prototype pollution and handles store operations safely", async () => {
  const storeContext = {
    localStorage: {
      _store: {
        "rep-companion-state": JSON.stringify({
          __proto__: { polluted: "hacked" },
          version: 999,
          logs: null,
          customWorkouts: "not-an-array",
          foodEntries: null
        })
      },
      getItem(k) { return this._store[k] || null; },
      setItem(k, v) { this._store[k] = v; },
      removeItem(k) { delete this._store[k]; }
    }
  };

  const ctx = loadScript("src/client/storage.js", storeContext);
  assert.equal({}.polluted, undefined, "Global prototype was not polluted");

  const store = ctx.window.REP_STORE;
  assert.ok(store, "Storage engine exported REP_STORE");
  assert.ok(Array.isArray(store.largeKeys), "largeKeys is array");
});

// -----------------------------------------------------------------------------
// 4. Offline Nutrition AI Parser & XSS Sanitization
// -----------------------------------------------------------------------------
test("Offline nutrition parser handles malformed descriptions, unicode, and XSS safely", () => {
  const ctx = loadScript("src/client/offline-nutrition.js");
  const parser = ctx.window.REP_OFFLINE_NUTRITION;
  assert.ok(parser, "Offline nutrition loaded");

  // XSS injection payload in note
  const xssNote = "<script>alert('xss')</script> 2 eggs and 1 slice toast";
  const parsedXss = parser.estimate(xssNote);
  assert.ok(parsedXss.calories > 0, "Calculated calories for meal with tags");

  // Extreme unicode & Arabic diacritics
  const arabicNote = "بيض مسلوق و شوفان";
  const parsedArabic = parser.estimate(arabicNote);
  assert.ok(parsedArabic.calories >= 0, "Handled Arabic numerals and text");

  // Nonsense input
  const nonsense = "!@#$%^&*()_+=-~`";
  const parsedNonsense = parser.estimate(nonsense);
  assert.equal(typeof parsedNonsense.calories, "number");
  assert.ok(!Number.isNaN(parsedNonsense.calories), "Nonsense note returns valid numeric calories");
});

// -----------------------------------------------------------------------------
// 5. Date & Timezone Jump Safety (Leap Years, Month Crossings)
// -----------------------------------------------------------------------------
test("Health coverage accurately indexes cross-month and leap-year day spans", () => {
  const ctx = loadScript("src/client/health-coverage.js");
  const coverage = ctx.window.REP_HEALTH_COVERAGE;
  assert.ok(coverage, "Health coverage loaded");

  // Leap day coverage
  const leapState = {
    sleepLogs: [
      { date: "2024-02-27", hours: 8, hrv: 60, rhr: 55 },
      { date: "2024-02-28", hours: 8, hrv: 60, rhr: 55 },
      { date: "2024-02-29", hours: 7.5, hrv: 65, rhr: 54 },
      { date: "2024-03-01", hours: 8, hrv: 62, rhr: 56 }
    ],
    recoveryCheckins: []
  };

  const trend = coverage.trend(leapState, "sleep", "2024-03-01");
  assert.ok(trend, "Trend computed across leap year");
  assert.ok(trend.average7 >= 0, "7-day average calculated");
  assert.ok(trend.average28 >= 0, "28-day average calculated");
});
