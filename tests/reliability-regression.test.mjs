import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

await import("../src/client/importer.js");
const importer = globalThis.REP_DATA_IMPORTER;

function createAppContext(initialState = {}) {
  const safeDomCode = readFileSync("src/client/safe-dom.js", "utf8");
  const healthDataCode = readFileSync("src/client/health-data.js", "utf8");
  const trainingSessionCode = readFileSync("src/client/training-session.js", "utf8");
  const appCode = readFileSync("src/client/app.js", "utf8");

  const createMockEl = () => {
    const el = {
      addEventListener: () => {},
      classList: { add: () => {}, remove: () => {}, toggle: () => {} },
      style: {},
      textContent: "",
      innerHTML: "",
      focus: () => {},
      click: () => {},
      scrollIntoView: () => {},
      dataset: {},
      remove: () => {},
      querySelector: () => el,
      querySelectorAll: () => []
    };
    el.lastChild = el;
    el.firstChild = el;
    return el;
  };

  const elements = new Map();
  const getOrCreateEl = (sel = "") => {
    if (!elements.has(sel)) {
      elements.set(sel, createMockEl());
    }
    return elements.get(sel);
  };

  const mockDoc = {
    querySelector: (sel) => getOrCreateEl(sel),
    querySelectorAll: () => [],
    getElementById: (id) => getOrCreateEl(`#${id}`),
    createElement: () => createMockEl(),
    body: { classList: { add: () => {}, remove: () => {} }, appendChild: () => {} },
    addEventListener: () => {}
  };

  const sandbox = {
    window: {
      DOMPurify: { sanitize: s => s },
      REP_HYDRATED_STATE: initialState
    },
    document: mockDoc,
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    addEventListener: () => {},
    removeEventListener: () => {},
    requestAnimationFrame: cb => setTimeout(cb, 0),
    MutationObserver: class { observe() {} },
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Date,
    Math,
    String,
    Number,
    Boolean,
    Array,
    Object,
    Set,
    Map,
    JSON,
    console,
    navigator: { onLine: true, userAgent: "test" },
    location: { search: "", pathname: "/" },
    history: { replaceState: () => {} },
    URLSearchParams,
    FormData: class MockFormData {
      constructor(form) {
        this.form = form;
      }
      get(key) {
        if (sandbox.__mockFormData && key in sandbox.__mockFormData) {
          return sandbox.__mockFormData[key];
        }
        if (key === "soreness") return "2";
        if (key === "energy") return "4";
        if (key === "sleep") return "8";
        if (key === "pain") return "off";
        if (key === "illness") return "off";
        return "";
      }
    },
    Blob: class {},
    URL: { createObjectURL: () => "", revokeObjectURL: () => {} }
  };
  sandbox.window = Object.assign(sandbox, sandbox.window);
  sandbox.globalThis = sandbox;

  const context = vm.createContext(sandbox);
  vm.runInContext(safeDomCode, context);
  vm.runInContext(healthDataCode, context);
  vm.runInContext(trainingSessionCode, context);
  vm.runInContext(appCode, context);

  return sandbox;
}

