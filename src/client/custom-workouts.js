/* Custom Workout Routine Builder & Mesocycle Manager for Health OS.
   Allows creating, editing, and executing fully customized workout programs and splits. */

(function(){
  const MASTER_EXERCISES = [
    { name: "Incline Dumbbell Press", category: "Chest", motion: "inclinedbpress", defaultSets: 3, defaultReps: "10–12", defaultRpe: "7–8", defaultRest: 90 },
    { name: "Flat Dumbbell Bench", category: "Chest", motion: "inclinedbpress", defaultSets: 3, defaultReps: "8–10", defaultRpe: "7–8", defaultRest: 90 },
    { name: "Cable Fly", category: "Chest", motion: "inclinedbpress", defaultSets: 3, defaultReps: "12–15", defaultRpe: "8", defaultRest: 60 },
    { name: "Lat Pulldown", category: "Back", motion: "latpulldown", defaultSets: 3, defaultReps: "10–12", defaultRpe: "7–8", defaultRest: 90 },
    { name: "Neutral Grip Lat Pulldown", category: "Back", motion: "latpulldown", defaultSets: 3, defaultReps: "10–12", defaultRpe: "7–8", defaultRest: 90 },
    { name: "Chest-Supported Row", category: "Back", motion: "latpulldown", defaultSets: 3, defaultReps: "10–12", defaultRpe: "7–8", defaultRest: 90 },
    { name: "Leg Press", category: "Quads", motion: "legpress", defaultSets: 3, defaultReps: "10–12", defaultRpe: "7–8", defaultRest: 90 },
    { name: "Bulgarian Split Squat", category: "Quads", motion: "legpress", defaultSets: 3, defaultReps: "8–10", defaultRpe: "8", defaultRest: 90 },
    { name: "Back Extension", category: "Posterior Chain", motion: "backextension", defaultSets: 3, defaultReps: "12–15", defaultRpe: "7", defaultRest: 60 },
    { name: "Hip Thrust Machine", category: "Glutes", motion: "backextension", defaultSets: 3, defaultReps: "10–12", defaultRpe: "7–8", defaultRest: 90 },
    { name: "Lying Leg Curl", category: "Hamstrings", motion: "legpress", defaultSets: 3, defaultReps: "10–12", defaultRpe: "8", defaultRest: 60 },
    { name: "Dumbbell Lateral Raise", category: "Shoulders", motion: "inclinedbpress", defaultSets: 3, defaultReps: "12–15", defaultRpe: "8", defaultRest: 60 },
    { name: "Cable Lateral Raise", category: "Shoulders", motion: "inclinedbpress", defaultSets: 3, defaultReps: "12–15", defaultRpe: "8", defaultRest: 60 },
    { name: "Face Pull", category: "Shoulders", motion: "latpulldown", defaultSets: 3, defaultReps: "15–20", defaultRpe: "8", defaultRest: 60 },
    { name: "Incline Dumbbell Curl", category: "Arms", motion: "latpulldown", defaultSets: 3, defaultReps: "10–12", defaultRpe: "8", defaultRest: 60 },
    { name: "Cable Tricep Pushdown", category: "Arms", motion: "inclinedbpress", defaultSets: 3, defaultReps: "10–12", defaultRpe: "8", defaultRest: 60 },
    { name: "Tricep Rope Extension", category: "Arms", motion: "inclinedbpress", defaultSets: 3, defaultReps: "12–15", defaultRpe: "8", defaultRest: 60 },
    { name: "Hanging Knee Raise", category: "Core", motion: "backextension", defaultSets: 3, defaultReps: "12–15", defaultRpe: "8", defaultRest: 60 }
  ];

  function getCustomRoutines(){
    if(!window.state) return [];
    if(!window.state.customRoutines){
      window.state.customRoutines = [
        {
          id: "custom-upper",
          title: "Upper Body Hypertrophy",
          emoji: "💪",
          description: "Chest, Lats, Side Delts, and Arms focus.",
          exercises: [
            { name: "Incline Dumbbell Press", sets: 3, prescription: "3 × 10–12", intensity: "RPE 7–8", rest: 90, motion: "inclinedbpress", category: "Chest" },
            { name: "Neutral Grip Lat Pulldown", sets: 3, prescription: "3 × 10–12", intensity: "RPE 7–8", rest: 90, motion: "latpulldown", category: "Back" },
            { name: "Dumbbell Lateral Raise", sets: 3, prescription: "3 × 12–15", intensity: "RPE 8", rest: 60, motion: "inclinedbpress", category: "Shoulders" },
            { name: "Incline Dumbbell Curl", sets: 3, prescription: "3 × 10–12", intensity: "RPE 8", rest: 60, motion: "latpulldown", category: "Arms" },
            { name: "Cable Tricep Pushdown", sets: 3, prescription: "3 × 10–12", intensity: "RPE 8", rest: 60, motion: "inclinedbpress", category: "Arms" }
          ]
        },
        {
          id: "custom-lower",
          title: "Lower Body & Glutes",
          emoji: "🦵",
          description: "Quads, Glutes, Hamstrings, and Core.",
          exercises: [
            { name: "Leg Press", sets: 3, prescription: "3 × 10–12", intensity: "RPE 7–8", rest: 90, motion: "legpress", category: "Quads" },
            { name: "Hip Thrust Machine", sets: 3, prescription: "3 × 10–12", intensity: "RPE 7–8", rest: 90, motion: "backextension", category: "Glutes" },
            { name: "Lying Leg Curl", sets: 3, prescription: "3 × 10–12", intensity: "RPE 8", rest: 60, motion: "legpress", category: "Hamstrings" },
            { name: "Hanging Knee Raise", sets: 3, prescription: "3 × 12–15", intensity: "RPE 8", rest: 60, motion: "backextension", category: "Core" }
          ]
        }
      ];
      if(window.persistDebounced) window.persistDebounced();
      else if(window.persist) window.persist();
    }
    return window.state.customRoutines;
  }

  function launchRoutine(routineId){
    const routines = getCustomRoutines();
    const routine = routines.find(r => r.id === routineId);
    if(!routine || !routine.exercises.length) return;

    // Register into sessions registry dynamically
    if(window.sessions){
      window.sessions[routine.id] = {
        name: routine.title,
        duration: `${routine.exercises.length * 8} min`,
        exercises: routine.exercises.map(ex => ({
          ...ex,
          setup: "Standard biomechanical setup with stable bracing.",
          execution: "Full active range of motion with 2-3s controlled eccentric.",
          cues: "Control the stretch; drive explosively with intent.",
          avoid: "Rushing the negative or bouncing out of the bottom."
        }))
      };
    }
    if(window.startSession){
      window.startSession(routine.id);
    }
  }

  function openRoutineBuilderModal(existingId = null){
    if(document.querySelector(".routine-builder-modal")) return;
    const ar = window.state?.lang === "ar";
    const routines = getCustomRoutines();
    const routine = existingId ? routines.find(r => r.id === existingId) : {
      id: `custom-${Date.now()}`,
      title: ar ? "روتين تدريب مخصص" : "Custom Workout Split",
      emoji: "⚡",
      description: ar ? "تمارين مخصصة للأهداف الشخصية" : "Custom targeted routine",
      exercises: [
        { name: "Incline Dumbbell Press", sets: 3, prescription: "3 × 10–12", intensity: "RPE 7–8", rest: 90, motion: "inclinedbpress", category: "Chest" },
        { name: "Lat Pulldown", sets: 3, prescription: "3 × 10–12", intensity: "RPE 7–8", rest: 90, motion: "latpulldown", category: "Back" }
      ]
    };

    let draft = JSON.parse(JSON.stringify(routine));

    const overlay = document.createElement("div");
    overlay.className = "timed-mode routine-builder-modal";
    
    function renderBuilderBody(){
      overlay.innerHTML = REP_SAFE_DOM.sanitize(`
        <div class="workout-preflight-panel" style="max-width:500px;margin:auto;max-height:90vh;overflow-y:auto;padding:16px;">
          <button class="dialog-close" data-builder-close aria-label="Close">×</button>
          <span class="set-log-kicker" style="color:var(--acid);">🛠️ ${ar?"محرر التمارين والروتين":"ROUTINE BUILDER"}</span>
          <h2 style="margin:4px 0 12px;">${existingId ? (ar?"تعديل الروتين":"Edit Routine") : (ar?"إنشاء روتين جديد":"New Custom Routine")}</h2>
          
          <div style="display:grid;grid-template-columns:50px 1fr;gap:8px;margin-bottom:12px;">
            <input data-routine-emoji type="text" value="${draft.emoji}" style="height:44px;text-align:center;font-size:20px;border:1px solid var(--line);border-radius:12px;background:#131715;color:var(--text);">
            <input data-routine-title type="text" value="${esc(draft.title)}" placeholder="${ar?"اسم الروتين":"Routine Title"}" style="height:44px;padding:0 12px;font-size:14px;font-weight:900;border:1px solid var(--line);border-radius:12px;background:#131715;color:var(--text);">
          </div>

          <div class="builder-exercise-list" style="display:grid;gap:8px;margin-bottom:14px;">
            ${draft.exercises.map((ex, i) => `
              <div class="builder-ex-row" style="background:var(--panel-2);padding:10px 12px;border-radius:14px;border:1px solid rgba(255,255,255,.06);display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:8px;">
                <div>
                  <strong style="display:block;font-size:13px;">${esc(ex.name)}</strong>
                  <small style="color:var(--muted);font-size:10px;">${ex.sets} sets · ${esc(ex.prescription)} · ${ex.rest}s rest</small>
                </div>
                <div style="display:flex;gap:4px;">
                  <button type="button" data-move-ex="${i}" data-dir="-1" style="width:28px;height:28px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--text);cursor:pointer;" ${i===0?"disabled":""}>↑</button>
                  <button type="button" data-move-ex="${i}" data-dir="1" style="width:28px;height:28px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--text);cursor:pointer;" ${i===draft.exercises.length-1?"disabled":""}>↓</button>
                </div>
                <button type="button" data-remove-ex="${i}" style="width:28px;height:28px;border:1px solid rgba(244,63,94,.3);border-radius:6px;background:rgba(244,63,94,.08);color:#f43f5e;cursor:pointer;">×</button>
              </div>
            `).join("")}
          </div>

          <div style="margin-bottom:14px;">
            <select data-add-ex-select style="width:100%;height:44px;padding:0 12px;border:1px solid var(--line);border-radius:12px;background:#131715;color:var(--text);font:inherit;font-size:13px;">
              <option value="">${ar?"+ أضف تمريناً من المكتبة…":"+ Add exercise from library…"}</option>
              ${MASTER_EXERCISES.map(m => `<option value="${m.name}">${m.name} (${m.category})</option>`).join("")}
            </select>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <button class="settings-primary" data-save-routine style="background:var(--acid);color:var(--acid-ink);">
              ✓ ${ar?"حفظ الروتين":"Save Routine"}
            </button>
            <button class="settings-primary" data-builder-cancel style="background:var(--panel-2);color:var(--text);border:1px solid var(--line);">
              ${ar?"إلغاء":"Cancel"}
            </button>
          </div>
        </div>
      `);
      bindEvents();
    }

    function bindEvents(){
      overlay.querySelector("[data-builder-close]").onclick = () => overlay.remove();
      overlay.querySelector("[data-builder-cancel]").onclick = () => overlay.remove();
      
      overlay.querySelector("[data-add-ex-select]").onchange = e => {
        const name = e.target.value;
        if(!name) return;
        const master = MASTER_EXERCISES.find(m => m.name === name);
        if(master){
          draft.exercises.push({
            name: master.name,
            sets: master.defaultSets,
            prescription: `${master.defaultSets} × ${master.defaultReps}`,
            intensity: `RPE ${master.defaultRpe}`,
            rest: master.defaultRest,
            motion: master.motion,
            category: master.category
          });
          renderBuilderBody();
        }
      };

      overlay.querySelectorAll("[data-remove-ex]").forEach(btn => {
        btn.onclick = () => {
          const idx = Number(btn.dataset.removeEx);
          draft.exercises.splice(idx, 1);
          renderBuilderBody();
        };
      });

      overlay.querySelectorAll("[data-move-ex]").forEach(btn => {
        btn.onclick = () => {
          const idx = Number(btn.dataset.moveEx);
          const dir = Number(btn.dataset.dir);
          const target = idx + dir;
          if(target >= 0 && target < draft.exercises.length){
            const tmp = draft.exercises[idx];
            draft.exercises[idx] = draft.exercises[target];
            draft.exercises[target] = tmp;
            renderBuilderBody();
          }
        };
      });

      overlay.querySelector("[data-save-routine]").onclick = () => {
        const titleInput = overlay.querySelector("[data-routine-title]");
        const emojiInput = overlay.querySelector("[data-routine-emoji]");
        draft.title = titleInput.value.trim() || draft.title;
        draft.emoji = emojiInput.value.trim() || draft.emoji;

        const routines = getCustomRoutines();
        const existingIdx = routines.findIndex(r => r.id === draft.id);
        if(existingIdx >= 0){
          routines[existingIdx] = draft;
        } else {
          routines.push(draft);
        }
        window.state.customRoutines = routines;
        if(window.persist) window.persist();
        overlay.remove();
        if(window.showToast) window.showToast(ar ? "تم حفظ الروتين بنجاح." : "Custom routine saved.");
        if(window.renderHome && window.state.view === "home") window.renderHome();
      };
    }

    renderBuilderBody();
    document.body.appendChild(overlay);
  }

  function renderRoutinesSection(ar){
    const routines = getCustomRoutines();
    return `
      <section class="custom-routines-section" style="margin:16px 0;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <div>
            <span class="set-log-kicker">⚡ ${ar?"برامج وتدريبات مخصصة":"CUSTOM ROUTINES & SPLITS"}</span>
            <h2 style="margin:2px 0 0;font-size:17px;font-weight:900;">${ar?"جداولك التدريبية":"Your Workout Programs"}</h2>
          </div>
          <button class="settings-primary" data-create-new-routine style="padding:6px 12px;font-size:11px;background:rgba(201,255,61,.1);border:1px solid rgba(201,255,61,.3);color:var(--acid);">
            + ${ar?"روتين جديد":"New Routine"}
          </button>
        </div>

        <div style="display:grid;gap:8px;">
          ${routines.map(r => `
            <div class="custom-routine-card" style="background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;gap:10px;">
              <div style="display:flex;align-items:center;gap:10px;">
                <span style="font-size:24px;">${r.emoji || "⚡"}</span>
                <div>
                  <strong style="display:block;font-size:14px;font-weight:900;">${esc(r.title)}</strong>
                  <small style="color:var(--muted);font-size:11px;">${r.exercises.length} ${ar?"تمارين":"exercises"} · ${esc(r.description || "")}</small>
                </div>
              </div>
              <div style="display:flex;gap:6px;">
                <button class="settings-primary" data-launch-custom="${r.id}" style="padding:8px 14px;font-size:12px;font-weight:900;background:var(--acid);color:var(--acid-ink);">
                  ${ar?"بدء":"Start"} ▶
                </button>
                <button class="quiet-setting" data-edit-custom="${r.id}" style="padding:8px 10px;font-size:12px;border:1px solid var(--line);border-radius:10px;">
                  ✏️
                </button>
              </div>
            </div>
          `).join("")}
        </div>
      </section>
    `;
  }

  function esc(s){ return String(s||"").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

  window.REP_CUSTOM_WORKOUTS = {
    getCustomRoutines,
    launchRoutine,
    openRoutineBuilderModal,
    renderRoutinesSection,
    MASTER_EXERCISES
  };
})();
