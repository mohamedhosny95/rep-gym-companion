import test from "node:test";
import assert from "node:assert/strict";
await import("../src/client/training-session.js");

const sessionModule = globalThis.REP_TRAINING_SESSION;

const mockSessions = {
  morning: {
    name: "Morning Activation",
    exercises: [
      { name: "Brisk Marching in Place", motion: "march", sets: 1, rest: 0 },
      { name: "Cat-Cow", motion: "catcow", sets: 1, rest: 0 },
      { name: "Plank", motion: "plank", sets: 1, rest: 0 }
    ]
  },
  gym: {
    name: "Gym Session",
    exercises: [
      { name: "Leg Press", motion: "legpress", sets: 3, rest: 90 },
      { name: "Back Extension", motion: "hinge", sets: 3, rest: 90 },
      { name: "Chest Press", motion: "chestpress", sets: 3, rest: 90 }
    ]
  },
  cardio: {
    name: "Cardio Session",
    exercises: [
      { name: "Easy Warm-up Walk", motion: "walk", sets: 1, rest: 0 },
      { name: "Incline Treadmill Walk", motion: "inclinewalk", sets: 1, rest: 0 },
      { name: "Easy Cooldown", motion: "stretch", sets: 1, rest: 0 }
    ]
  }
};

function createInitialState(overrides = {}) {
  return {
    view: "home",
    activeTab: "train",
    session: null,
    previewSession: null,
    index: 0,
    sessionStartedAt: null,
    completed: {},
    logs: {},
    swaps: {},
    history: [],
    cardioDraft: { minutes: 25, rpe: 6, incline: 5, pace: 4.5 },
    ...overrides
  };
}

test("previewWorkout sets preview metadata without starting an active session", () => {
  const state = createInitialState();
  sessionModule.previewWorkout(state, "gym");

  assert.equal(state.view, "preview");
  assert.equal(state.activeTab, "train");
  assert.equal(state.previewSession, "gym");
  assert.equal(state.session, null, "state.session must not be modified by preview");
  assert.equal(state.sessionStartedAt, null, "state.sessionStartedAt must remain null");
  assert.equal(state.index, 0);
  assert.deepEqual(state.completed, {});
  assert.equal(sessionModule.isResumableWorkout(state, mockSessions), false, "Previewed workout is not resumable");
});

test("startWorkout initiates a new session on cold start", () => {
  const state = createInitialState();
  const startTime = 1700000000000;
  const result = sessionModule.startWorkout(state, "gym", mockSessions, { now: startTime });

  assert.equal(result.isContinuing, false);
  assert.equal(state.session, "gym");
  assert.equal(state.index, 0);
  assert.equal(state.sessionStartedAt, startTime);
  assert.equal(state.view, "player");
  assert.equal(state.activeTab, "train");
  assert.equal(sessionModule.isResumableWorkout(state, mockSessions), true, "Started workout is resumable");
  assert.equal(sessionModule.isResumableWorkout(state, mockSessions, "gym"), true);
  assert.equal(sessionModule.isResumableWorkout(state, mockSessions, "cardio"), false);
});

test("startWorkout detects an active continuing session and preserves start timestamp", () => {
  const originalStart = 1700000000000;
  const state = createInitialState({
    session: "gym",
    index: 1,
    sessionStartedAt: originalStart,
    completed: { "gym-0": [0, 1, 2] }
  });

  const resumeTime = 1700000060000;
  const result = sessionModule.startWorkout(state, "gym", mockSessions, { now: resumeTime });

  assert.equal(result.isContinuing, true);
  assert.equal(state.session, "gym");
  assert.equal(state.index, 1, "Preserves current exercise index");
  assert.equal(state.sessionStartedAt, originalStart, "Preserves initial start timestamp");
  assert.equal(state.view, "player");
});

test("startWorkout resets index and timestamp when switching to a different workout session", () => {
  const state = createInitialState({
    session: "morning",
    index: 2,
    sessionStartedAt: 1700000000000
  });

  const nextTime = 1700000090000;
  const result = sessionModule.startWorkout(state, "gym", mockSessions, { now: nextTime });

  assert.equal(result.isContinuing, false);
  assert.equal(state.session, "gym");
  assert.equal(state.index, 0);
  assert.equal(state.sessionStartedAt, nextTime);
});