test("Apple Health XML: excludes in-bed and awake samples from sleep duration", () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<HealthData>
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" value="HKCategoryValueSleepAnalysisInBed" startDate="2026-08-01 22:00:00 +0200" endDate="2026-08-02 08:00:00 +0200"/>
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" value="HKCategoryValueSleepAnalysisAsleepCore" startDate="2026-08-01 23:00:00 +0200" endDate="2026-08-02 03:00:00 +0200"/>
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" value="HKCategoryValueSleepAnalysisAwake" startDate="2026-08-02 03:00:00 +0200" endDate="2026-08-02 03:30:00 +0200"/>
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" value="HKCategoryValueSleepAnalysisAsleepREM" startDate="2026-08-02 03:30:00 +0200" endDate="2026-08-02 07:00:00 +0200"/>
</HealthData>`;

  const result = importer.parseAppleHealthXml(xml);
  assert.equal(result.sleepLogs.length, 1);
  // Asleep core (23:00 to 03:00 = 4h) + Asleep REM (03:30 to 07:00 = 3.5h). InBed (10h) and Awake (0.5h) excluded.
  assert.equal(result.sleepLogs[0].hours, 7.5);
  assert.equal(result.sleepLogs[0].date, "2026-08-02");
  assert.equal(result.sleepLogs[0].bedtime, "2026-08-01 23:00:00 +0200");
  assert.equal(result.sleepLogs[0].wake, "2026-08-02 07:00:00 +0200");
});

test("Apple Health XML: unions overlapping and duplicate asleep intervals without double-counting", () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<HealthData>
  <!-- Main core sleep: 23:00 to 03:00 (4 hours) -->
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" value="HKCategoryValueSleepAnalysisAsleepCore" startDate="2026-08-01 23:00:00 +0200" endDate="2026-08-02 03:00:00 +0200"/>
  <!-- Overlapping deep sleep: 01:00 to 04:00 (overlaps by 2 hours, extends interval to 04:00, union = 5 hours) -->
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" value="HKCategoryValueSleepAnalysisAsleepDeep" startDate="2026-08-02 01:00:00 +0200" endDate="2026-08-02 04:00:00 +0200"/>
  <!-- Duplicate sample from phone/watch: 01:00 to 04:00 -->
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" value="HKCategoryValueSleepAnalysisAsleepDeep" startDate="2026-08-02 01:00:00 +0200" endDate="2026-08-02 04:00:00 +0200"/>
  <!-- Consecutive sleep: 04:30 to 07:00 (2.5 hours) -->
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" value="HKCategoryValueSleepAnalysisAsleepREM" startDate="2026-08-02 04:30:00 +0200" endDate="2026-08-02 07:00:00 +0200"/>
</HealthData>`;

  const result = importer.parseAppleHealthXml(xml);
  assert.equal(result.sleepLogs.length, 1);
  // [23:00..04:00] (5h) + [04:30..07:00] (2.5h) = 7.5 hours total (not 4 + 3 + 3 + 2.5 = 12.5h)
  assert.equal(result.sleepLogs[0].hours, 7.5);
  assert.equal(result.sleepLogs[0].date, "2026-08-02");
});

test("Apple Health XML: attributes sleep record to local wake date across midnight", () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<HealthData>
  <!-- Bedtime 22:30 on Aug 1, wake 06:30 on Aug 2 -->
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" value="HKCategoryValueSleepAnalysisAsleep" startDate="2026-08-01 22:30:00 +0200" endDate="2026-08-02 06:30:00 +0200"/>
</HealthData>`;

  const result = importer.parseAppleHealthXml(xml);
  assert.equal(result.sleepLogs.length, 1);
  // Must be attributed to the wake date 2026-08-02, NOT bedtime date 2026-08-01
  assert.equal(result.sleepLogs[0].date, "2026-08-02");
  assert.equal(result.sleepLogs[0].hours, 8.0);
  assert.equal(result.sleepLogs[0].bedtime, "2026-08-01 22:30:00 +0200");
  assert.equal(result.sleepLogs[0].wake, "2026-08-02 06:30:00 +0200");
});

test("Apple Health XML: emits at most one merged sleep record per wake date and preserves vitals", () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<HealthData>
  <!-- Night sleep ending on Aug 2 at 07:00 (7.5h) -->
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" value="HKCategoryValueSleepAnalysisAsleep" startDate="2026-08-01 23:30:00 +0200" endDate="2026-08-02 07:00:00 +0200"/>
  <!-- Afternoon nap on Aug 2 from 13:00 to 14:30 (1.5h) -->
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" value="HKCategoryValueSleepAnalysisAsleep" startDate="2026-08-02 13:00:00 +0200" endDate="2026-08-02 14:30:00 +0200"/>
  <!-- Vitals on Aug 2 -->
  <Record type="HKQuantityTypeIdentifierHeartRateVariabilitySDNN" value="72.4" unit="ms" startDate="2026-08-02 07:05:00 +0200"/>
  <Record type="HKQuantityTypeIdentifierRestingHeartRate" value="54.0" unit="count/min" startDate="2026-08-02 07:05:00 +0200"/>
</HealthData>`;

  const result = importer.parseAppleHealthXml(xml);
  // Exactly one merged sleep record for 2026-08-02
  assert.equal(result.sleepLogs.length, 1);
  assert.equal(result.sleepLogs[0].date, "2026-08-02");
  assert.equal(result.sleepLogs[0].hours, 9.0); // 7.5 + 1.5
  assert.equal(result.sleepLogs[0].bedtime, "2026-08-01 23:30:00 +0200");
  assert.equal(result.sleepLogs[0].wake, "2026-08-02 14:30:00 +0200");
  // Vitals preserved
  assert.equal(result.healthMetrics["2026-08-02"].hrvSdnn, 72);
  assert.equal(result.healthMetrics["2026-08-02"].restingHeartRate, 54);
});

