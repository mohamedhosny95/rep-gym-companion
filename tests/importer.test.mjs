import test from "node:test";
import assert from "node:assert/strict";
await import("../src/client/importer.js");
const importer = globalThis.REP_DATA_IMPORTER;

test("parseStrongCsv correctly extracts workouts, sets, and converted kg weights", () => {
  const csv = `Date,Workout Name,Exercise Name,Set Order,Weight,Weight Unit,Reps,RPE
2026-08-01 10:00:00,Upper Body,Chest Press,1,100,lbs,10,8
2026-08-01 10:00:00,Upper Body,Chest Press,2,100,lbs,10,8.5
2026-08-03 10:00:00,Upper Body,Lat Pulldown,1,60,kg,12,7`;

  const result = importer.parseStrongCsv(csv);
  assert.equal(result.workouts.length, 2);
  assert.equal(result.totalSets, 3);
  const w1 = result.workouts[0];
  assert.equal(w1.entries[0].exercise, "Chest Press");
  assert.equal(w1.entries[0].weight, 45.4); // 100 lbs converted to kg
  assert.equal(w1.entries[0].reps, 10);
  assert.equal(w1.entries[0].rpe, 8);
});

test("parseHevyCsv correctly parses workouts and sets", () => {
  const csv = `title,start_time,end_time,exercise_title,set_index,set_type,weight_kg,reps,rpe
Gym Day,2026-08-02 14:00:00,2026-08-02 15:00:00,Leg Press,1,normal,140,10,7.5
Gym Day,2026-08-02 14:00:00,2026-08-02 15:00:00,Leg Press,2,normal,140,10,8`;

  const result = importer.parseHevyCsv(csv);
  assert.equal(result.workouts.length, 1);
  assert.equal(result.totalSets, 2);
  assert.equal(result.workouts[0].entries[0].exercise, "Leg Press");
  assert.equal(result.workouts[0].entries[0].weight, 140);
  assert.equal(result.workouts[0].entries[0].rpe, 7.5);
});

test("parseMfpCsv extracts food entries with macros", () => {
  const csv = `Date,Meal,Food Name,Calories,Protein (g),Carbohydrates (g),Fat (g),Fiber (g)
2026-08-01,Breakfast,Oatmeal with Whey,450,35,55,10,6
2026-08-01,Lunch,Chicken and Rice,600,45,70,12,4`;

  const result = importer.parseMfpCsv(csv);
  assert.equal(result.foodEntries.length, 2);
  assert.equal(result.foodEntries[0].calories, 450);
  assert.equal(result.foodEntries[0].protein_g, 35);
  assert.equal(result.foodEntries[0].carbs_g, 55);
});

test("parseAppleHealthXml extracts body weights, sleep, and heart metrics", () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<HealthData>
  <Record type="HKQuantityTypeIdentifierBodyMass" value="82.4" unit="kg" startDate="2026-08-01 07:00:00 +0200"/>
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" startDate="2026-08-01 22:00:00 +0200" endDate="2026-08-02 06:00:00 +0200"/>
  <Record type="HKQuantityTypeIdentifierHeartRateVariabilitySDNN" value="65.2" unit="ms" startDate="2026-08-02 06:05:00 +0200"/>
</HealthData>`;

  const result = importer.parseAppleHealthXml(xml);
  assert.equal(result.weights.length, 1);
  assert.equal(result.weights[0].kg, 82.4);
  assert.equal(result.sleepLogs.length, 1);
  assert.equal(result.sleepLogs[0].hours, 8);
  assert.equal(result.healthMetrics["2026-08-02"].hrvSdnn, 65);
});

test("detectAndImport auto-detects Strong CSV format and updates state", () => {
  const state = { history: [] };
  const csv = `Date,Workout Name,Exercise Name,Set Order,Weight,Reps,RPE
2026-08-01 10:00:00,Upper,Chest Press,1,60,10,8`;
  const result = importer.detectAndImport(csv, state);
  assert.equal(result.format, "Strong CSV");
  assert.equal(state.history.length, 1);
});
