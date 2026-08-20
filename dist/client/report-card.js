/* Mesocycle & Athlete Report Card Generator for Rep Gym Companion.
   Generates a standalone, print-optimized document ready for PDF export or sharing with coaches. */

(function(){
  function generateReportHtml(state){
    const ar = state.lang === "ar";
    const insights = window.REP_PERFORMANCE_INSIGHTS?.aggregate(state) || {};
    const strengthData = insights.strength || {};
    const nutritionData = insights.nutrition || {};
    const heatmap = insights.muscleVolume || {};
    const experiments = insights.experiments || [];
    const dateStr = new Date().toLocaleDateString(ar ? "ar-EG" : "en-US", { year: "numeric", month: "long", day: "numeric" });

    return `<!DOCTYPE html>
<html lang="${state.lang}" dir="${ar?"rtl":"ltr"}">
<head>
  <meta charset="utf-8">
  <title>Rep Mesocycle Report Card - ${dateStr}</title>
  <style>
    :root {
      --bg: #ffffff;
      --text: #0f172a;
      --muted: #64748b;
      --line: #e2e8f0;
      --card-bg: #f8fafc;
      --accent: #15803d;
      --blue: #0284c7;
      --orange: #ea580c;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 32px;
      max-width: 900px;
      margin: 0 auto;
      line-height: 1.5;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      border-bottom: 2px solid var(--text);
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    header h1 { font-size: 24px; font-weight: 900; letter-spacing: -0.02em; }
    header span { font-size: 13px; color: var(--muted); font-weight: 600; }
    .report-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-bottom: 24px;
    }
    .report-card {
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 16px;
      background: var(--card-bg);
      page-break-inside: avoid;
    }
    .report-card.full-width { grid-column: 1 / -1; }
    .report-card h2 {
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--muted);
      margin-bottom: 12px;
      border-bottom: 1px solid var(--line);
      padding-bottom: 6px;
    }
    .stat-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 13px;
      border-bottom: 1px dashed var(--line);
    }
    .stat-row:last-child { border-bottom: none; }
    .stat-row strong { font-weight: 700; color: var(--text); }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
    th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--line); }
    [dir="rtl"] th, [dir="rtl"] td { text-align: right; }
    th { font-weight: 800; color: var(--muted); background: rgba(0,0,0,0.02); }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; }
    .badge-optimal { background: #dcfce7; color: #166534; }
    .badge-high { background: #fee2e2; color: #991b1b; }
    .badge-recovered { background: #f1f5f9; color: #475569; }
    .print-actions {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
    }
    .print-btn {
      background: #0f172a;
      color: #ffffff;
      border: none;
      padding: 10px 18px;
      border-radius: 8px;
      font-weight: 700;
      cursor: pointer;
    }
    @media print {
      body { padding: 0; }
      .print-actions { display: none; }
      .report-card { border-color: #cbd5e1; }
    }
  </style>
</head>
<body>
  <div class="print-actions">
    <button class="print-btn" onclick="window.print()">${ar?"🖨️ طباعة / حفظ كـ PDF":"🖨️ Print / Save as PDF"}</button>
    <button class="print-btn" style="background:#64748b;" onclick="window.close()">${ar?"إغلاق":"Close"}</button>
  </div>
  <header>
    <div>
      <h1>Rep Gym Companion</h1>
      <p style="font-size:13px;color:var(--muted);">${ar?"تقرير دورة التدريب والتغذية الشامل (Mesocycle Summary)":"Comprehensive Mesocycle & Athlete Performance Card"}</p>
    </div>
    <span>${dateStr}</span>
  </header>

  <div class="report-grid">
    <section class="report-card">
      <h2>${ar?"ملخص حمل التدريب (7 أيام)":"7-Day Training Load"}</h2>
      <div class="stat-row"><span>${ar?"إجمالي الحجم التدريبي":"Total Volume"}</span><strong>${Math.round(strengthData.totalVolume||0).toLocaleString()} kg</strong></div>
      <div class="stat-row"><span>${ar?"الحصص المسجلة":"Logged Sessions"}</span><strong>${strengthData.rows ? new Set(strengthData.rows.map(r=>r.sessionId)).size : 0}</strong></div>
      <div class="stat-row"><span>${ar?"الأرقام القياسية الحديثة":"Recent PRs"}</span><strong>${strengthData.prs?.length || 0}</strong></div>
      <div class="stat-row"><span>${ar?"إشارات الثبات":"Plateau Flags"}</span><strong>${strengthData.plateaus?.length || 0}</strong></div>
    </section>

    <section class="report-card">
      <h2>${ar?"التغذية والوزن":"Nutrition & Body Metrics"}</h2>
      <div class="stat-row"><span>${ar?"التزام السعرات (7 أيام)":"Caloric Adherence"}</span><strong>${Math.round(nutritionData.adherence7?.calories||0)}%</strong></div>
      <div class="stat-row"><span>${ar?"التزام البروتين (7 أيام)":"Protein Adherence"}</span><strong>${Math.round(nutritionData.adherence7?.protein||0)}%</strong></div>
      <div class="stat-row"><span>${ar?"اتجاه الوزن الأسبوعي":"Weekly Weight Slope"}</span><strong>${nutritionData.weightSlopePerWeek ? `${nutritionData.weightSlopePerWeek} kg/wk` : "—"}</strong></div>
      <div class="stat-row"><span>${ar?"السعرات المقدرة للصيانة":"Est. Maintenance"}</span><strong>${nutritionData.maintenance ? `${nutritionData.maintenance.low}–${nutritionData.maintenance.high} kcal` : "—"}</strong></div>
    </section>

    <section class="report-card full-width">
      <h2>${ar?"تحليلات القوة وأقصى حمل تقديري (e1RM)":"Top Lift Progression & Estimated 1RM"}</h2>
      <table>
        <thead>
          <tr>
            <th>${ar?"التمرين":"Exercise"}</th>
            <th>${ar?"الحصص":"Sessions"}</th>
            <th>${ar?"أفضل e1RM":"Best e1RM"}</th>
            <th>${ar?"التغير خلال 28 يوماً":"28-Day Change"}</th>
            <th>${ar?"التوصية":"Progression Advice"}</th>
          </tr>
        </thead>
        <tbody>
          ${(strengthData.exercises||[]).slice(0, 8).map(e => `
            <tr>
              <td><strong>${e.exercise}</strong></td>
              <td>${e.sessionCount}</td>
              <td><b>${e.currentE1rm} kg</b></td>
              <td>${e.change28d !== null ? `${e.change28d > 0 ? "+" : ""}${e.change28d}%` : "—"}</td>
              <td>${e.plateau ? (ar?"ثبات · خفف الحمل":"Plateau · Deload") : (e.recommendation === "progress" ? (ar?"تقدم بأمان":"Micro-load Ready") : (ar?"ثبّت وبناء":"Hold & Build"))}</td>
            </tr>
          `).join("") || `<tr><td colspan="5" style="text-align:center;">${ar?"لا توجد بيانات كافية":"No lift data available"}</td></tr>`}
        </tbody>
      </table>
    </section>

    <section class="report-card full-width">
      <h2>${ar?"حجم وتحفيز المجموعات العضلية (MEV/MRV)":"Weekly Muscle Stimulus & Volume Distribution"}</h2>
      <table>
        <thead>
          <tr>
            <th>${ar?"المجموعة العضلية":"Muscle Group"}</th>
            <th>${ar?"المجموعات الجادة":"Hard Sets"}</th>
            <th>${ar?"حجم الرفع":"Volume Load"}</th>
            <th>${ar?"حالة الاستشفاء والتحفيز":"Stimulus Status"}</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(heatmap).map(([muscle, d]) => `
            <tr>
              <td><strong>${muscle}</strong></td>
              <td>${d.sets} sets</td>
              <td>${d.volumeKg.toLocaleString()} kg</td>
              <td><span class="badge badge-${d.status}">${d.statusLabel}</span></td>
            </tr>
          `).join("") || `<tr><td colspan="4" style="text-align:center;">${ar?"لا توجد بيانات":"No volume data available"}</td></tr>`}
        </tbody>
      </table>
    </section>

    ${experiments.length ? `
      <section class="report-card full-width">
        <h2>${ar?"تجارب الارتباط الشخصية":"Personal Health & Training Associations"}</h2>
        <table>
          <thead>
            <tr>
              <th>${ar?"الفرضية والملاحظة":"Observation"}</th>
              <th>${ar?"المجموعة الأولى":"Group A"}</th>
              <th>${ar?"المجموعة الثانية":"Group B"}</th>
              <th>${ar?"الفارق":"Delta"}</th>
            </tr>
          </thead>
          <tbody>
            ${experiments.map(exp => `
              <tr>
                <td><strong>${exp.title}</strong></td>
                <td>${exp.withLabel}: ${exp.withAverage}</td>
                <td>${exp.withoutLabel}: ${exp.withoutAverage}</td>
                <td><b>${exp.delta > 0 ? "+" : ""}${exp.delta} ${exp.unit}</b></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </section>
    ` : ""}
  </div>
</body>
</html>`;
  }

  function openPrintableReport(state){
    const html = generateReportHtml(state);
    const win = window.open("", "_blank");
    if(win){
      win.document.open();
      win.document.write(html);
      win.document.close();
    }
  }

  const reportCard = {
    generateReportHtml,
    openPrintableReport
  };

  if(typeof window !== "undefined"){
    window.REP_REPORT_CARD = reportCard;
  }
  if(typeof globalThis !== "undefined"){
    globalThis.REP_REPORT_CARD = reportCard;
  }
})();