test("Food ordering: todayFoodEntries scans full collection without stopping when older records appear earlier", () => {
  const app = createAppContext();
  const today = app.isoDay();

  // Storage where older entries appear before today's entries
  app.window.state.foodEntries = [
    { id: "old-1", date: "2026-08-01T09:00:00Z", calories: 300, protein_g: 20, carbs_g: 30, fat_g: 10, fiber_g: 3, sugar_g: 5, sodium_mg: 200 },
    { id: "today-1", date: `${today}T10:00:00Z`, calories: 450, protein_g: 35, carbs_g: 40, fat_g: 12, fiber_g: 5, sugar_g: 4, sodium_mg: 300 },
    { id: "old-2", date: "2026-07-15T12:00:00Z", calories: 500, protein_g: 30, carbs_g: 50, fat_g: 15, fiber_g: 4, sugar_g: 6, sodium_mg: 400 },
    { id: "today-2", date: `${today}T14:30:00Z`, calories: 600, protein_g: 45, carbs_g: 60, fat_g: 16, fiber_g: 6, sugar_g: 8, sodium_mg: 500 },
    { id: "old-3", date: "2026-06-01T18:00:00Z", calories: 700, protein_g: 40, carbs_g: 70, fat_g: 20, fiber_g: 7, sugar_g: 10, sodium_mg: 600 }
  ];

  const entries = app.todayFoodEntries();
  assert.equal(entries.length, 2);
  assert.equal(entries[0].id, "today-2"); // Sorted descending
  assert.equal(entries[1].id, "today-1");

  const totals = app.foodTotals(entries);
  assert.equal(totals.calories, 1050);
  assert.equal(totals.protein_g, 80);
  assert.equal(totals.carbs_g, 100);
  assert.equal(totals.fat_g, 28);
});

test("Retention consistency: manual recovery check-ins cap at 400 records (not 24)", () => {
  const app = createAppContext();
  app.window.state.recoveryCheckins = [];

  for (let i = 0; i < 450; i++) {
    const day = `2025-01-01T${String(i % 24).padStart(2, "0")}:00:00Z`;
    app.window.state.recoveryCheckins.push({ date: day, dateKey: `2025-01-${String((i % 28) + 1).padStart(2, "0")}`, soreness: 2, energy: 4, sleep: 8, pain: false });
  }
  assert.equal(app.window.state.recoveryCheckins.length, 450);

  app.saveRecoveryCheckin();
  assert.equal(app.window.state.recoveryCheckins.length, 400);
});

test("Retention consistency: manual and imported sleep logs cap at 400 records (not 120)", () => {
  const app = createAppContext();
  app.window.state.sleepLogs = [];

  for (let i = 0; i < 450; i++) {
    app.window.state.sleepLogs.push({ date: `2025-01-${String((i % 28) + 1).padStart(2, "0")}`, hours: 8, bedtime: "23:00", wake: "07:00" });
  }
  assert.equal(app.window.state.sleepLogs.length, 450);

  // saveSleepLog ceiling
  app.saveSleepLog("23:00", "07:00", 65, 52, 14);
  assert.equal(app.window.state.sleepLogs.length, 400);

  // applyVitalsEntry ceiling
  app.applyVitalsEntry({ date: "2026-09-18", sleep_hours: 8, hrv_ms: 60, resting_hr_bpm: 50, respiratory_rate_bpm: 14 });
  assert.equal(app.window.state.sleepLogs.length, 400);
});

test("Retention consistency: activity histories cap at 400 records (not 60)", () => {
  const app = createAppContext();
  app.window.state.history = [];

  for (let i = 0; i < 450; i++) {
    app.window.state.history.push({ id: `act-${i}`, date: "2026-01-01T10:00:00Z", session: "activity", duration: 1800, calories: 200, entries: [] });
  }
  assert.equal(app.window.state.history.length, 450);

  app.logActivity("padel", "Padel Match", 45, 300, "Good game");
  assert.equal(app.window.state.history.length, 400);
});

