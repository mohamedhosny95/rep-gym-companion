import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Load offline-nutrition module into global environment
const code = readFileSync("src/client/offline-nutrition.js", "utf8");
new Function(code)();
const engine = globalThis.REP_OFFLINE_NUTRITION;

test("offline nutrition engine exposes estimate and database", () => {
  assert.ok(engine);
  assert.equal(typeof engine.estimate, "function");
  assert.ok(Array.isArray(engine.database));
  assert.ok(engine.database.length >= 25);
});

test("parses multi-ingredient meal with specific grams in English", () => {
  const result = engine.estimate("200g chicken breast and 150g white rice with 1 tbsp olive oil");
  assert.equal(result.recognizable, true);
  assert.equal(result.confidence, "High");
  assert.equal(result.source, "Local estimate (offline)");
  // 200g chicken (62g P, 330 kcal) + 150g rice (4.05g P, 42g C, 195 kcal) + 14g olive oil (14g F, 124 kcal)
  assert.ok(result.protein_g >= 60 && result.protein_g <= 70, `Expected protein ~66g, got ${result.protein_g}g`);
  assert.ok(result.carbs_g >= 38 && result.carbs_g <= 46, `Expected carbs ~42g, got ${result.carbs_g}g`);
  assert.ok(result.fat_g >= 18 && result.fat_g <= 25, `Expected fat ~21g, got ${result.fat_g}g`);
  assert.ok(result.calories >= 600 && result.calories <= 700, `Expected calories ~649, got ${result.calories}`);
});

test("parses Arabic meal with Arabic numerals and unit names", () => {
  const result = engine.estimate("٣ بيضات، ٢ توست، موزة");
  assert.equal(result.recognizable, true);
  assert.equal(result.source, "Local estimate (offline)");
  // 3 eggs (150g) + 2 toast (60g) + 1 banana (118g)
  assert.ok(result.protein_g >= 22 && result.protein_g <= 28, `Expected protein ~25g, got ${result.protein_g}g`);
  assert.ok(result.calories >= 450 && result.calories <= 550, `Expected calories ~480, got ${result.calories}`);
});

test("parses whey shake with milk", () => {
  const result = engine.estimate("1 scoop whey + 250ml milk");
  assert.equal(result.recognizable, true);
  assert.ok(result.protein_g >= 30, `Expected protein >= 30g, got ${result.protein_g}g`);
  assert.ok(result.calories >= 250, `Expected calories >= 250, got ${result.calories}`);
});

test("handles empty or unrecognized strings gracefully", () => {
  const empty = engine.estimate("");
  assert.equal(empty.recognizable, false);
  assert.equal(empty.calories, 0);

  const unknown = engine.estimate("some mysterious foreign dish");
  assert.equal(unknown.recognizable, true);
  assert.equal(unknown.confidence, "Low");
  assert.ok(unknown.calories > 0);
});
