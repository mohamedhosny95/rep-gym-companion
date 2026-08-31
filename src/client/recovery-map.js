(function(){
  const MUSCLE_GROUPS = {
    chest: { en: "Chest", motions: ["chestpress", "pushup", "bench"] },
    lats: { en: "Back & Lats", motions: ["pulldown", "row", "pullup"] },
    quads: { en: "Quadriceps", motions: ["legpress", "squat", "lunge"] },
    hamstrings: { en: "Hamstrings", motions: ["hinge", "rdl", "legcurl"] },
    glutes: { en: "Glutes", motions: ["floor", "hipthrust", "hinge"] },
    delts: { en: "Shoulders", motions: ["shoulderpress", "lateralraise", "chestpress"] },
    arms: { en: "Arms", motions: ["pulldown", "row", "chestpress"] },
    core: { en: "Core", motions: ["birddog", "plank", "cardio"] }
  };

  function computeMuscleReadiness(history = []){
    const now = Date.now();
    const readiness = {};
    
    Object.keys(MUSCLE_GROUPS).forEach(key => {
      readiness[key] = {
        nameEn: MUSCLE_GROUPS[key].en,
        score: 100,
        totalSets72h: 0,
        lastTrainedHours: null
      };
    });

    const recentSessions = (history || []).filter(h => {
      const time = new Date(h.date || h.completedAt || 0).getTime();
      return now - time <= 72 * 3600 * 1000;
    });

    recentSessions.forEach(session => {
      const time = new Date(session.date || session.completedAt || 0).getTime();
      const hoursAgo = Math.max(1, (now - time) / (3600 * 1000));
      const sessionLoads = session.loads || {};

      Object.entries(sessionLoads).forEach(([exName, log]) => {
        const setsCount = Array.isArray(log?.sets) ? log.sets.filter(s => Number(s.reps) > 0).length : (log?.current ? 3 : 0);
        if (setsCount <= 0) return;

        const lowerName = exName.toLowerCase();
        Object.entries(MUSCLE_GROUPS).forEach(([groupKey, group]) => {
          const matches = group.motions.some(m => lowerName.includes(m) || exName.includes(m));
          if (matches) {
            readiness[groupKey].totalSets72h += setsCount;
            if (readiness[groupKey].lastTrainedHours === null || hoursAgo < readiness[groupKey].lastTrainedHours) {
              readiness[groupKey].lastTrainedHours = Math.round(hoursAgo);
            }
            const fatigue = setsCount * Math.exp(-hoursAgo / 32);
            readiness[groupKey].score = Math.max(20, Math.round(readiness[groupKey].score - fatigue * 9));
          }
        });
      });
    });

    return readiness;
  }

  function getStatusColor(score){
    if (score >= 85) return "var(--acid)";
    if (score >= 60) return "var(--blue)";
    return "var(--orange)";
  }

  function renderRecoveryMap(state){
    const data = computeMuscleReadiness(state.history || []);
    
    return `<section class="recovery-map-card" style="margin-bottom:18px;padding:16px;border:1px solid var(--line);border-radius:20px;background:var(--panel);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <div>
          <small style="color:var(--acid);font-weight:900;letter-spacing:.08em;font-size:10px;">${ "ANATOMICAL RECOVERY MAP"}</small>
          <h2 style="font-size:17px;margin:4px 0 0;">${ "Muscle Readiness & Fatigue"}</h2>
        </div>
        <span style="font-size:11px;font-weight:800;color:var(--muted);">${ "Auto-computed"}</span>
      </div>
      
      <div class="recovery-map-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-top:10px;">
        ${Object.entries(data).map(([, m]) => {
          const col = getStatusColor(m.score);
          const statusText = m.score >= 85 ? ( "Fresh") : (m.score >= 60 ? ( "Recovering") : ( "Fatigued"));
          return `<div class="muscle-recovery-item" style="padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:#0c100d;display:flex;flex-direction:column;gap:3px;">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <strong style="font-size:12px;">${esc( m.nameEn)}</strong>
              <span style="font-size:11px;font-weight:900;color:${col};">${m.score}%</span>
            </div>
            <div style="height:4px;width:100%;border-radius:2px;background:rgba(255,255,255,.08);overflow:hidden;margin:4px 0 2px;">
              <div style="height:100%;width:${m.score}%;background:${col};border-radius:2px;"></div>
            </div>
            <small style="font-size:10px;color:var(--muted);">${statusText}${m.lastTrainedHours !== null ? ` · ${m.lastTrainedHours}h ${ "ago"}` : ""}</small>
          </div>`;
        }).join("")}
      </div>
    </section>`;
  }

  window.REP_RECOVERY_MAP = {
    computeMuscleReadiness,
    renderRecoveryMap
  };
})();
