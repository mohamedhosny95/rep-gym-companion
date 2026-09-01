/* Muscle Fatigue & Weekly Hypertrophy Volume Heatmap for Health OS.
   Analyzes 7-day training sets against scientific hypertrophy landmarks (MEV, MAV, MRV). */

(function(){
  const MUSCLE_MAP = {
    "Incline Dumbbell Press": { primary: ["Chest", "Front Delts"], secondary: ["Triceps"] },
    "Flat Dumbbell Bench": { primary: ["Chest"], secondary: ["Front Delts", "Triceps"] },
    "Cable Fly": { primary: ["Chest"], secondary: [] },
    "Lat Pulldown": { primary: ["Lats"], secondary: ["Biceps", "Rear Delts"] },
    "Neutral Grip Lat Pulldown": { primary: ["Lats"], secondary: ["Biceps"] },
    "Chest-Supported Row": { primary: ["Upper Back", "Lats"], secondary: ["Biceps", "Rear Delts"] },
    "Leg Press": { primary: ["Quads"], secondary: ["Glutes"] },
    "Bulgarian Split Squat": { primary: ["Quads", "Glutes"], secondary: ["Hamstrings"] },
    "Back Extension": { primary: ["Lower Back", "Hamstrings"], secondary: ["Glutes"] },
    "Hip Thrust Machine": { primary: ["Glutes"], secondary: ["Hamstrings"] },
    "Hip Thrust": { primary: ["Glutes"], secondary: ["Hamstrings"] },
    "Lying Leg Curl": { primary: ["Hamstrings"], secondary: ["Calves"] },
    "Dumbbell Lateral Raise": { primary: ["Side Delts"], secondary: [] },
    "Cable Lateral Raise": { primary: ["Side Delts"], secondary: [] },
    "Face Pull": { primary: ["Rear Delts", "Upper Back"], secondary: [] },
    "Incline Dumbbell Curl": { primary: ["Biceps"], secondary: ["Forearms"] },
    "Cable Tricep Pushdown": { primary: ["Triceps"], secondary: [] },
    "Tricep Rope Extension": { primary: ["Triceps"], secondary: [] },
    "Hanging Knee Raise": { primary: ["Core"], secondary: [] },
    "Plank": { primary: ["Core"], secondary: [] }
  };

  const LANDMARKS = {
    "Chest": { mev: 8, mav: 14, mrv: 22 },
    "Lats": { mev: 8, mav: 16, mrv: 22 },
    "Upper Back": { mev: 6, mav: 14, mrv: 20 },
    "Lower Back": { mev: 4, mav: 8, mrv: 14 },
    "Quads": { mev: 6, mav: 14, mrv: 20 },
    "Hamstrings": { mev: 6, mav: 12, mrv: 18 },
    "Glutes": { mev: 4, mav: 12, mrv: 18 },
    "Side Delts": { mev: 8, mav: 16, mrv: 26 },
    "Rear Delts": { mev: 6, mav: 14, mrv: 22 },
    "Front Delts": { mev: 0, mav: 6, mrv: 12 }, // Gets hit by pressing
    "Biceps": { mev: 6, mav: 14, mrv: 20 },
    "Triceps": { mev: 6, mav: 12, mrv: 18 },
    "Core": { mev: 4, mav: 10, mrv: 16 }
  };

  function computeWeeklyVolumes(history = []){
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 86400000;
    const recentSessions = history.filter(h => new Date(h.date).getTime() >= sevenDaysAgo);

    const volumes = {};
    Object.keys(LANDMARKS).forEach(m => {
      volumes[m] = { sets: 0, exercises: {} };
    });

    recentSessions.forEach(session => {
      const loads = session.loads || {};
      Object.entries(loads).forEach(([exName, log]) => {
        const rawSets = Array.isArray(log) ? log : (log.sets || []);
        const validSets = rawSets.filter(s => Number(s.reps) > 0 || Number(s.weight) > 0).length;
        if(validSets > 0){
          const mapping = MUSCLE_MAP[exName] || { primary: ["Quads"], secondary: [] };
          mapping.primary.forEach(m => {
            if(volumes[m]){
              volumes[m].sets += validSets;
              volumes[m].exercises[exName] = (volumes[m].exercises[exName] || 0) + validSets;
            }
          });
          mapping.secondary.forEach(m => {
            if(volumes[m]){
              volumes[m].sets += Math.round(validSets * 0.5 * 10) / 10;
              volumes[m].exercises[exName] = (volumes[m].exercises[exName] || 0) + validSets;
            }
          });
        }
      });
    });

    return volumes;
  }

  function getVolumeStatus(muscle, sets){
    const lm = LANDMARKS[muscle] || { mev: 6, mav: 14, mrv: 20 };
    if(sets === 0) return { status: "none", label: "No Sets Logged", color: "var(--muted)", score: 0 };
    if(sets < lm.mev) return { status: "under", label: "Under-stimulated (< MEV)", color: "#38bdf8", score: 40 };
    if(sets <= lm.mav) return { status: "optimal", label: "Optimal Hypertrophy (MAV)", color: "var(--acid)", score: 100 };
    if(sets <= lm.mrv) return { status: "high", label: "High Volume (Near MRV)", color: "#fb923c", score: 85 };
    return { status: "over", label: "Over-reaching (> MRV)", color: "#f43f5e", score: 60 };
  }

  function renderHeatmapCard(state){
    const volumes = computeWeeklyVolumes(state.history || []);
    const muscles = ["Chest", "Lats", "Quads", "Hamstrings", "Side Delts", "Biceps", "Triceps", "Glutes", "Lower Back"];

    return `
      <section class="settings-card muscle-heatmap-card" style="padding:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <div>
            <span class="set-log-kicker">🔥 ${"WEEKLY HYPERTROPHY VOLUME"}</span>
            <h2 style="margin:2px 0 0;font-size:16px;">${"Muscle Fatigue & Volume Balance"}</h2>
          </div>
          <span style="font-size:11px;color:var(--muted);">${"Last 7 days"}</span>
        </div>

        <div class="muscle-grid-bars" style="display:grid;gap:8px;">
          ${muscles.map(m => {
            const v = volumes[m] || { sets: 0, exercises: {} };
            const lm = LANDMARKS[m] || { mev: 6, mav: 14, mrv: 20 };
            const status = getVolumeStatus(m, v.sets);
            const pct = Math.min(100, Math.round((v.sets / lm.mrv) * 100));
            return `
              <div class="muscle-vol-row" style="background:var(--panel-2);padding:8px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.05);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;font-size:12px;">
                  <strong>${m}</strong>
                  <span style="color:${status.color};font-weight:900;">${v.sets} ${"sets"} <small style="color:var(--muted);font-weight:normal;">/ ${lm.mav} ${"opt"}</small></span>
                </div>
                <div style="height:6px;background:rgba(255,255,255,.06);border-radius:999px;overflow:hidden;">
                  <div style="width:${pct}%;height:100%;background:${status.color};border-radius:999px;transition:width .3s ease;"></div>
                </div>
              </div>
            `;
          }).join("")}
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,.06);font-size:10px;color:var(--muted);">
          <span style="color:#38bdf8;">● ${"< MEV"}</span>
          <span style="color:var(--acid);font-weight:900;">● ${"MAV (Optimal)"}</span>
          <span style="color:#fb923c;">● ${"Near MRV"}</span>
          <span style="color:#f43f5e;">● ${"> MRV"}</span>
        </div>
      </section>
    `;
  }

  window.REP_MUSCLE_HEATMAP = {
    computeWeeklyVolumes,
    getVolumeStatus,
    renderHeatmapCard,
    LANDMARKS,
    MUSCLE_MAP
  };
})();