test("Retention consistency: weekly body weight retention is preserved at 104 ceiling", () => {
  const app = createAppContext();
  app.window.state.bodyWeights = [];

  for (let i = 0; i < 120; i++) {
    app.window.state.bodyWeights.push({ week: `2024-W${i}`, date: "2024-01-01", kg: 80 });
  }
  assert.equal(app.window.state.bodyWeights.length, 120);

  app.saveBodyWeight(82.5);
  assert.equal(app.window.state.bodyWeights.length, 104);
});

test("Local-day compatibility: recordDateKey prefers explicit dateKey and createdAt over raw date slice", () => {
  const app = createAppContext();

  // Explicit dateKey preferred
  const rec1 = { dateKey: "2026-09-20", createdAt: "2026-09-19T22:00:00.000Z", date: "2026-09-19T22:00:00.000Z" };
  assert.equal(app.recordDateKey(rec1), "2026-09-20");

  // Legacy YYYY-MM-DD date record
  const rec2 = { date: "2026-08-15" };
  assert.equal(app.recordDateKey(rec2), "2026-08-15");

  // Post-midnight Cairo entry:
  // In Cairo (+03:00), 2026-09-19T22:30:00Z is 2026-09-20 01:30 AM local time.
  // Slicing the raw UTC date string produces "2026-09-19" (wrong day).
  // An explicit dateKey guarantees it is attributed to "2026-09-20".
  const cairoEntry = {
    dateKey: "2026-09-20",
    createdAt: "2026-09-19T22:30:00.000Z",
    date: "2026-09-19T22:30:00.000Z",
    kg: 81.2
  };
  assert.equal(app.recordDateKey(cairoEntry), "2026-09-20");

  app.window.state.bodyWeights = [cairoEntry];
  // If today is 2026-09-20, todayWeighIn must find it via recordDateKey
  const prevIsoDay = app.isoDay;
  app.isoDay = () => "2026-09-20";
  try {
    const found = app.todayWeighIn();
    assert.ok(found);
    assert.equal(found.kg, 81.2);
  } finally {
    app.isoDay = prevIsoDay;
  }
});

