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

test("completeWorkout retains at least 400 workout history records without truncating imported history", () => {
  assert.ok(
    sessionModule.WORKOUT_HISTORY_LIMIT >= 400,
    "WORKOUT_HISTORY_LIMIT constant must be exported and be at least 400"
  );
  assert.equal(
    sessionModule.WORKOUT_HISTORY_LIMIT,
    sessionModule.WORKOUT_HISTORY_RETENTION_LIMIT,
    "WORKOUT_HISTORY_RETENTION_LIMIT alias should match WORKOUT_HISTORY_LIMIT"
  );

  // Generate 400 imported workout records matching the importer's retention limit
  const importedHistory = Array.from({ length: 400 }, (_, i) => ({
    id: 1600000000000 + i * 1000,
    date: new Date(1600000000000 + i * 1000).toISOString(),
    session: "gym",
    duration: 1800,
    calories: 250,
    sets: 3,
    entries: []
  }));

  const state = createInitialState({
    session: "gym",
    index: 2,
    sessionStartedAt: 1700000000000,
    completed: { "gym-0": [0] },
    history: [...importedHistory]
  });

  const finishTime = 1700001000000;
  const { record } = sessionModule.completeWorkout(state, mockSessions, {
    now: finishTime
  });

  assert.ok(record, "Workout completes successfully");
  assert.equal(
    state.history.length,
    sessionModule.WORKOUT_HISTORY_LIMIT,
    "History retains up to WORKOUT_HISTORY_LIMIT (400) records instead of truncating to 60"
  );
  assert.equal(state.history[0].id, finishTime, "Newly completed workout is prepended at index 0");
  assert.equal(state.history[1].id, importedHistory[0].id, "Most recent imported record is preserved at index 1");
  assert.equal(state.history[399].id, importedHistory[398].id, "Oldest preserved imported record is retained at index 399");

  // Also verify smaller history expands without premature capping
  const smallHistoryState = createInitialState({
    session: "morning",
    index: 2,
    sessionStartedAt: 1700000000000,
    completed: { "morning-0": [0] },
    history: importedHistory.slice(0, 10)
  });
  sessionModule.completeWorkout(smallHistoryState, mockSessions, { now: finishTime + 1000 });
  assert.equal(smallHistoryState.history.length, 11, "Small history expands to include new completion");
});

test("completeWorkout clears completed set markers after constructing history record while preserving reference logs", () => {
  const state = createInitialState({
    session: "gym",
    index: 2,
    sessionStartedAt: 1700000000000,
    completed: {
      "gym-0": [0, 1],
      "gym-1": [0],
      "morning-0": [0] // Unrelated session completion marker
    },
    logs: {
      "Leg Press": {
        sets: [
          { weight: "140", reps: "10", rpe: "8", note: "solid" },
          { weight: "140", reps: "10", rpe: "8.5", note: "" }
        ]
      }
    }
  });

  const { record } = sessionModule.completeWorkout(state, mockSessions, {
    now: 1700001000000
  });

  // History record captures the completed sets
  assert.ok(record);
  assert.equal(record.sets, 3, "Record reflects completed sets from session");
  assert.equal(record.entries.length, 3, "Record entries contain all completed sets");

  // Completed markers for this session must be cleared from state
  assert.equal(state.completed["gym-0"], undefined, "gym-0 markers cleared on workout completion");
  assert.equal(state.completed["gym-1"], undefined, "gym-1 markers cleared on workout completion");
  assert.deepEqual(state.completed["morning-0"], [0], "Unrelated session markers are preserved");
  assert.equal(state.sessionStartedAt, null, "sessionStartedAt is cleared");

  // Verify previous-session logs remain available as load/repetition reference
  assert.ok(state.logs["Leg Press"], "Exercise logs preserved");
  assert.equal(state.logs["Leg Press"].sets[0].weight, "140");
  assert.ok(state.logs["Leg Press"].previousSets, "Previous sets promoted for reference");
  assert.equal(state.logs["Leg Press"].previousSets[0].weight, "140");
  assert.equal(state.logs["Leg Press"].previousSets[0].reps, "10");
});

