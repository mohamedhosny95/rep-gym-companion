(function(){
  const MUSCLE_GROUPS = {
    chest: { en: "Chest", ar: "الصدر", motions: ["chestpress", "pushup", "bench"] },
    lats: { en: "Back & Lats", ar: "الظهر والمجنص", motions: ["pulldown", "row", "pullup"] },
    quads: { en: "Quadriceps", ar: "عضلات الفخذ الأمامية", motions: ["legpress", "squat", "lunge"] },
    hamstrings: { en: "Hamstrings", ar: "عضلات الفخذ الخلفية", motions: ["hinge", "rdl", "legcurl"] },
    glutes: { en: "Glutes", ar: "عضلات الألوية", motions: ["floor", "hipthrust", "hinge"] },
    delts: { en: "Shoulders", ar: "الأكتاف", motions: ["shoulderpress", "lateralraise", "chestpress"] },
    arms: { en: "Arms", ar: "الذراعين", motions: ["pulldown", "row", "chestpress"] },
    core: { en: "Core", ar: "عضلات البطن والجذع", motions: ["birddog", "plank", "cardio"] }
  };

  const SPORT_FATIGUE = {
    football: {
      muscles: { quads: 1.2, hamstrings: 1.4, glutes: 1.0, core: 0.8 },
      baseSets: 4
    },
    padel: {
      muscles: { quads: 1.0, delts: 1.2, arms: 1.0, core: 0.9 },
      baseSets: 4
    },
    basketball: {
      muscles: { quads: 1.2, hamstrings: 1.0, glutes: 0.9, delts: 0.7 },
      baseSets: 4
    },
    swimming: {
      muscles: { lats: 1.4, delts: 1.2, core: 0.9, arms: 1.0 },
      baseSets: 4
    },
    cycling: {
      muscles: { quads: 1.5, glutes: 1.0, hamstrings: 0.8 },
      baseSets: 4
    },
    tennis: {
      muscles: { delts: 1.2, arms: 1.0, quads: 1.0, core: 0.9 },
      baseSets: 4
    }
  };

  function computeMuscleReadiness(history = []){
    const now = Date.now();
    const readiness = {};
    
    Object.keys(MUSCLE_GROUPS).forEach(key => {
      readiness[key] = {
        nameEn: MUSCLE_GROUPS[key].en,
        nameAr: MUSCLE_GROUPS[key].ar,
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

      // 1. Structured Strength / Gym Sets
      Object.entries(sessionLoads).forEach(([exName, log]) => {
        const setsCount = Array.isArray(log?.sets) ? log.sets.filter(s => Number(s.reps) > 0).length : (log?.current ? 3 : 0);
        if (setsCount <= 0) return;

        const lowerName = exName.toLowerCase().replace(/[\s\-_]+/g, "");
        Object.entries(MUSCLE_GROUPS).forEach(([groupKey, group]) => {
          const matches = group.motions.some(m => {
            const normM = m.toLowerCase().replace(/[\s\-_]+/g, "");
            return lowerName.includes(normM) || exName.toLowerCase().includes(m);
          });
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

      // 2. Unstructured Sports & Field Activities (Football, Padel, etc.)
      const sportKey = session.activityType || (session.session === "activity" ? (session.activityLabel?.toLowerCase() || "") : "");
      const sportDef = SPORT_FATIGUE[sportKey] || (sportKey.includes("football") ? SPORT_FATIGUE.football : (sportKey.includes("padel") ? SPORT_FATIGUE.padel : null));
      if (sportDef) {
        const durationMins = Math.round((session.duration || 3600) / 60);
        const durationFactor = Math.max(0.5, Math.min(2.5, durationMins / 60));
        Object.entries(sportDef.muscles).forEach(([groupKey, multiplier]) => {
          if (readiness[groupKey]) {
            const equivSets = Math.round(sportDef.baseSets * durationFactor * multiplier);
            readiness[groupKey].totalSets72h += equivSets;
            if (readiness[groupKey].lastTrainedHours === null || hoursAgo < readiness[groupKey].lastTrainedHours) {
              readiness[groupKey].lastTrainedHours = Math.round(hoursAgo);
            }
            const fatigue = equivSets * Math.exp(-hoursAgo / 32);
            readiness[groupKey].score = Math.max(20, Math.round(readiness[groupKey].score - fatigue * 9));
          }
        });
      }
    });

    return readiness;
  }

  function getStatusColor(score){
    if (score >= 85) return "var(--acid)";
    if (score >= 60) return "var(--blue)";
    return "var(--orange)";
  }

  function esc(s){ return String(s||"").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

  function renderRecoveryMap(state){
    const ar = state.lang === "ar";
    const data = computeMuscleReadiness(state.history || []);
    
    return `<section class="recovery-map-card">
      <div class="recovery-map-head">
        <div>
          <small class="set-log-kicker">${ar ? "خريطة الاستشفاء العضلي" : "ANATOMICAL RECOVERY MAP"}</small>
          <h2>${ar ? "جاهزية واستشفاء العضلات (72 ساعة)" : "Muscle Readiness & Fatigue"}</h2>
        </div>
        <span class="recovery-auto-tag">${ar ? "تحديث تلقائي" : "Auto-computed"}</span>
      </div>
      
      <div class="recovery-map-grid">
        ${Object.entries(data).map(([key, m]) => {
          const col = getStatusColor(m.score);
          const statusClass = m.score >= 85 ? "is-fresh" : (m.score >= 60 ? "is-recovering" : "is-fatigued");
          const statusText = m.score >= 85 ? (ar ? "جاهز 100%" : "Fresh") : (m.score >= 60 ? (ar ? "استشفاء جيد" : "Recovering") : (ar ? "مجهد" : "Fatigued"));
          return `<div class="muscle-recovery-item ${statusClass}">
            <div class="muscle-recovery-row">
              <strong>${esc(ar ? m.nameAr : m.nameEn)}</strong>
              <span class="muscle-recovery-score" style="color:${col};">${m.score}%</span>
            </div>
            <div class="muscle-recovery-track">
              <div class="muscle-recovery-fill" style="width:${m.score}%;background:${col};"></div>
            </div>
            <div class="muscle-recovery-meta">
              <span class="muscle-recovery-badge" style="color:${col};">${statusText}</span>
              ${m.lastTrainedHours !== null ? `<small>${m.lastTrainedHours}h ${ar ? "مضت" : "ago"}</small>` : ""}
            </div>
          </div>`;
        }).join("")}
      </div>
    </section>`;
  }

  const root = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this;
  root.REP_RECOVERY_MAP = {
    computeMuscleReadiness,
    renderRecoveryMap
  };
})();