test("Apple Health XML: unknown or future sleep categories contribute zero sleep", () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<HealthData>
  <!-- Unknown future named category: must contribute zero sleep -->
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" value="HKCategoryValueSleepAnalysisFutureStage" startDate="2026-08-01 22:00:00 +0200" endDate="2026-08-02 02:00:00 +0200"/>
  <!-- Numeric unknown value (e.g. 6): must contribute zero sleep -->
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" value="6" startDate="2026-08-02 02:00:00 +0200" endDate="2026-08-02 04:00:00 +0200"/>
  <!-- In-bed and awake: must contribute zero sleep -->
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" value="HKCategoryValueSleepAnalysisInBed" startDate="2026-08-01 21:00:00 +0200" endDate="2026-08-02 09:00:00 +0200"/>
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" value="HKCategoryValueSleepAnalysisAwake" startDate="2026-08-02 04:00:00 +0200" endDate="2026-08-02 04:30:00 +0200"/>
  <!-- Unrecognized string: must contribute zero sleep -->
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" value="somethingsleepy" startDate="2026-08-02 04:30:00 +0200" endDate="2026-08-02 07:00:00 +0200"/>
</HealthData>`;

  const result = importer.parseAppleHealthXml(xml);
  assert.equal(result.sleepLogs.length, 0);

  // Mixed: valid asleep categories alongside unknown categories
  const mixedXml = `<?xml version="1.0" encoding="UTF-8"?>
<HealthData>
  <!-- Unknown future category: 4 hours (must be rejected) -->
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" value="HKCategoryValueSleepAnalysisFutureStage" startDate="2026-08-01 20:00:00 +0200" endDate="2026-08-02 00:00:00 +0200"/>
  <!-- Valid Core asleep: 4 hours (00:00 to 04:00) -->
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" value="HKCategoryValueSleepAnalysisAsleepCore" startDate="2026-08-02 00:00:00 +0200" endDate="2026-08-02 04:00:00 +0200"/>
  <!-- Valid numeric asleep (e.g. 4 = Deep): 3 hours (04:00 to 07:00) -->
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" value="4" startDate="2026-08-02 04:00:00 +0200" endDate="2026-08-02 07:00:00 +0200"/>
  <!-- In-bed: 10 hours (must be rejected) -->
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" value="HKCategoryValueSleepAnalysisInBed" startDate="2026-08-01 21:00:00 +0200" endDate="2026-08-02 08:00:00 +0200"/>
</HealthData>`;

  const mixedResult = importer.parseAppleHealthXml(mixedXml);
  assert.equal(mixedResult.sleepLogs.length, 1);
  // Only 4h (Core) + 3h (Deep) = 7 hours
  assert.equal(mixedResult.sleepLogs[0].hours, 7);
  assert.equal(mixedResult.sleepLogs[0].date, "2026-08-02");
});

test("Legacy recovery UI: illness triggers hold gate, counts in recoveryFlags, and provides recovery-oriented recommendation", () => {
  const app = createAppContext();

  // 1. recoveryFlags includes illness
  const normalCheckin = { soreness: 2, energy: 4, sleep: 8, pain: false, illness: false };
  assert.equal(app.recoveryFlags(normalCheckin), 0);

  const illnessOnlyCheckin = { soreness: 2, energy: 4, sleep: 8, pain: false, illness: true };
  assert.equal(app.recoveryFlags(illnessOnlyCheckin), 1);

  const multiFlagCheckin = { soreness: 4, energy: 2, sleep: 6, pain: false, illness: true };
  assert.equal(app.recoveryFlags(multiFlagCheckin), 4);

  // 2. recoveryGate: illness forces hold even if flags < 2 (only illness is true)
  app.window.state.recoveryCheckins = [
    { date: app.isoDay(), dateKey: app.isoDay(), createdAt: new Date().toISOString(), ...illnessOnlyCheckin }
  ];
  const gate = app.recoveryGate();
  assert.equal(gate.flags, 1);
  assert.equal(gate.hold, true, "Illness must trigger hold gate");

  // 3. Decision card and status strip: never 'Proceed as planned' or 'Progress available'
  const decisionHtml = app.recoveryDecisionCard();
  assert.match(decisionHtml, /Extra light day · hold progression/);
  assert.doesNotMatch(decisionHtml, /Proceed as planned/);

  const statusHtml = app.healthStatusStrip();
  assert.match(statusHtml, /hold load/);
  assert.doesNotMatch(statusHtml, /Progress available/);

  // 4. Immediate recommendation text in updateCheckin: never 'progress as planned'
  app.__mockFormData = { soreness: "2", energy: "4", sleep: "8", pain: "off", illness: "on", notes: "" };
  app.updateCheckin();
  const checkResultEl = app.document.querySelector("#checkResult");
  assert.match(checkResultEl.textContent, /Illness reported — hold progression and prioritize recovery/);
  assert.doesNotMatch(checkResultEl.textContent, /progress as planned/i);

  // Multi-flag with illness
  app.__mockFormData = { soreness: "4", energy: "2", sleep: "6", pain: "off", illness: "on", notes: "" };
  app.updateCheckin();
  assert.match(checkResultEl.textContent, /illness reported/);
  assert.match(checkResultEl.textContent, /take an extra light day or hold progression/);

  // 5. saveRecoveryCheckin: recommendation must be 'Hold' or 'Extra light day', never 'Progress'
  app.__mockFormData = { soreness: "2", energy: "4", sleep: "8", pain: "off", illness: "on", notes: "" };
  app.saveRecoveryCheckin();
  const saved = app.window.state.recoveryCheckins[0];
  assert.equal(saved.illness, true);
  assert.equal(saved.recommendation, "Hold");
  assert.notEqual(saved.recommendation, "Progress");
});

test("Recovery check-in persistence: keeps legacy date as local YYYY-MM-DD while storing dateKey and createdAt", () => {
  const app = createAppContext();
  const today = app.isoDay();

  app.__mockFormData = { soreness: "2", energy: "4", sleep: "8", pain: "off", illness: "off", notes: "Feeling good" };
  app.saveRecoveryCheckin();

  const record = app.window.state.recoveryCheckins[0];
  assert.ok(record, "Check-in was saved");
  assert.equal(record.date, today, "legacy date field must be local YYYY-MM-DD, not UTC timestamp");
  assert.equal(record.dateKey, today, "dateKey must be authoritative local YYYY-MM-DD");
  assert.match(record.createdAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, "createdAt must be UTC ISO string");

  // Older consumer compatibility: filtering or finding by date slice or exact date works
  const legacyMatchExact = app.window.state.recoveryCheckins.find(r => r.date === today);
  assert.ok(legacyMatchExact);

  const legacyMatchSlice = app.window.state.recoveryCheckins.find(r => String(r.date).slice(0, 10) === today);
  assert.ok(legacyMatchSlice);

  assert.equal(app.recordDateKey(record), today);
});