test("second workout starts with no completed sets and clears stale markers", () => {
  // 1. Normal flow: workout completed, then a second workout starts
  const state = createInitialState({
    session: "gym",
    index: 2,
    sessionStartedAt: 1700000000000,
    completed: {
      "gym-0": [0, 1],
      "gym-1": [0]
    },
    logs: {
      "Leg Press": {
        sets: [
          { weight: "120", reps: "12", rpe: "7", note: "" },
          { weight: "120", reps: "12", rpe: "7", note: "" }
        ]
      }
    }
  });

  // Complete workout 1
  sessionModule.completeWorkout(state, mockSessions, { now: 1700001000000 });
  assert.equal(state.sessionStartedAt, null);
  assert.equal(state.completed["gym-0"], undefined);
  assert.equal(state.completed["gym-1"], undefined);

  // Start workout 2 of the same session type
  const startResult = sessionModule.startWorkout(state, "gym", mockSessions, { now: 1700002000000 });
  assert.equal(startResult.isContinuing, false, "Second workout starts as a genuinely new session");
  assert.equal(state.index, 0, "Index resets to 0 for fresh workout");
  assert.equal(state.sessionStartedAt, 1700002000000, "New session gets fresh start timestamp");

  const gymCompletionKeys = Object.keys(state.completed).filter(k => k.startsWith("gym-"));
  assert.deepEqual(gymCompletionKeys, [], "No completed set markers carry over into the new session");

  // Load/repetition reference is preserved from workout 1
  assert.equal(state.logs["Leg Press"].previousSets[0].weight, "120");

  // Toggling a set in the fresh session works from scratch
  const firstSetToggle = sessionModule.toggleSetCompletion(state, "gym", 0, 0);
  assert.equal(firstSetToggle.isDone, true);
  assert.deepEqual(state.completed["gym-0"], [0], "Fresh session correctly tracks new set completion");

  // 2. Cold start with stale completed markers (e.g. from reload, un-abandoned session, or dirty state)
  const dirtyState = createInitialState({
    session: "morning",
    sessionStartedAt: null, // Not active / not resumable
    index: 2,
    completed: {
      "morning-0": [0],
      "morning-1": [0],
      "cardio-0": [0] // Other session marker
    }
  });

  const dirtyStartResult = sessionModule.startWorkout(dirtyState, "morning", mockSessions, { now: 1700003000000 });
  assert.equal(dirtyStartResult.isContinuing, false, "Not continuing an inactive session");
  assert.equal(dirtyState.index, 0, "Index reset to 0");
  assert.equal(dirtyState.sessionStartedAt, 1700003000000);
  assert.equal(dirtyState.completed["morning-0"], undefined, "Stale morning-0 marker cleared");
  assert.equal(dirtyState.completed["morning-1"], undefined, "Stale morning-1 marker cleared");
  assert.deepEqual(dirtyState.completed["cardio-0"], [0], "Unrelated session marker preserved");

  // 3. Completing via advanceExercise followed by starting a second workout
  const advanceState = createInitialState({
    session: "morning",
    index: 2, // Last exercise for morning (3 exercises)
    sessionStartedAt: 1700000000000,
    completed: { "morning-0": [0], "morning-1": [0], "morning-2": [0] }
  });

  const advResult = sessionModule.advanceExercise(advanceState, mockSessions, { now: 1700000600000 });
  assert.equal(advResult.completed, true, "Advance on final exercise completes workout");
  assert.equal(advanceState.sessionStartedAt, null);
  assert.equal(advanceState.completed["morning-0"], undefined, "Markers cleared by completion in advanceExercise");

  // Start next workout
  const nextStart = sessionModule.startWorkout(advanceState, "morning", mockSessions, { now: 1700001200000 });
  assert.equal(nextStart.isContinuing, false);
  assert.equal(advanceState.index, 0);
  assert.deepEqual(Object.keys(advanceState.completed).filter(k => k.startsWith("morning-")), []);
});

