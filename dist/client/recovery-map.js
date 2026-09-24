(function(){
  const MUSCLE_GROUPS = {
    chest: { en: "Chest", motions: ["chestpress", "pushup", "bench", "chestfly", "cablefly", "floorpress"] },
    lats: { en: "Back & Lats", motions: ["pulldown", "row", "pullup", "backextension", "birddog"] },
    quads: { en: "Quadriceps", motions: ["legpress", "squat", "lunge", "stepup"] },
    hamstrings: { en: "Hamstrings", motions: ["hinge", "rdl", "legcurl", "backextension", "hipthrust", "glutebridge"] },
    glutes: { en: "Glutes", motions: ["hipthrust", "hinge", "glutebridge", "backextension", "legpress", "squat", "lunge"] },
    delts: { en: "Shoulders", motions: ["shoulderpress", "lateralraise", "chestpress", "floorpress", "facepull"] },
    arms: { en: "Arms", motions: ["pulldown", "row", "chestpress", "floorpress", "curl", "tricep", "pushdown", "handgrip"] },
    core: { en: "Core", motions: ["birddog", "plank", "kneeraise", "crunch", "deadbug"] }
  };

  function computeMuscleReadiness(history = []){
    const now = Date.now();
    const readiness = {};
    
    Object.keys(MUSCLE_GROUPS).forEach(key => {
      readiness[key] = {
        nameEn: MUSCLE_GROUPS[key].en,
        score: null,
        totalSets72h: 0,
        lastTrainedHours: null
      };
    });

    const recentSessions = (history || []).filter(h => {
      const time = new Date(h.date || h.completedAt || 0).getTime();
      return Number.isFinite(time) && time <= now && now - time <= 72 * 3600 * 1000;
    });

    recentSessions.forEach(session => {
      const time = new Date(session.date || session.completedAt || 0).getTime();
      const hoursAgo = Math.max(1, (now - time) / (3600 * 1000));
      const completedSets = {};
      if(Array.isArray(session.entries)){
        for(const entry of session.entries){
          if(Number(entry?.reps)>0 && entry.exercise)completedSets[entry.exercise]=(completedSets[entry.exercise]||0)+1;
        }
      }else{
        // Older imports may have only loads; newer records have explicit completed entries.
        for(const [name,log] of Object.entries(session.loads||{})){
          const sets=Array.isArray(log?.sets)?log.sets:(log?.current?[log.current]:[]);
          completedSets[name]=sets.filter(set=>Number(set?.reps)>0).length;
        }
      }

      Object.entries(completedSets).forEach(([exName, setsCount]) => {
        if (setsCount <= 0) return;

        const normalizedName = exName.toLowerCase().replace(/[^a-z0-9]/g, "");
        Object.entries(MUSCLE_GROUPS).forEach(([groupKey, group]) => {
          const matches = group.motions.some(m => normalizedName.includes(m));
          if (matches) {
            readiness[groupKey].totalSets72h += setsCount;
            if (readiness[groupKey].lastTrainedHours === null || hoursAgo < readiness[groupKey].lastTrainedHours) {
              readiness[groupKey].lastTrainedHours = Math.round(hoursAgo);
            }
            const fatigue = setsCount * Math.exp(-hoursAgo / 32);
            readiness[groupKey].score = Math.max(20, Math.round((readiness[groupKey].score??100) - fatigue * 9));
          }
        });
      });
    });

    return readiness;
  }

  function getStatusColor(score){
    if(score===null) return "var(--muted)";
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
          <h2 style="font-size:17px;margin:4px 0 0;">${ "Recent Muscle Load"}</h2>
        </div>
        <span style="font-size:11px;font-weight:800;color:var(--muted);">${ "Logged sets · 72h"}</span>
      </div>
      
      <div class="recovery-map-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-top:10px;">
        ${Object.entries(data).map(([, m]) => {
          const col = getStatusColor(m.score);
          const statusText = m.score===null ? "No recent logged sets" : m.score >= 85 ? "Low recent load" : m.score >= 60 ? "Moderate recent load" : "High recent load";
          return `<div class="muscle-recovery-item" style="padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:#0c100d;display:flex;flex-direction:column;gap:3px;">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <strong style="font-size:12px;">${esc( m.nameEn)}</strong>
              <span style="font-size:11px;font-weight:900;color:${col};">${m.score===null?"—":`${m.totalSets72h} sets`}</span>
            </div>
            <div style="height:4px;width:100%;border-radius:2px;background:rgba(255,255,255,.08);overflow:hidden;margin:4px 0 2px;">
              <div style="height:100%;width:${m.score===null?0:100-m.score}%;background:${col};border-radius:2px;"></div>
            </div>
            <small style="font-size:10px;color:var(--muted);">${statusText}${m.lastTrainedHours !== null ? ` · ${m.lastTrainedHours}h ${ "ago"}` : ""}</small>
          </div>`;
        }).join("")}
      </div>
      <small style="display:block;margin-top:10px;color:var(--muted);">Based on logged sets and time, not a measurement of muscle recovery. Pain and symptoms take priority.</small>
    </section>`;
  }

  window.REP_RECOVERY_MAP = {
    computeMuscleReadiness,
    renderRecoveryMap
  };
})();
