/* Rep Training Session Lifecycle Module v1.
   Pure, testable helpers and state transitions for workout execution. */
(function(root, factory){
  const exported = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = exported;
  }
  root.REP_TRAINING_SESSION = exported;
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this, function(){
  const SESSION_MET = {
    morning: 2.8,
    gym: 5,
    cardio: 4.3,
    bad: 2.5,
    gymLite: 4.5,
    padel: 6,
    football: 7,
    basketball: 6.5,
    swimming: 6,
    cycling: 7.5,
    tennis: 7,
    other: 5
  };

  const MOTION_DURATIONS = {
    march: 180,
    catcow: 0,
    kneel: 45,
    floor: 45,
    birddog: 60,
    plank: 45,
    breathe: 20,
    kegel: 0,
    grip: 0,
    bike: 300,
    legpress: 0,
    hinge: 0,
    chestpress: 0,
    row: 0,
    pulldown: 0,
    walk: 300,
    inclinewalk: 1500,
    stretch: 30
  };

  function setsFromLog(log){
    if(Array.isArray(log?.sets)) return log.sets;
    if(log?.current) return [{...log.current, rpe:"", note:""}];
    return [];
  }

  function normalizedLog(logs, id, sets = 3){
    const store = logs || {};
    const old = store[id] || {};
    if(!Array.isArray(old.sets)){
      old.sets = Array.from({length: sets}, (_, i) => i === 0 && old.current
        ? {weight: old.current.weight || "", reps: old.current.reps || "", rpe: "", note: ""}
        : {weight: "", reps: "", rpe: "", note: ""});
    }
    while(old.sets.length < sets){
      old.sets.push({weight: "", reps: "", rpe: "", note: ""});
    }
    old.previousSets = old.previousSets || (old.previous ? [{weight: old.previous.weight || "", reps: old.previous.reps || "", rpe: "", note: ""}] : []);
    store[id] = old;
    return old;
  }

  function promoteLogs(logs){
    if(!logs || typeof logs !== "object") return;
    Object.values(logs).forEach(log => {
      if(log?.sets?.some(s => s.weight || s.reps)){
        log.previousSets = log.sets.map(s => ({...s}));
      }
    });
  }

  function estimateCalories(sessionId, durationSeconds, weightKg = 75){
    const met = SESSION_MET[sessionId] || 4;
    const kg = Number.isFinite(Number(weightKg)) && Number(weightKg) > 0 ? Number(weightKg) : 75;
    const dur = Math.max(0, Number(durationSeconds) || 0);
    return Math.round(met * kg * (dur / 3600));
  }

  function progressionCode(id, sets, sessionType = "gym"){
    if(!sets?.length) return sessionType === "gym" ? "Hold" : "Recovery";
    const valid = sets.filter(s => Number(s.reps) > 0);
    const avg = valid.reduce((n, s) => n + (Number(s.rpe) || 7), 0) / (valid.length || 1);
    const min = Math.min(...valid.map(s => Number(s.reps) || 0));
    if(avg >= 9 || min < 8) return "Reduce";
    if(valid.length >= 2 && valid.every(s => Number(s.reps) >= 12 && (Number(s.rpe) || 7) <= 7.5)) return "Increase";
    return sessionType === "gym" ? "Hold" : "Recovery";
  }

  function progressionAdvice({ logs = {}, history = [], id, recoveryGate = null }){
    const recent = (history || [])
      .filter(h => h.session === "gym" && h.loads?.[id])
      .slice(0, 3)
      .map(h => setsFromLog(h.loads[id]))
      .filter(Boolean);
    const current = setsFromLog(logs[id]);
    const sample = current.some(s => s.reps) ? current : (recent[0] || []);
    if(!sample.length){
      return "Log reps and RPE to unlock an automatic recommendation.";
    }
    const valid = sample.filter(s => Number(s.reps) > 0);
    const avgRpe = valid.reduce((n, s) => n + (Number(s.rpe) || 7), 0) / (valid.length || 1);
    const minReps = Math.min(...valid.map(s => Number(s.reps) || 0));
    const allTop = valid.length >= 2 && valid.every(s => Number(s.reps) >= 12 && (Number(s.rpe) || 7) <= 7.5);
    const twoWins = allTop && recent.slice(0, 2).length === 2 && recent.slice(0, 2).every(a => a.length >= 2 && a.every(s => Number(s.reps) >= 12 && (Number(s.rpe) || 7) <= 7.5));
    if(recoveryGate?.hold){
      return `${recoveryGate.flags} recovery red flags: hold the load and take an extra light day.`;
    }
    if(avgRpe >= 9 || minReps < 8){
      return "Reduce about 5% or hold until form and reps recover.";
    }
    if(allTop){
      const jump = ["Leg Press", "Back Extension", "Hip Thrust Machine"].includes(id) ? 5 : 2.5;
      return `${twoWins ? "Progression confirmed:" : "Ready to progress:"} add ${jump} kg next session.`;
    }
    return "Hold the load; improve rep quality or reach 12 reps at RPE ≤ 7.5.";
  }

  function cardioAdvice(history = []){
    const recent = (history || []).filter(h => h.session === "cardio" && h.cardio).slice(0, 6);
    const easy = recent.filter(h => Number(h.cardio.minutes) >= 25 && Number(h.cardio.rpe) <= 6);
    if(easy.length < 3){
      return `Hold settings: ${easy.length}/3 full, easy sessions.`;
    }
    const span = (new Date(easy[0].date).getTime() - new Date(easy[easy.length - 1].date).getTime()) / 86400000;
    if(span < 21){
      return "Performance is good; complete three weeks before raising incline or pace.";
    }
    return "Ready: raise incline or pace slightly, not duration.";
  }

  function isCardioProgressionReady(history = []){
    const recent = (history || []).filter(h => h.session === "cardio" && h.cardio).slice(0, 6);
    const easy = recent.filter(h => Number(h.cardio.minutes) >= 25 && Number(h.cardio.rpe) <= 6);
    if(easy.length < 3) return false;
    const span = (new Date(easy[0].date).getTime() - new Date(easy[easy.length - 1].date).getTime()) / 86400000;
    return span >= 21;
  }

  /* --- State Transitions --- */

  function previewWorkout(state, sessionId){
    if(!state) return state;
    state.previewSession = sessionId;
    state.view = "preview";
    state.activeTab = "train";
    return state;
  }

  function isResumableWorkout(state, sessions, sessionId = null){
    if(!state || !sessions) return false;
    const sid = sessionId || state.session;
    if(!sid || !sessions[sid]) return false;
    if(sessionId && state.session !== sessionId) return false;
    if(!state.sessionStartedAt) return false;
    const totalExercises = sessions[sid].exercises?.length || 0;
    return Number.isInteger(state.index) && state.index >= 0 && state.index < totalExercises;
  }

  function startWorkout(state, sessionId, sessions, { now = Date.now() } = {}){
    if(!state) return { state, isContinuing: false };
    const total = sessions?.[sessionId]?.exercises?.length || 0;
    const isContinuing = isResumableWorkout(state, sessions, sessionId);
    if(state.session !== sessionId || state.index >= total){
      state.index = 0;
    }
    state.session = sessionId;
    if(!isContinuing){
      state.sessionStartedAt = now;
    }
    state.view = "player";
    state.activeTab = "train";
    return { state, isContinuing };
  }

  function toggleSetCompletion(state, sessionId, exerciseIndex, setIndex){
    if(!state) return { isDone: false, completedSets: [] };
    state.completed = state.completed || {};
    const key = `${sessionId}-${exerciseIndex}`;
    const list = state.completed[key] || [];
    const already = list.includes(setIndex);
    const nextList = already ? list.filter(i => i !== setIndex) : [...list, setIndex];
    state.completed[key] = nextList;
    return { isDone: !already, completedSets: nextList };
  }

  function previousExercise(state){
    if(!state) return { moved: false, index: 0, state };
    if(state.index > 0){
      state.index--;
      return { moved: true, index: state.index, state };
    }
    return { moved: false, index: state.index || 0, state };
  }

  function advanceExercise(state, sessions, options = {}){
    if(!state || !sessions) return { completed: false, state };
    const session = sessions[state.session];
    if(!session) return { completed: false, state };
    const total = session.exercises?.length || 0;
    if(state.index >= total - 1){
      const { record } = completeWorkout(state, sessions, options);
      state.index++;
      return { completed: true, record, state };
    }
    state.index++;
    return { completed: false, state };
  }

  function completeWorkout(state, sessions, { weightKg = 75, now = Date.now(), motionDurations = MOTION_DURATIONS } = {}){
    if(!state || !sessions) return { record: null, state };
    const session = sessions[state.session];
    if(!session) return { record: null, state };

    const sets = Object.entries(state.completed || {})
      .filter(([k]) => k.startsWith(`${state.session}-`))
      .reduce((n, [, v]) => n + (Array.isArray(v) ? v.length : 0), 0);

    const startTime = state.sessionStartedAt || now;
    const duration = Math.max(0, Math.floor((now - startTime) / 1000));
    const calories = estimateCalories(state.session, duration, weightKg);
    const record = {
      id: now,
      date: new Date(now).toISOString(),
      session: state.session,
      duration,
      calories,
      sets,
      loads: JSON.parse(JSON.stringify(state.logs || {})),
      entries: [],
      cardio: state.session === "cardio" ? JSON.parse(JSON.stringify(state.cardioDraft || {})) : null
    };

    const priorBest = {};
    (state.history || []).forEach(h => {
      Object.entries(h.loads || {}).forEach(([name, log]) => {
        setsFromLog(log).forEach(s => {
          priorBest[name] = Math.max(priorBest[name] || 0, Number(s.weight) || 0);
        });
      });
    });

    (session.exercises || []).forEach((base, index) => {
      const completed = state.completed?.[`${state.session}-${index}`] || [];
      const id = base.name === "Back Extension" && state.swaps?.backExtension ? "Hip Thrust Machine" : base.name;
      const logged = setsFromLog(state.logs?.[id]);
      completed.forEach(setIndex => {
        const set = logged[setIndex] || {};
        const weight = Number(set.weight) || 0;
        const durFallback = motionDurations[base.motion] ?? (MOTION_DURATIONS[base.motion] || "");
        record.entries.push({
          entry: `${id} · Set ${setIndex + 1}`,
          exercise: id,
          set: setIndex + 1,
          weight: set.weight || "",
          reps: set.reps || "",
          rpe: set.rpe || "",
          note: set.note || "",
          duration: !set.reps && !set.weight ? (durFallback || "") : "",
          rest: base.rest || "",
          progression: progressionCode(id, logged, state.session),
          personalBest: Boolean(weight && weight > (priorBest[id] || 0))
        });
      });
    });

    if(record.cardio){
      const main = record.entries.find(e => e.exercise === "Incline Treadmill Walk");
      if(main){
        main.duration = Number(record.cardio.minutes || 0) * 60;
        main.rpe = record.cardio.rpe || "";
        main.note = `Incline ${record.cardio.incline || "—"}% · Pace ${record.cardio.pace || "—"} km/h`;
        main.progression = isCardioProgressionReady(state.history) ? "Increase" : "Hold";
      }
    }

    state.history = [record, ...(state.history || [])].slice(0, 60);
    if(state.session === "gym"){
      promoteLogs(state.logs);
    }
    state.sessionStartedAt = null;
    return { record, state };
  }

  function abandonWorkout(state, sessionId = state?.session){
    if(!state) return state;
    const sid = sessionId || state.session;
    if(sid && state.completed){
      Object.keys(state.completed)
        .filter(k => k.startsWith(`${sid}-`))
        .forEach(k => delete state.completed[k]);
    }
    state.index = 0;
    state.sessionStartedAt = null;
    return state;
  }

  function resetWorkout(state, sessionId = state?.session){
    if(!state) return state;
    const sid = sessionId || state.session;
    if(sid && state.completed){
      Object.keys(state.completed)
        .filter(k => k.startsWith(`${sid}-`))
        .forEach(k => delete state.completed[k]);
    }
    state.index = 0;
    state.sessionStartedAt = null;
    return state;
  }

  return Object.freeze({
    SESSION_MET,
    MOTION_DURATIONS,
    setsFromLog,
    normalizedLog,
    promoteLogs,
    estimateCalories,
    progressionCode,
    progressionAdvice,
    cardioAdvice,
    isCardioProgressionReady,
    previewWorkout,
    isResumableWorkout,
    startWorkout,
    toggleSetCompletion,
    previousExercise,
    advanceExercise,
    completeWorkout,
    abandonWorkout,
    resetWorkout
  });
});