test("isResumableWorkout handles edge cases, corrupted states, and reloaded data", () => {
  assert.equal(sessionModule.isResumableWorkout(null, mockSessions), false);
  assert.equal(sessionModule.isResumableWorkout({}, mockSessions), false);

  // Missing sessionStartedAt
  const noTimestamp = createInitialState({ session: "gym", index: 1, sessionStartedAt: null });
  assert.equal(sessionModule.isResumableWorkout(noTimestamp, mockSessions), false);

  // Unknown session ID
  const unknownSession = createInitialState({ session: "pilates", index: 0, sessionStartedAt: 1700000000000 });
  assert.equal(sessionModule.isResumableWorkout(unknownSession, mockSessions), false);

  // Index out of bounds (past last exercise)
  const pastEnd = createInitialState({ session: "morning", index: 3, sessionStartedAt: 1700000000000 });
  assert.equal(sessionModule.isResumableWorkout(pastEnd, mockSessions), false);

  // Negative index
  const negativeIndex = createInitialState({ session: "morning", index: -1, sessionStartedAt: 1700000000000 });
  assert.equal(sessionModule.isResumableWorkout(negativeIndex, mockSessions), false);

  // Simulated browser reload / rehydration
  const activeJson = JSON.stringify(createInitialState({
    session: "cardio",
    index: 1,
    sessionStartedAt: 1700000010000,
    completed: { "cardio-0": [0] }
  }));
  const rehydrated = JSON.parse(activeJson);
  assert.equal(sessionModule.isResumableWorkout(rehydrated, mockSessions), true, "Resumable across persistence round-trip");
});

test("toggleSetCompletion toggles completion marks correctly", () => {
  const state = createInitialState({ session: "gym", index: 0 });

  const firstToggle = sessionModule.toggleSetCompletion(state, "gym", 0, 0);
  assert.equal(firstToggle.isDone, true);
  assert.deepEqual(state.completed["gym-0"], [0]);

  const secondSet = sessionModule.toggleSetCompletion(state, "gym", 0, 1);
  assert.equal(secondSet.isDone, true);
  assert.deepEqual(state.completed["gym-0"], [0, 1]);

  const uncheckFirst = sessionModule.toggleSetCompletion(state, "gym", 0, 0);
  assert.equal(uncheckFirst.isDone, false);
  assert.deepEqual(state.completed["gym-0"], [1]);
});

test("previousExercise navigates back safely without going below 0", () => {
  const state = createInitialState({ session: "gym", index: 2 });

  const step1 = sessionModule.previousExercise(state);
  assert.equal(step1.moved, true);
  assert.equal(state.index, 1);

  const step2 = sessionModule.previousExercise(state);
  assert.equal(step2.moved, true);
  assert.equal(state.index, 0);

  const step3 = sessionModule.previousExercise(state);
  assert.equal(step3.moved, false);
  assert.equal(state.index, 0);
});

test("advanceExercise advances through exercises and completes on the last step", () => {
  const startTime = 1700000000000;
  const finishTime = 1700000600000;
  const state = createInitialState({
    session: "morning",
    index: 0,
    sessionStartedAt: startTime,
    completed: { "morning-0": [0], "morning-1": [0], "morning-2": [0] }
  });

  const step1 = sessionModule.advanceExercise(state, mockSessions);
  assert.equal(step1.completed, false);
  assert.equal(state.index, 1);

  const step2 = sessionModule.advanceExercise(state, mockSessions);
  assert.equal(step2.completed, false);
  assert.equal(state.index, 2);

  // At index 2 (last exercise for morning session with 3 exercises)
  const step3 = sessionModule.advanceExercise(state, mockSessions, { now: finishTime, weightKg: 80 });
  assert.equal(step3.completed, true);
  assert.ok(step3.record);
  assert.equal(state.index, 3);
  assert.equal(state.sessionStartedAt, null, "sessionStartedAt cleared on completion");
  assert.equal(state.history.length, 1);
  assert.equal(state.history[0].session, "morning");
  assert.equal(state.history[0].duration, 600);
  assert.ok(state.history[0].calories > 0);
  assert.equal(sessionModule.isResumableWorkout(state, mockSessions), false);
});

test("completeWorkout creates structured history record exactly once", () => {
  const startTime = 1700000000000;
  const finishTime = 1700001800000; // 30 min
  const state = createInitialState({
    session: "gym",
    index: 2,
    sessionStartedAt: startTime,
    completed: {
      "gym-0": [0, 1, 2],
      "gym-1": [0, 1],
      "gym-2": [0]
    },
    logs: {
      "Leg Press": {
        sets: [
          { weight: "120", reps: "12", rpe: "7", note: "smooth" },
          { weight: "120", reps: "12", rpe: "7", note: "" },
          { weight: "120", reps: "12", rpe: "7.5", note: "" }
        ]
      },
      "Back Extension": {
        sets: [
          { weight: "20", reps: "10", rpe: "8", note: "" },
          { weight: "20", reps: "10", rpe: "8", note: "" }
        ]
      }
    }
  });

  const { record } = sessionModule.completeWorkout(state, mockSessions, {
    weightKg: 75,
    now: finishTime
  });

  assert.ok(record);
  assert.equal(record.session, "gym");
  assert.equal(record.duration, 1800);
  assert.equal(record.sets, 6);
  assert.equal(record.entries.length, 6);
  assert.equal(state.history.length, 1);
  assert.equal(state.sessionStartedAt, null);

  // Check gym set promotion
  assert.ok(state.logs["Leg Press"].previousSets);
  assert.equal(state.logs["Leg Press"].previousSets.length, 3);
  assert.equal(state.logs["Leg Press"].previousSets[0].weight, "120");

  // Repeated call on already completed workout does not duplicate history
  const beforeLen = state.history.length;
  state.session = null;
  const repeated = sessionModule.completeWorkout(state, mockSessions);
  assert.equal(repeated.record, null);
  assert.equal(state.history.length, beforeLen);
});

