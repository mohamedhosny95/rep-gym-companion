import test from "node:test";
import assert from "node:assert/strict";

// Load the modules into global scope
await import("../src/client/recovery-map.js");
await import("../src/client/muscle-heatmap.js");
await import("../src/client/plate-calculator.js");

const recoveryMap = globalThis.REP_RECOVERY_MAP;
const muscleHeatmap = globalThis.REP_MUSCLE_HEATMAP;
const plateCalculator = globalThis.REP_PLATE_CALCULATOR;

test("REP_RECOVERY_MAP: computeMuscleReadiness returns 100% fresh scores on empty history", () => {
  assert.ok(recoveryMap, "REP_RECOVERY_MAP must be defined");
  const readiness = recoveryMap.computeMuscleReadiness([]);
  
  const expectedMuscles = ["chest", "lats", "quads", "hamstrings", "glutes", "delts", "arms", "core"];
  for (const m of expectedMuscles) {
    assert.ok(readiness[m], `Muscle ${m} must exist in readiness map`);
    assert.equal(readiness[m].score, 100, `${m} score must be 100% when fresh`);
    assert.equal(readiness[m].totalSets72h, 0);
    assert.equal(readiness[m].lastTrainedHours, null);
  }
});

test("REP_RECOVERY_MAP: fatigue drops appropriately following recent high-volume chest press", () => {
  const now = Date.now();
  const history = [
    {
      date: new Date(now - 4 * 3600 * 1000).toISOString(), // 4 hours ago
      loads: {
        "Chest Press": {
          sets: [
            { weight: "80", reps: "10" },
            { weight: "80", reps: "10" },
            { weight: "80", reps: "9" },
            { weight: "80", reps: "8" }
          ]
        }
      }
    }
  ];

  const readiness = recoveryMap.computeMuscleReadiness(history);
  assert.ok(readiness.chest.score < 100, "Chest readiness must drop after 4 sets 4h ago");
  assert.equal(readiness.chest.totalSets72h, 4);
  assert.equal(readiness.chest.lastTrainedHours, 4);
  assert.equal(readiness.quads.score, 100, "Untrained muscles must remain 100% fresh");
});

test("REP_RECOVERY_MAP: renderRecoveryMap outputs structured semantic markup in both English and Arabic", () => {
  const stateEn = { lang: "en", history: [] };
  const htmlEn = recoveryMap.renderRecoveryMap(stateEn);
  assert.ok(htmlEn.includes("recovery-map-card"), "Must include recovery-map-card class");
  assert.ok(htmlEn.includes("muscle-recovery-item"), "Must include muscle-recovery-item class");
  assert.ok(htmlEn.includes("Muscle Readiness &amp; Fatigue") || htmlEn.includes("Muscle Readiness & Fatigue"), "Must include English heading");

  const stateAr = { lang: "ar", history: [] };
  const htmlAr = recoveryMap.renderRecoveryMap(stateAr);
  assert.ok(htmlAr.includes("جاهزية واستشفاء العضلات"), "Must include Arabic heading");
  assert.ok(htmlAr.includes("الصدر"), "Must include Arabic muscle name");
});

test("REP_MUSCLE_HEATMAP: computeWeeklyVolumes calculates primary and secondary set distributions", () => {
  assert.ok(muscleHeatmap, "REP_MUSCLE_HEATMAP must be defined");
  const now = Date.now();
  const history = [
    {
      date: new Date(now - 24 * 3600 * 1000).toISOString(),
      loads: {
        "Flat Dumbbell Bench": {
          sets: [
            { weight: "30", reps: "10" },
            { weight: "30", reps: "10" },
            { weight: "30", reps: "10" }
          ]
        }
      }
    }
  ];

  const volumes = muscleHeatmap.computeWeeklyVolumes(history);
  assert.equal(volumes.Chest.sets, 3, "Chest should receive 3 primary sets");
  assert.equal(volumes.Triceps.sets, 1.5, "Triceps should receive secondary fractional sets (0.5 * 3 = 1.5)");
});

test("REP_MUSCLE_HEATMAP: getVolumeStatus accurately identifies MEV, MAV, and MRV tiers", () => {
  const statusZero = muscleHeatmap.getVolumeStatus("Chest", 0);
  assert.equal(statusZero.status, "none");

  const statusUnder = muscleHeatmap.getVolumeStatus("Chest", 4);
  assert.equal(statusUnder.status, "under");

  const statusOptimal = muscleHeatmap.getVolumeStatus("Chest", 12);
  assert.equal(statusOptimal.status, "optimal");

  const statusHigh = muscleHeatmap.getVolumeStatus("Chest", 20);
  assert.equal(statusHigh.status, "high");

  const statusOver = muscleHeatmap.getVolumeStatus("Chest", 26);
  assert.equal(statusOver.status, "over");
});

test("REP_MUSCLE_HEATMAP: renderHeatmapCard generates valid UI in Arabic and English", () => {
  const htmlEn = muscleHeatmap.renderHeatmapCard({ history: [] }, false);
  assert.ok(htmlEn.includes("muscle-heatmap-card"), "Must include muscle-heatmap-card class");
  assert.ok(htmlEn.includes("WEEKLY HYPERTROPHY VOLUME"), "Must include English kicker");

  const htmlAr = muscleHeatmap.renderHeatmapCard({ history: [] }, true);
  assert.ok(htmlAr.includes("توازن وتوزيع الحجم التدريبي"), "Must include Arabic kicker");
});

test("REP_PLATE_CALCULATOR: calculatePlates calculates correct Olympic barbell loadings", () => {
  assert.ok(plateCalculator, "REP_PLATE_CALCULATOR must be defined");
  
  // 60 kg total on 20 kg bar = 20 kg per side -> 1 x 20kg plate
  const result60 = plateCalculator.calculatePlates(60, 20);
  assert.equal(result60.perSide, 20);
  assert.equal(result60.plates.length, 1);
  assert.equal(result60.plates[0].kg, 20);
  assert.equal(result60.remainder, 0);

  // 100 kg total on 20 kg bar = 40 kg per side -> 2 x 20kg plates
  const result100 = plateCalculator.calculatePlates(100, 20);
  assert.equal(result100.perSide, 40);
  assert.equal(result100.plates.length, 2);
  assert.equal(result100.plates[0].kg, 20);
  assert.equal(result100.plates[1].kg, 20);
  assert.equal(result100.remainder, 0);

  // 72.5 kg total on 20 kg bar = 26.25 kg per side -> 20kg + 5kg + 1.25kg
  const result72_5 = plateCalculator.calculatePlates(72.5, 20);
  assert.equal(result72_5.perSide, 26.3);
  assert.equal(result72_5.plates.map(p => p.kg).join(","), "20,5,1.25");
  assert.equal(result72_5.remainder, 0);

  // EZ Bar (10kg) with 30kg total = 10kg per side -> 1 x 10kg plate
  const resultEz = plateCalculator.calculatePlates(30, 10);
  assert.equal(resultEz.perSide, 10);
  assert.equal(resultEz.plates.length, 1);
  assert.equal(resultEz.plates[0].kg, 10);
});