test("completeWorkout supports exercise swaps such as Hip Thrust Machine", () => {
  const state = createInitialState({
    session: "gym",
    sessionStartedAt: 1700000000000,
    swaps: { backExtension: true },
    completed: { "gym-1": [0] },
    logs: {
      "Hip Thrust Machine": {
        sets: [{ weight: "60", reps: "12", rpe: "7", note: "" }]
      }
    }
  });

  const { record } = sessionModule.completeWorkout(state, mockSessions, { now: 1700000600000 });
  assert.ok(record);
  const swappedEntry = record.entries.find(e => e.exercise === "Hip Thrust Machine");
  assert.ok(swappedEntry, "Entry records swapped exercise name");
  assert.equal(swappedEntry.weight, "60");
});

test("abandonWorkout clears completion markers and timestamps while preserving set logs", () => {
  const state = createInitialState({
    session: "gym",
    index: 2,
    sessionStartedAt: 1700000000000,
    completed: {
      "gym-0": [0, 1],
      "gym-1": [0],
      "morning-0": [0] // un-related session key
    },
    logs: {
      "Leg Press": {
        sets: [{ weight: "140", reps: "10", rpe: "8", note: "hard set" }]
      }
    }
  });

  sessionModule.abandonWorkout(state, "gym");

  assert.equal(state.index, 0);
  assert.equal(state.sessionStartedAt, null);
  assert.deepEqual(state.completed, { "morning-0": [0] }, "Only abandoned session completion marks are cleared");
  assert.equal(state.logs["Leg Press"].sets[0].weight, "140", "Preserves entered logs");
  assert.equal(state.logs["Leg Press"].sets[0].note, "hard set");
  assert.equal(sessionModule.isResumableWorkout(state, mockSessions), false, "Abandoned workout cannot be resumed");
});

test("resetWorkout resets exercise index and clears completed markers for the session", () => {
  const state = createInitialState({
    session: "cardio",
    index: 3,
    completed: {
      "cardio-0": [0],
      "cardio-1": [0],
      "cardio-2": [0]
    }
  });

  sessionModule.resetWorkout(state, "cardio");

  assert.equal(state.index, 0);
  assert.equal(state.sessionStartedAt, null);
  assert.deepEqual(state.completed, {});
});

test("progression advice and codes calculate correctly", () => {
  const logs = {
    "Leg Press": {
      sets: [
        { weight: "100", reps: "12", rpe: "7" },
        { weight: "100", reps: "12", rpe: "7" }
      ]
    },
    "Chest Press": {
      sets: [
        { weight: "80", reps: "6", rpe: "9.5" }
      ]
    }
  };

  const codeIncrease = sessionModule.progressionCode("Leg Press", logs["Leg Press"].sets, "gym");
  assert.equal(codeIncrease, "Increase");

  const codeReduce = sessionModule.progressionCode("Chest Press", logs["Chest Press"].sets, "gym");
  assert.equal(codeReduce, "Reduce");

  const adviceEn = sessionModule.progressionAdvice({ logs, history: [], id: "Leg Press" });
  assert.ok(adviceEn.includes("add 5 kg"));

  const adviceHoldEn = sessionModule.progressionAdvice({ logs: {}, history: [], id: "Row" });
  assert.ok(adviceHoldEn.includes("Log reps and RPE"));
});

test("cardioAdvice evaluates progression readiness consistently", () => {
  const historyEmpty = [];
  assert.equal(sessionModule.isCardioProgressionReady(historyEmpty), false);
  assert.ok(sessionModule.cardioAdvice(historyEmpty).includes("Hold settings"));

  const d = (daysAgo) => new Date(Date.now() - daysAgo * 86400000).toISOString();
  const readyHistory = [
    { session: "cardio", date: d(1), cardio: { minutes: 30, rpe: 5 } },
    { session: "cardio", date: d(10), cardio: { minutes: 30, rpe: 6 } },
    { session: "cardio", date: d(25), cardio: { minutes: 30, rpe: 5 } }
  ];

  assert.equal(sessionModule.isCardioProgressionReady(readyHistory), true);
  assert.ok(sessionModule.cardioAdvice(readyHistory).startsWith("Ready"));
});
