"use strict";
(() => {
  // src/client/screens/health.js
  var routes = { sleep: "/wellbeing/sleep", recovery: "/wellbeing/recovery", strain: "/wellbeing/strain" };
  var labels = { sleep: "Sleep", recovery: "Recovery", strain: "Strain", hrv: "HRV", rhr: "Resting HR", resp: "Breathing" };
  var clean = (value) => esc(String(value ?? ""));
  var format = (value, digits = 0) => value === null ? "\u2014" : Number(value).toFixed(digits);
  var hours = (value) => value === null ? "\u2014" : `${Math.floor(Math.round(value * 60) / 60)}h ${String(Math.round(value * 60) % 60).padStart(2, "0")}m`;
  var dayLabel = (date) => date ? (/* @__PURE__ */ new Date(`${date}T12:00:00`)).toLocaleDateString(document.documentElement.lang === "ar" ? "ar-EG" : "en-GB", { day: "numeric", month: "short" }) : "No data";
  var healthSummary = () => AWJ_HEALTH_SUMMARY.daily(state, isoDay());
  function ringMarkup(data, id, { large = false, linked = true } = {}) {
    const metric = data[id], value = id === "sleep" ? metric.percent : metric.value, max = id === "strain" ? 21 : 100;
    const fraction = value === null ? 0 : Math.max(0, Math.min(1, value / max));
    const tone = id === "recovery" ? `recovery-${metric.band}` : id;
    const status = value === null ? "No data" : id === "sleep" ? `${hours(metric.value)} / ${hours(metric.target)}` : id === "strain" ? metric.partial ? "Workout estimate" : "AWJ estimate" : metric.confidence === "low" ? "Limited data" : metric.calibrating ? "Calibrating" : { green: "Ready to train", yellow: "Take it steady", red: "Prioritize recovery" }[metric.band] || "AWJ estimate";
    const numeric = format(value, id === "strain" ? 1 : 0), unit = value === null ? "" : id === "strain" ? "/ 21" : "%";
    const contents = `<span class="health-ring ${tone} ${large ? "is-large" : ""} ${value === null ? "is-missing" : ""}" style="--ring-progress:${fraction}"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="ring-track" cx="60" cy="60" r="53"/><circle class="ring-value" cx="60" cy="60" r="53" pathLength="100" stroke-dasharray="100" stroke-dashoffset="${100 - fraction * 100}" ${fraction === 0 ? 'visibility="hidden"' : ""}/></svg><span class="ring-copy"><span class="ring-label">${labels[id]}</span><strong data-health-value="${id}">${numeric}<small>${id === "strain" ? "" : unit}</small></strong>${id === "strain" ? '<span class="ring-scale">/ 21</span>' : ""}</span></span><span class="ring-description">${clean(status)}</span>`;
    return linked ? `<a class="health-ring-link" href="#${routes[id]}" aria-label="${clean(`${labels[id]} ${numeric}${unit} \xB7 ${status}`)}">${contents}</a>` : `<div class="health-ring-detail">${contents}</div>`;
  }
  function healthSourceMarkup(data) {
    const imported = data.coverage.lastImport, valid = imported && Number.isFinite(Date.parse(imported));
    const sources = [...new Set(data.vitals.filter((metric) => metric.date === data.date && metric.source).map((metric) => metric.source))];
    const label = valid ? `${data.coverage.staleHours > 24 ? "Last health import" : "Health updated"} ${new Date(imported).toLocaleString(document.documentElement.lang === "ar" ? "ar-EG" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : "No health import yet";
    return `<a class="health-source" href="#/settings/sync"><span class="status-dot ${data.coverage.staleHours !== null && data.coverage.staleHours <= 24 ? "is-current" : ""}" aria-hidden="true"></span><span>${clean(label)}${sources.length ? ` \xB7 ${clean(sources.join(", "))}` : ""}</span><span aria-hidden="true">\u2197</span></a>`;
  }
  function vitalsMarkup(data) {
    const metadata = (metric) => metric.value === null ? "No data" : `${clean(dayLabel(metric.date))} \xB7 ${clean(metric.source)}${metric.date !== data.date ? " \xB7 Previous reading" : ""}`;
    const common = data.vitals.every((metric) => metadata(metric) === metadata(data.vitals[0]));
    return `<section class="core-vitals" aria-label="Core vitals">${data.vitals.map((metric) => `<article><h2>${labels[metric.id]}</h2><p><strong>${format(metric.value, metric.id === "resp" ? 1 : 0)}</strong> <span>${clean(metric.unit)}</span></p>${common ? "" : `<small>${metadata(metric)}</small>`}</article>`).join("")}${common ? `<small class="vital-metadata">${metadata(data.vitals[0])}</small>` : ""}</section>`;
  }
  function healthOverviewMarkup(data = healthSummary()) {
    return `<section class="health-overview" aria-label="Daily health"><div class="health-rings">${["sleep", "recovery", "strain"].map((id) => ringMarkup(data, id)).join("")}</div>${healthSourceMarkup(data)}</section>${vitalsMarkup(data)}`;
  }
  function healthTrendMarkup(id, data = healthSummary()) {
    const rows = AWJ_HEALTH_SUMMARY.series(state, id, data.date), mean = AWJ_HEALTH_SUMMARY.average(rows), max = id === "strain" ? 21 : 100;
    return `<section class="health-trend performance-card"><div class="card-heading"><h2>Last 7 days</h2><span>${mean === null ? "No data" : `Average ${format(mean, id === "strain" ? 1 : 0)}${id === "strain" ? " / 21" : "%"}`}</span></div><div class="health-bars ${id}" role="list" aria-label="${labels[id]} history">${rows.map((row) => `<div role="listitem" class="health-bar ${row.value === null ? "is-missing" : ""}" aria-label="${clean(`${dayLabel(row.date)}: ${row.value === null ? "No data" : `${row.value}${id === "strain" ? " / 21" : "%"}`}`)}"><span class="bar-number">${format(row.value, id === "strain" ? 1 : 0)}</span><div class="bar-track">${row.value === null ? '<span class="bar-gap">\u2014</span>' : `<i style="height:${Math.max(2, Math.min(100, row.value / max * 100))}%" class="${row.value === 0 ? "is-zero" : ""}"></i>`}</div><span>${clean((/* @__PURE__ */ new Date(`${row.date}T12:00:00`)).toLocaleDateString(document.documentElement.lang === "ar" ? "ar-EG" : "en-GB", { weekday: "narrow" }))}</span></div>`).join("")}</div></section>`;
  }
  function healthQualityMarkup(data = healthSummary()) {
    return `<section class="health-quality-summary performance-card"><div class="card-heading"><h2>Data completeness</h2><strong>${data.coverage.score}%</strong></div><p>${data.coverage.missing.length ? `Missing: ${clean(data.coverage.missing.join(", "))}` : "All daily inputs available."}</p><div class="quality-tags"><span>Recovery confidence: ${clean(data.recovery.confidence)}</span>${data.recovery.calibrating ? "<span>Building your baseline</span>" : ""}</div><p class="muted">Completeness describes your available inputs. Recovery confidence also depends on your personal baseline.</p></section>`;
  }
  function detailMarkup(id, data = healthSummary()) {
    const metric = data[id], missing = metric.value === null;
    const description = id === "sleep" ? `${hours(metric.target)} sleep need \xB7 ${metric.personalized ? "Personal baseline" : "Starting target"}` : id === "strain" ? metric.inputs.length ? metric.inputs.join(" + ") : "Import active energy or log a workout to estimate strain." : data.advice.title;
    return `<section class="health-detail-hero performance-card">${ringMarkup(data, id, { large: true, linked: false })}<h2>${clean(missing ? "Build your daily picture" : description)}</h2>${id !== "sleep" ? `<span class="estimate-badge">AWJ estimate${metric.partial ? " \xB7 Partial data" : ""}${metric.confidence ? ` \xB7 ${metric.confidence} confidence` : ""}</span>` : ""}${missing ? "<p>No data for this day. Add a log or connect your health source.</p>" : ""}</section>`;
  }

  // src/client/screens/today.js
  function createTodayScreen(ui) {
    const { enter, heading, readinessMarkup, saveStatus, bindSaveStatus, route, checkin, sheet } = ui;
    function today() {
      enter("home-overview", "home");
      const resume = AWJ_TRAINING_SESSION.isResumableWorkout(state, sessions), plan = window.AWJ_ENHANCEMENTS_UI.adaptiveTodayPlan(), id = resume ? state.session : plan.targetSession, s = sessions[id] || { name: "Recovery day", meta: "No scheduled workout", description: plan.detail, exercises: [] }, ls = sessionText(id, s), duration = id ? s.duration || ls.meta.match(/\d+[–-]\d+ min|\d+ min/)?.[0] || "" : "";
      const sessionDetail = id ? [duration || null, `${s.exercises.length} exercises`, resume ? `Exercise ${state.index + 1}` : null].filter(Boolean).map(esc).join(" \xB7 ") : "A lighter day for rest, gentle movement, and your daily practices.";
      const data = healthSummary(), totals = foodTotals(), profile = foodProfile(), water = Number(state.water?.[isoDay()] || 0);
      app.innerHTML = AWJ_SAFE_DOM.sanitize(`${heading("Today", (/* @__PURE__ */ new Date()).toLocaleDateString(state.preferences?.language === "ar" ? "ar-EG" : "en-GB", { weekday: "long", day: "numeric", month: "long" }))}${healthOverviewMarkup(data)}${readinessMarkup()}<div class="today-dashboard"><section class="today-session ${resume ? "is-resuming" : ""}" data-today-session><div><span class="eyebrow">${resume ? "In progress" : id ? "Today's workout" : "Today\u2019s focus"}</span><h2>${esc(ls.name)}</h2><p>${sessionDetail}</p></div><button class="primary-action" data-today-start>${resume ? "Resume workout" : id ? "Start workout" : "Review recovery"}</button><button class="quiet-action" data-today-preview>${id ? "Review exercises" : "View routines"}</button></section><div class="today-support"><nav class="daily-overview" aria-label="Daily overview"><a href="#/nutrition/today"><span>Nutrition logged</span><strong>${Math.round(totals.calories || 0)} <small>/ ${profile.calories} kcal</small></strong><progress max="${profile.calories || 1}" value="${Math.min(profile.calories, totals.calories || 0)}" aria-label="Calories logged"></progress></a><a href="#/nutrition/today"><span>Water logged</span><strong>${esc(window.waterDisplay(water))} <small>/ ${esc(window.waterDisplay(profile.water))}</small></strong><progress max="${profile.water || 1}" value="${Math.min(profile.water, water)}" aria-label="Water logged"></progress></a></nav><nav class="quick-actions" aria-label="Quick actions"><button data-adjust-today>Adjust today</button><button data-today-activity>Log activity</button><button data-today-food>Meal / water</button><button data-today-checkin>Check-in</button></nav></div></div><section data-daily-routines></section>${saveStatus()}`);
      document.querySelector("[data-today-start]").onclick = () => {
        if (!id) {
          route("health-vitals");
          return;
        }
        if (!resume) AWJ_ADAPTIVE_COACH.applyPlan(state, plan, sessions);
        startSession(id);
      };
      document.querySelector("[data-today-preview]").onclick = () => id ? showSessionPreview(id) : route("training-program");
      document.querySelector("[data-adjust-today]").onclick = () => sheet("Adjust today", `<p>Choose a lighter option using your existing plan.</p><button class="primary-action" data-adjust-light>Short workout</button><button data-adjust-schedule>Move this workout</button>`, (root, close) => {
        root.querySelector("[data-adjust-light]").onclick = () => {
          close();
          renderBadDay();
        };
        root.querySelector("[data-adjust-schedule]").onclick = () => {
          close();
          route("settings-schedule");
        };
      });
      document.querySelector("[data-today-activity]").onclick = () => showLogActivity();
      document.querySelector("[data-today-food]").onclick = () => route("nutrition-log");
      document.querySelector("[data-today-checkin]").onclick = checkin;
      window.AWJ_HABITS.mount();
      bindSaveStatus();
    }
    return { today };
  }

  // src/client/screens/training.js
  function createTrainingScreen(ui) {
    const { enter, heading, route, preferences, sheet } = ui;
    let library = { query: "", equipment: "all", muscle: "all" };
    function routineCard(id, s) {
      const favourite = state.routineFavourites.includes(id), resume = AWJ_TRAINING_SESSION.isResumableWorkout(state, sessions, id);
      return `<article class="routine-card" data-routine-card="${esc(id)}"><div><h2>${esc(s.name)}</h2><p>${s.exercises.length} exercises${s.duration ? ` \xB7 ${esc(s.duration)}` : ""}</p></div><button data-routine-favourite="${esc(id)}" aria-pressed="${favourite}" aria-label="${favourite ? "Unfavourite" : "Favourite"} ${esc(s.name)}">${favourite ? "\u2605" : "\u2606"}</button><div class="routine-actions"><button class="primary-action" data-session="${esc(id)}">${resume ? "Resume" : "Preview"}</button>${id.startsWith("custom-") ? `<button data-edit-custom="${esc(id)}">Edit</button>` : ""}</div></article>`;
    }
    function train() {
      enter("home", "train");
      state.trainingView = "program";
      window.AWJ_CUSTOM_WORKOUTS.getCustomRoutines();
      const ids = Object.keys(sessions).filter((id) => !["bad", "gymLite"].includes(id)).sort((a, b) => Number(state.routineFavourites.includes(b)) - Number(state.routineFavourites.includes(a)));
      app.innerHTML = AWJ_SAFE_DOM.sanitize(`${heading("Train", "Your routines, this week, and exercise technique.")}<nav class="screen-shortcuts" aria-label="Training shortcuts"><button data-train-jump="routines">Routines</button><button data-train-jump="library">Find exercise</button><button data-train-jump="schedule">Schedule</button></nav><section class="train-week"><h2>This week</h2><div class="week-plan">${window.AWJ_ENHANCEMENTS_UI.dayNames.map((day) => {
        const focus = window.AWJ_ENHANCEMENTS_UI.daySchedule(day)?.focus || state.preferences?.schedule?.[day]?.focus || "rest";
        return `<div><span>${esc(day.slice(0, 3))}</span><strong>${esc(window.AWJ_ENHANCEMENTS_UI.focusLabel(focus))}</strong></div>`;
      }).join("")}</div><button data-train-schedule>Edit schedule</button></section><div class="section-title"><h2>Workout routines</h2><button class="primary-action" data-create-new-routine>New routine</button></div><section class="routine-list">${ids.map((id) => routineCard(id, sessions[id])).join("")}</section><section class="exercise-library"><h2>Exercise library</h2><label>Search exercises<input type="search" data-library-search value="${esc(library.query)}" placeholder="Exercise or muscle"></label><div class="library-filters"><label>Equipment<select data-library-equipment>${["all", "machines", "dumbbells", "barbell", "bands", "bodyweight", "cardio"].map((x) => `<option value="${x}" ${library.equipment === x ? "selected" : ""}>${x === "all" ? "All equipment" : x}</option>`).join("")}</select></label><label>Muscle<select data-library-muscle><option value="all">All muscles</option>${[...new Set(AWJ_EXERCISES.list().flatMap((x) => x.muscleTags))].sort().map((x) => `<option ${library.muscle === x ? "selected" : ""}>${esc(x)}</option>`).join("")}</select></label></div><p data-library-count role="status"></p><div data-library-results></div></section><details class="supporting-details"><summary>Plan tools and safety</summary><button data-train-review>Technique review</button><button data-train-planreview>Program checkpoint</button><button data-train-export>Export / share plan</button></details>`);
      app.querySelectorAll("[data-train-jump]").forEach((button) => button.onclick = () => {
        const target = app.querySelector({ routines: ".routine-list", library: ".exercise-library", schedule: ".train-week" }[button.dataset.trainJump]);
        target?.scrollIntoView({ block: "start", behavior: "instant" });
        if (button.dataset.trainJump === "library") target.querySelector("input")?.focus({ preventScroll: true });
      });
      document.querySelectorAll("[data-session]").forEach((b) => b.onclick = () => showSessionPreview(b.dataset.session));
      document.querySelectorAll("[data-routine-favourite]").forEach((b) => b.onclick = () => {
        preferences.toggleFavourite(state, b.dataset.routineFavourite);
        persist();
        train();
      });
      document.querySelectorAll("[data-edit-custom]").forEach((b) => b.onclick = () => window.AWJ_CUSTOM_WORKOUTS.openRoutineBuilderModal(b.dataset.editCustom));
      document.querySelector("[data-create-new-routine]").onclick = () => window.AWJ_CUSTOM_WORKOUTS.openRoutineBuilderModal();
      document.querySelector("[data-train-schedule]").onclick = () => route("settings-schedule");
      document.querySelector("[data-train-review]").onclick = renderReview;
      document.querySelector("[data-train-planreview]").onclick = renderProgramReview;
      document.querySelector("[data-train-export]").onclick = () => {
        sheet("Plan tools", "<button data-plan-export>Export plan</button>", (root) => root.querySelector("[data-plan-export]").onclick = exportData);
      };
      for (const [selector, key] of [["[data-library-search]", "query"], ["[data-library-equipment]", "equipment"], ["[data-library-muscle]", "muscle"]]) document.querySelector(selector).addEventListener(key === "query" ? "input" : "change", (e) => {
        library[key] = e.target.value;
        renderLibrary();
      });
      renderLibrary();
    }
    function renderLibrary() {
      const query = library.query.toLowerCase().trim(), rows = AWJ_EXERCISES.list().filter((x) => (!query || `${x.name} ${x.targetMuscles || ""}`.toLowerCase().includes(query)) && (library.equipment === "all" || x.equipmentTags.includes(library.equipment)) && (library.muscle === "all" || x.muscleTags.includes(library.muscle)));
      const results = document.querySelector("[data-library-results]");
      if (!results) return;
      document.querySelector("[data-library-count]").textContent = `${rows.length} exercises`;
      results.innerHTML = AWJ_SAFE_DOM.sanitize(rows.map((x) => `<button class="library-row" data-library-exercise="${esc(x.name)}"><strong>${esc(x.name)}</strong><span>${esc(x.targetMuscles || x.category || "General movement")}</span></button>`).join("") || "<p>No matching exercise. Change your search or filters.</p>");
      results.querySelectorAll("[data-library-exercise]").forEach((b) => b.onclick = () => exerciseDetails(b.dataset.libraryExercise));
    }
    function exerciseDetails(name) {
      const item = AWJ_EXERCISES.get(name);
      sheet(name, `<div class="library-demo">${AWJ_MEDIA_PLAYER.markup(item, { preview: true, context: "library" })}</div><p>${esc(item.setup)}</p><p>${esc(item.execution)}</p><p><strong>Key cue:</strong> ${esc(item.cues)}</p><p><strong>Avoid:</strong> ${esc(item.avoid)}</p>`, () => AWJ_MEDIA_PLAYER.mount());
    }
    return { train };
  }

  // src/client/screens/nutrition.js
  function createNutritionScreen(ui) {
    const { enter, heading, route, core } = ui;
    function nutrition() {
      enter("nutrition", "food");
      core.nutrition();
      window.AWJ_ENHANCEMENTS_UI.nutrition();
      const head = app.querySelector(".food-head"), disclosure = app.querySelector(".nutrition-disclosure");
      if (head) head.innerHTML = AWJ_SAFE_DOM.sanitize(heading("Nutrition", "Today\u2019s food, water, and quick meal entry."));
      app.querySelector(".connection-banner")?.remove();
      const composer = app.querySelector(".meal-composer"), dashboard = app.querySelector(".macro-dashboard");
      const summary = document.createElement("section");
      summary.className = "nutrition-summary";
      const totals = foodTotals(todayFoodEntries()), profile = foodProfile(), water = Number(state.water[isoDay()]) || 0;
      summary.innerHTML = AWJ_SAFE_DOM.sanitize(`<h2>Logged today</h2><dl><div><dt>Energy logged</dt><dd>${Math.round(totals.calories)}<span>/ ${profile.calories} kcal</span></dd></div><div><dt>Protein logged</dt><dd>${Math.round(totals.protein_g)}<span>/ ${profile.protein} g</span></dd></div><div><dt>Water logged</dt><dd>${esc(window.waterDisplay(water))}<span>/ ${esc(window.waterDisplay(profile.water))}</span></dd></div></dl>`);
      head?.after(summary);
      const shortcut = document.createElement("nav");
      shortcut.className = "nutrition-actions";
      shortcut.setAttribute("aria-label", "Nutrition actions");
      shortcut.innerHTML = AWJ_SAFE_DOM.sanitize('<button class="primary-action" data-nutrition-log>Log meal</button><button data-nutrition-water>Water</button>');
      summary.after(shortcut);
      shortcut.querySelector("[data-nutrition-log]").onclick = () => route("nutrition-log");
      shortcut.querySelector("[data-nutrition-water]").onclick = () => {
        state.nutritionView = "today";
        nutrition();
        app.querySelector(".water-card")?.scrollIntoView({ block: "center" });
      };
      if (state.nutritionView === "today") {
        const navSection = app.querySelector('[data-nav-for="nutrition"]'), recent = app.querySelector(".food-log");
        if (recent && navSection) navSection.after(recent);
        if (dashboard) {
          const details = document.createElement("details");
          details.className = "nutrition-details";
          details.innerHTML = AWJ_SAFE_DOM.sanitize("<summary>Targets and nutrition breakdown</summary>");
          dashboard.replaceWith(details);
          details.append(dashboard);
        }
        const reminder = app.querySelector(".reminder-strip");
        if (reminder) {
          const details = document.createElement("details");
          details.className = "nutrition-details";
          details.innerHTML = AWJ_SAFE_DOM.sanitize("<summary>Nutrition routine and supplements</summary>");
          reminder.replaceWith(details);
          details.append(reminder);
        }
      }
      if (composer) {
        composer.querySelector(".estimate-pill").textContent = "Optional AI estimate";
        if (disclosure) composer.append(disclosure);
      }
      const connection = document.createElement("button");
      connection.className = "quiet-action";
      connection.dataset.nutritionConnect = "true";
      connection.textContent = "Set up nutrition connections";
      connection.onclick = () => route("settings-sync");
      app.append(connection);
      if (state.nutritionView === "log") composer?.scrollIntoView({ block: "start" });
      app.querySelectorAll("[data-food-text],[data-food-macro]").forEach((input) => input.addEventListener("input", () => {
        if (!state.foodDraft) return;
        if (input.dataset.foodText) state.foodDraft[input.dataset.foodText] = String(input.value || "").slice(0, 2e3);
        if (input.dataset.foodMacro) state.foodDraft[input.dataset.foodMacro] = Math.max(0, Number(input.value) || 0);
        persistDebounced();
      }));
    }
    return { nutrition };
  }

  // src/client/screens/progress.js
  function createProgressScreen(ui) {
    const { enter, heading, route } = ui;
    let historyFilter = { query: "", from: "", to: "" };
    function historyMarkup() {
      const q = historyFilter.query.toLowerCase(), rows = (state.history || []).filter((x) => {
        const day = String(x.date || "").slice(0, 10);
        return (!historyFilter.from || day >= historyFilter.from) && (!historyFilter.to || day <= historyFilter.to) && (!q || `${sessions[x.session]?.name || x.activityLabel || x.session} ${(x.entries || []).map((e) => e.exercise).join(" ")}`.toLowerCase().includes(q));
      });
      return `<p>${rows.length} sessions</p>${rows.map((x) => `<article class="history-result"><h3>${esc(sessions[x.session]?.name || x.activityLabel || x.session)}</h3><p>${esc(String(x.date || "").slice(0, 10))} \xB7 ${Math.round((Number(x.duration) || 0) / 60)} min \xB7 ${Number(x.sets) || 0} sets</p><details><summary>Logged exercises</summary>${(x.entries || []).map((e) => `<p>${esc(e.exercise)} \xB7 ${esc(String(e.weight || "\u2014"))} kg \xB7 ${esc(String(e.reps || "\u2014"))} reps${e.rpe ? ` \xB7 RPE ${esc(e.rpe)}` : ""}</p>`).join("") || "<p>No detailed set records.</p>"}</details></article>`).join("") || "<p>Complete your first workout to see its history here.</p>"}`;
    }
    function progress() {
      enter("insights", "insights");
      const weekly = AWJ_PRODUCT_SUITE.weeklySummary(state, void 0, AWJ_PERFORMANCE_INSIGHTS), model = AWJ_PERFORMANCE_INSIGHTS.analyze(state), lifts = model.strength?.exercises || [], selected = state.progressExercise || lifts[0]?.exercise, exercise = lifts.find((x) => x.exercise === selected), proposals = state.progressionProposals || [];
      app.innerHTML = AWJ_SAFE_DOM.sanitize(`${heading("Progress", "Consistency, performance, and your next step.")}<nav class="screen-shortcuts" aria-label="Progress shortcuts"><button data-open-weekly>Weekly report</button><button data-open-history>Workout history</button></nav><section class="progress-overview"><h2>Am I following my plan?</h2><p class="metric-value">${weekly.completed} / ${weekly.planned}</p><p>Planned sessions completed this week${weekly.totalWorkouts > weekly.completed ? ` \xB7 ${weekly.totalWorkouts - weekly.completed} additional activities` : ""}</p></section><section class="exercise-progress"><h2>Am I improving?</h2>${lifts.length ? `<label>Exercise<select data-progress-exercise>${lifts.map((x) => `<option ${x.exercise === selected ? "selected" : ""}>${esc(x.exercise)}</option>`).join("")}</select></label><p>${esc(exercise?.recommendation || "Establishing a baseline")} \xB7 ${exercise?.sessionCount || 0} logged sessions</p>${exercise?.currentE1rm ? `<p>Best estimated 1RM: ${esc(String(exercise.currentE1rm))} kg</p><p>${exercise.change28d === null ? "More sessions are needed for a 28-day comparison." : `${exercise.change28d > 0 ? "+" : ""}${exercise.change28d}% over 28 days`}</p>` : ""}` : "<p>Log weight and reps across several sessions to see a reliable exercise trend.</p>"}</section><section class="next-step"><h2>What should I do next?</h2><p>${esc(weekly.nextAction)}</p><button class="primary-action" data-progress-train>Open routines</button>${proposals.length ? `<details><summary>Next-session targets</summary>${window.AWJ_ENHANCEMENTS_UI.progressionCard(proposals)}</details>` : ""}</section><section class="progress-history"><h2>Workout history</h2><label>Search sessions or exercises<input type="search" data-history-search value="${esc(historyFilter.query)}"></label><div class="history-dates"><label>From<input type="date" data-history-from value="${historyFilter.from}"></label><label>To<input type="date" data-history-to value="${historyFilter.to}"></label></div><div data-history-results>${historyMarkup()}</div></section><details class="supporting-details progress-analysis"><summary>Weekly report and detailed analysis</summary><div class="trends-grid"></div>${window.AWJ_PRODUCT_UI.weeklyCard()}${window.AWJ_PRODUCT_UI.experimentsCard()}${window.AWJ_HEALTH_UI.trendMarkup()}</details>`);
      app.querySelector("[data-open-weekly]").onclick = () => {
        app.querySelector(".progress-analysis").open = true;
        const report = app.querySelector("[data-product-weekly]");
        report.scrollIntoView({ block: "start", behavior: "instant" });
        const title = report.querySelector("h2");
        title.tabIndex = -1;
        title.focus({ preventScroll: true });
      };
      app.querySelector("[data-open-history]").onclick = () => {
        app.querySelector(".progress-history").scrollIntoView({ block: "start", behavior: "instant" });
        app.querySelector("[data-history-search]").focus({ preventScroll: true });
      };
      document.querySelector("[data-progress-train]").onclick = () => route("training-program");
      document.querySelector("[data-accept-progression]")?.addEventListener("click", () => {
        window.AWJ_ENHANCEMENTS_UI.acceptProgression(proposals);
        progress();
      });
      document.querySelector("[data-progress-exercise]")?.addEventListener("change", (e) => {
        state.progressExercise = e.target.value;
        progress();
      });
      for (const [selector, key] of [["[data-history-search]", "query"], ["[data-history-from]", "from"], ["[data-history-to]", "to"]]) document.querySelector(selector).addEventListener(key === "query" ? "input" : "change", (e) => {
        historyFilter[key] = e.target.value;
        document.querySelector("[data-history-results]").innerHTML = AWJ_SAFE_DOM.sanitize(historyMarkup());
      });
      window.AWJ_PRODUCT_UI.bindWeekly(app.querySelector("[data-product-weekly]"));
      window.AWJ_PRODUCT_UI.bindExperiments(app.querySelector("[data-product-experiments]"));
      window.AWJ_PERFORMANCE_UI.mount();
      window.AWJ_HEALTH_UI.bind();
    }
    return { progress };
  }

  // src/client/screens/wellbeing.js
  function createWellbeingScreens(ui) {
    const { enter, heading, readinessMarkup, saveStatus, bindSaveStatus, route, checkin, core } = ui;
    function wellbeing() {
      enter("wellbeing", "wellbeing");
      const data = healthSummary();
      app.innerHTML = AWJ_SAFE_DOM.sanitize(`${heading("Wellbeing", "Your health and daily practices.")}${healthOverviewMarkup(data)}${healthQualityMarkup(data)}<section class="more-menu">${[["Recovery & health", "Sleep, check-ins and measurements", "health-vitals"], ["Daily practices", "Habits, hygiene and journal", "health-wellness"]].map(([title, detail, id]) => `<button data-more-route="${id}"><strong>${title}</strong><span>${detail}</span><b aria-hidden="true">\u2192</b></button>`).join("")}</section><section data-daily-routines></section>${saveStatus()}`);
      app.querySelectorAll("[data-more-route]").forEach((button) => button.onclick = () => route(button.dataset.moreRoute));
      window.AWJ_HABITS.mount();
      bindSaveStatus();
    }
    function healthDetail(id) {
      enter("vitals", "vitals");
      core.vitals();
      const old = document.createElement("div");
      while (app.firstChild) old.append(app.firstChild);
      const data = healthSummary(), title = { sleep: "Sleep", recovery: "Recovery", strain: "Strain" }[id];
      app.innerHTML = AWJ_SAFE_DOM.sanitize(`${heading(title, (/* @__PURE__ */ new Date(`${data.date}T12:00:00`)).toLocaleDateString(state.preferences?.language === "ar" ? "ar-EG" : "en-GB", { weekday: "long", day: "numeric", month: "long" }))}<button class="health-back" data-more-back>\u2190 Wellbeing</button><nav class="health-detail-tabs" aria-label="Health details">${[["sleep", "Sleep"], ["recovery", "Recovery"], ["strain", "Strain"]].map(([key, label]) => `<a href="#/wellbeing/${key}" aria-current="${id === key ? "page" : "false"}">${label}</a>`).join("")}</nav>${detailMarkup(id, data)}${healthSourceMarkup(data)}${vitalsMarkup(data)}<div class="health-detail-grid">${healthTrendMarkup(id, data)}${healthQualityMarkup(data)}</div>${readinessMarkup()}<nav class="quick-actions"><button data-recovery-checkin>Quick check-in</button><button data-recovery-measurements>Measurements</button></nav><section class="health-baselines">${window.AWJ_HEALTH_UI.trendMarkup()}</section><section class="health-extra"></section><details class="recovery-sleep" ${id === "sleep" ? "open" : ""}><summary>Log sleep</summary></details><section class="health-energy-log"></section><details class="supporting-details recovery-data"><summary>Connections, imports & setup</summary><section data-health-tools></section>${window.AWJ_HEALTH_UI.chargingMarkup()}</details><section class="health-journal"></section>${saveStatus()}`);
      const move = (selector, target) => old.querySelectorAll(selector).forEach((node) => {
        node.hidden = false;
        app.querySelector(target).append(node);
      });
      move(".sleep-card", ".recovery-sleep");
      move(".active-energy-card", ".health-energy-log");
      move(".vitals-import-card", ".recovery-data");
      move(".recovery-card.wide:not(.sleep-card):not(.journal-card)", ".health-extra");
      move(".journal-card", ".health-journal");
      app.querySelector("[data-more-back]").onclick = () => route("wellbeing");
      app.querySelector("[data-recovery-checkin]").onclick = checkin;
      app.querySelector("[data-recovery-measurements]").onclick = () => app.querySelector("[data-body-measurement]")?.scrollIntoView({ block: "center" });
      window.AWJ_HEALTH_UI.bind({ onMeasurementSaved: () => {
        healthDetail(id);
        app.querySelector("[data-body-measurement]")?.scrollIntoView({ block: "center" });
        showToast("Measurements saved on device.");
      } });
      if (state.vitalsDraft) app.querySelector(".recovery-data").open = true;
      window.AWJ_PRODUCT_UI.mount();
      bindSaveStatus();
      updatePrimaryTabs();
    }
    const recovery = () => healthDetail("recovery"), sleep = () => healthDetail("sleep"), strain = () => healthDetail("strain");
    function routines() {
      enter("care", "care");
      core.wellness();
      const oldHead = app.querySelector(".module-head,.recovery-head");
      if (oldHead) oldHead.innerHTML = AWJ_SAFE_DOM.sanitize(heading("Daily routines", "Your existing hygiene, wellness and journal routines."));
      const back = document.createElement("button");
      back.dataset.moreBack = "true";
      back.textContent = "\u2190 Wellbeing";
      back.onclick = () => route("wellbeing");
      app.prepend(back);
      window.AWJ_HABITS.mount();
      window.AWJ_PRODUCT_UI.mount();
      updatePrimaryTabs();
    }
    return { wellbeing, recovery, sleep, strain, routines };
  }

  // src/client/screens/registry.ts
  function createScreenRegistry(features) {
    let current = null;
    return Object.freeze({
      show(id) {
        if (current !== null && current !== id) features[current].destroy();
        current = id;
        features[id].mount();
      },
      update() {
        if (current !== null) features[current].update();
      },
      destroy() {
        if (current !== null) features[current].destroy();
        current = null;
      },
      current: () => current
    });
  }

  // src/client/screens/settings.js
  function createSettingsScreen() {
    const mount = () => {
      window.AWJ_ENHANCEMENTS_UI.settings(state.settingsSection);
      window.AWJ_LOCALE?.apply();
    };
    return { mount, update: mount, destroy() {
    } };
  }

  // src/client/screens/locale.js
  var arabic = {
    "Dark": "\u062F\u0627\u0643\u0646",
    "Light": "\u0641\u0627\u062A\u062D",
    "Recovery": "\u0627\u0644\u062A\u0639\u0627\u0641\u064A",
    "Strain": "\u0627\u0644\u062C\u0647\u062F",
    "Breathing": "\u0627\u0644\u062A\u0646\u0641\u0633",
    "Resting HR": "\u0646\u0628\u0636 \u0627\u0644\u0631\u0627\u062D\u0629",
    "Your health and daily practices.": "\u0635\u062D\u062A\u0643 \u0648\u0639\u0627\u062F\u0627\u062A\u0643 \u0627\u0644\u064A\u0648\u0645\u064A\u0629.",
    "Daily health": "\u0627\u0644\u0635\u062D\u0629 \u0627\u0644\u064A\u0648\u0645\u064A\u0629",
    "Core vitals": "\u0627\u0644\u0645\u0624\u0634\u0631\u0627\u062A \u0627\u0644\u062D\u064A\u0648\u064A\u0629",
    "No data": "\u0644\u0627 \u062A\u0648\u062C\u062F \u0628\u064A\u0627\u0646\u0627\u062A",
    "No health import yet": "\u0644\u0645 \u062A\u064F\u0633\u062A\u0648\u0631\u062F \u0628\u064A\u0627\u0646\u0627\u062A \u0635\u062D\u064A\u0629 \u0628\u0639\u062F",
    "Nutrition logged": "\u0627\u0644\u062A\u063A\u0630\u064A\u0629 \u0627\u0644\u0645\u0633\u062C\u0644\u0629",
    "Water logged": "\u0627\u0644\u0645\u0627\u0621 \u0627\u0644\u0645\u0633\u062C\u0644",
    "Logged today": "\u0627\u0644\u0645\u0633\u062C\u0644 \u0627\u0644\u064A\u0648\u0645",
    "Energy logged": "\u0627\u0644\u0637\u0627\u0642\u0629 \u0627\u0644\u0645\u0633\u062C\u0644\u0629",
    "Protein logged": "\u0627\u0644\u0628\u0631\u0648\u062A\u064A\u0646 \u0627\u0644\u0645\u0633\u062C\u0644",
    "AWJ estimate": "\u062A\u0642\u062F\u064A\u0631 \u0623\u0648\u062C",
    "Partial data": "\u0628\u064A\u0627\u0646\u0627\u062A \u062C\u0632\u0626\u064A\u0629",
    "Limited data": "\u0628\u064A\u0627\u0646\u0627\u062A \u0645\u062D\u062F\u0648\u062F\u0629",
    "Calibrating": "\u062C\u0627\u0631\u064D \u0628\u0646\u0627\u0621 \u062E\u0637 \u0627\u0644\u0623\u0633\u0627\u0633",
    "Building your baseline": "\u062C\u0627\u0631\u064D \u0628\u0646\u0627\u0621 \u062E\u0637 \u0627\u0644\u0623\u0633\u0627\u0633",
    "Data completeness": "\u0627\u0643\u062A\u0645\u0627\u0644 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A",
    "All daily inputs available.": "\u0643\u0644 \u0645\u062F\u062E\u0644\u0627\u062A \u0627\u0644\u064A\u0648\u0645 \u0645\u062A\u0627\u062D\u0629.",
    "Recovery confidence": "\u0627\u0644\u062B\u0642\u0629 \u0641\u064A \u062A\u0642\u062F\u064A\u0631 \u0627\u0644\u062A\u0639\u0627\u0641\u064A",
    "High confidence": "\u062B\u0642\u0629 \u0639\u0627\u0644\u064A\u0629",
    "Completeness describes your available inputs. Recovery confidence also depends on your personal baseline.": "\u064A\u0639\u0643\u0633 \u0627\u0644\u0627\u0643\u062A\u0645\u0627\u0644 \u0627\u0644\u0645\u062F\u062E\u0644\u0627\u062A \u0627\u0644\u0645\u062A\u0627\u062D\u0629. \u0648\u062A\u0639\u062A\u0645\u062F \u0627\u0644\u062B\u0642\u0629 \u0641\u064A \u062A\u0642\u062F\u064A\u0631 \u0627\u0644\u062A\u0639\u0627\u0641\u064A \u0623\u064A\u0636\u064B\u0627 \u0639\u0644\u0649 \u062E\u0637 \u0623\u0633\u0627\u0633\u0643 \u0627\u0644\u0634\u062E\u0635\u064A.",
    "Ready to train": "\u062C\u0627\u0647\u0632 \u0644\u0644\u062A\u0645\u0631\u064A\u0646",
    "Take it steady": "\u062A\u062F\u0631\u0651\u0628 \u0628\u0647\u062F\u0648\u0621",
    "Prioritize recovery": "\u0623\u0639\u0637\u0650 \u0627\u0644\u062A\u0639\u0627\u0641\u064A \u0627\u0644\u0623\u0648\u0644\u0648\u064A\u0629",
    "Workout estimate": "\u062A\u0642\u062F\u064A\u0631 \u0645\u0646 \u0627\u0644\u062A\u0645\u0627\u0631\u064A\u0646 \u0627\u0644\u0645\u0633\u062C\u0644\u0629",
    "Build your daily picture": "\u0623\u0643\u0645\u0644 \u0635\u0648\u0631\u0629 \u064A\u0648\u0645\u0643",
    "No data for this day. Add a log or connect your health source.": "\u0644\u0627 \u062A\u0648\u062C\u062F \u0628\u064A\u0627\u0646\u0627\u062A \u0644\u0647\u0630\u0627 \u0627\u0644\u064A\u0648\u0645. \u0623\u0636\u0641 \u0633\u062C\u0644\u064B\u0627 \u0623\u0648 \u0627\u0631\u0628\u0637 \u0645\u0635\u062F\u0631 \u0628\u064A\u0627\u0646\u0627\u062A\u0643 \u0627\u0644\u0635\u062D\u064A\u0629.",
    "Connections, imports & setup": "\u0627\u0644\u0627\u062A\u0635\u0627\u0644\u0627\u062A \u0648\u0627\u0644\u0627\u0633\u062A\u064A\u0631\u0627\u062F \u0648\u0627\u0644\u0625\u0639\u062F\u0627\u062F",
    "TODAY\u2019S GUIDANCE": "\u062A\u0648\u062C\u064A\u0647 \u0627\u0644\u064A\u0648\u0645",
    "Health details": "\u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0635\u062D\u0629",
    "Previous reading": "\u0642\u0631\u0627\u0621\u0629 \u0633\u0627\u0628\u0642\u0629",
    "Today": "\u0627\u0644\u064A\u0648\u0645",
    "Train": "\u0627\u0644\u062A\u0645\u0631\u064A\u0646",
    "Nutrition": "\u0627\u0644\u062A\u063A\u0630\u064A\u0629",
    "Wellbeing": "\u0627\u0644\u0639\u0627\u0641\u064A\u0629",
    "Progress": "\u0627\u0644\u062A\u0642\u062F\u0645",
    "Settings": "\u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A",
    "Daily practices": "\u0627\u0644\u0639\u0627\u062F\u0627\u062A \u0627\u0644\u064A\u0648\u0645\u064A\u0629",
    "Habits, hygiene and journal": "\u0627\u0644\u0639\u0627\u062F\u0627\u062A \u0648\u0627\u0644\u0639\u0646\u0627\u064A\u0629 \u0627\u0644\u064A\u0648\u0645\u064A\u0629 \u0648\u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0627\u062A",
    "Recovery & health": "\u0627\u0644\u062A\u0639\u0627\u0641\u064A \u0648\u0627\u0644\u0635\u062D\u0629",
    "Sleep, check-ins and measurements": "\u0627\u0644\u0646\u0648\u0645 \u0648\u0627\u0644\u0645\u062A\u0627\u0628\u0639\u0629 \u0648\u0627\u0644\u0642\u064A\u0627\u0633\u0627\u062A",
    "Today\u2019s focus": "\u062A\u0631\u0643\u064A\u0632 \u0627\u0644\u064A\u0648\u0645",
    "Today's workout": "\u062A\u0645\u0631\u064A\u0646 \u0627\u0644\u064A\u0648\u0645",
    "In progress": "\u0642\u064A\u062F \u0627\u0644\u062A\u0646\u0641\u064A\u0630",
    "Recovery day": "\u064A\u0648\u0645 \u0644\u0644\u062A\u0639\u0627\u0641\u064A",
    "A lighter day for rest, gentle movement, and your daily practices.": "\u064A\u0648\u0645 \u0623\u062E\u0641 \u0644\u0644\u0631\u0627\u062D\u0629 \u0648\u0627\u0644\u062D\u0631\u0643\u0629 \u0627\u0644\u0647\u0627\u062F\u0626\u0629 \u0648\u0639\u0627\u062F\u0627\u062A\u0643 \u0627\u0644\u064A\u0648\u0645\u064A\u0629.",
    "Review recovery": "\u0631\u0627\u062C\u0639 \u0627\u0644\u062A\u0639\u0627\u0641\u064A",
    "View routines": "\u0639\u0631\u0636 \u0627\u0644\u062A\u0645\u0627\u0631\u064A\u0646",
    "Review exercises": "\u0639\u0631\u0636 \u0627\u0644\u062D\u0631\u0643\u0627\u062A",
    "Start workout": "\u0627\u0628\u062F\u0623 \u0627\u0644\u062A\u0645\u0631\u064A\u0646",
    "Resume workout": "\u0627\u0633\u062A\u0623\u0646\u0641 \u0627\u0644\u062A\u0645\u0631\u064A\u0646",
    "Why this recommendation?": "\u0644\u0645\u0627\u0630\u0627 \u0647\u0630\u0647 \u0627\u0644\u062A\u0648\u0635\u064A\u0629\u061F",
    "Adjust today": "\u062A\u0639\u062F\u064A\u0644 \u062E\u0637\u0629 \u0627\u0644\u064A\u0648\u0645",
    "Log activity": "\u0633\u062C\u0651\u0644 \u0646\u0634\u0627\u0637\u064B\u0627",
    "Meal / water": "\u0627\u0644\u0637\u0639\u0627\u0645 \u0648\u0627\u0644\u0645\u0627\u0621",
    "Check-in": "\u0627\u0644\u0645\u062A\u0627\u0628\u0639\u0629",
    "Check in": "\u0633\u062C\u0651\u0644 \u062D\u0627\u0644\u062A\u0643",
    "Calories logged": "\u0627\u0644\u0633\u0639\u0631\u0627\u062A \u0627\u0644\u0645\u0633\u062C\u0644\u0629",
    "Water today": "\u0627\u0644\u0645\u0627\u0621 \u0627\u0644\u064A\u0648\u0645",
    "Recovery & sleep": "\u0627\u0644\u062A\u0639\u0627\u0641\u064A \u0648\u0627\u0644\u0646\u0648\u0645",
    "Saved on device": "\u0645\u062D\u0641\u0648\u0638 \u0639\u0644\u0649 \u0627\u0644\u062C\u0647\u0627\u0632",
    "Saving on device\u2026": "\u062C\u0627\u0631\u064D \u0627\u0644\u062D\u0641\u0638 \u0639\u0644\u0649 \u0627\u0644\u062C\u0647\u0627\u0632\u2026",
    "Saved on device \xB7 records synced": "\u0645\u062D\u0641\u0648\u0638 \u0639\u0644\u0649 \u0627\u0644\u062C\u0647\u0627\u0632 \xB7 \u062A\u0645\u062A \u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629",
    "Save needs attention \xB7 open backups": "\u0627\u0644\u062D\u0641\u0638 \u064A\u062D\u062A\u0627\u062C \u0625\u0644\u0649 \u0627\u0646\u062A\u0628\u0627\u0647 \xB7 \u0627\u0641\u062A\u062D \u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629",
    "Daily habits": "\u0627\u0644\u0639\u0627\u062F\u0627\u062A \u0627\u0644\u064A\u0648\u0645\u064A\u0629",
    "DAILY HABITS": "\u0627\u0644\u0639\u0627\u062F\u0627\u062A \u0627\u0644\u064A\u0648\u0645\u064A\u0629",
    "Build the day you want.": "\u0627\u0628\u0646\u0650 \u064A\u0648\u0645\u0643 \u0628\u0639\u0627\u062F\u0627\u062A\u0643.",
    "Reorder": "\u062A\u0631\u062A\u064A\u0628",
    "Open Habit Log": "\u0627\u0641\u062A\u062D \u0633\u062C\u0644 \u0627\u0644\u0639\u0627\u062F\u0627\u062A",
    "View habits": "\u0639\u0631\u0636 \u0627\u0644\u0639\u0627\u062F\u0627\u062A",
    "Close habits": "\u0625\u063A\u0644\u0627\u0642 \u0627\u0644\u0639\u0627\u062F\u0627\u062A",
    "Sleep": "\u0627\u0644\u0646\u0648\u0645",
    "7\u20138 hours of night sleep": "\u0667\u2013\u0668 \u0633\u0627\u0639\u0627\u062A \u0645\u0646 \u0627\u0644\u0646\u0648\u0645 \u0644\u064A\u0644\u064B\u0627",
    "Night prayer": "\u0642\u064A\u0627\u0645 \u0627\u0644\u0644\u064A\u0644",
    "Fajr prayer": "\u0635\u0644\u0627\u0629 \u0627\u0644\u0641\u062C\u0631",
    "Sadqa": "\u0627\u0644\u0635\u062F\u0642\u0629",
    "Quran wird": "\u0648\u0650\u0631\u062F \u0627\u0644\u0642\u0631\u0622\u0646",
    "Read pages of the Quran": "\u0642\u0631\u0627\u0621\u0629 \u0635\u0641\u062D\u0627\u062A \u0645\u0646 \u0627\u0644\u0642\u0631\u0622\u0646",
    "Quran memorization": "\u062D\u0641\u0638 \u0627\u0644\u0642\u0631\u0622\u0646",
    "Workout": "\u0627\u0644\u062A\u0645\u0631\u064A\u0646",
    "Morning & evening adhkar": "\u0623\u0630\u0643\u0627\u0631 \u0627\u0644\u0635\u0628\u0627\u062D \u0648\u0627\u0644\u0645\u0633\u0627\u0621",
    "Reading": "\u0627\u0644\u0642\u0631\u0627\u0621\u0629",
    "Water": "\u0627\u0644\u0645\u0627\u0621",
    "Surat Al-Kahf": "\u0633\u0648\u0631\u0629 \u0627\u0644\u0643\u0647\u0641",
    "Dua for Baba": "\u062F\u0639\u0627\u0621 \u0644\u0628\u0627\u0628\u0627",
    "START TODAY": "\u0627\u0628\u062F\u0623 \u0627\u0644\u064A\u0648\u0645",
    "Last 7 days": "\u0622\u062E\u0631 \u0667 \u0623\u064A\u0627\u0645",
    "View progress": "\u0639\u0631\u0636 \u0627\u0644\u062A\u0642\u062F\u0645",
    "Your routines, this week, and exercise technique.": "\u062A\u0645\u0627\u0631\u064A\u0646\u0643 \u0648\u062E\u0637\u062A\u0643 \u0627\u0644\u0623\u0633\u0628\u0648\u0639\u064A\u0629 \u0648\u0637\u0631\u064A\u0642\u0629 \u0623\u062F\u0627\u0621 \u0627\u0644\u062D\u0631\u0643\u0627\u062A.",
    "Routines": "\u0627\u0644\u0628\u0631\u0627\u0645\u062C",
    "Find exercise": "\u0627\u0628\u062D\u062B \u0639\u0646 \u062D\u0631\u0643\u0629",
    "Schedule": "\u0627\u0644\u062C\u062F\u0648\u0644",
    "This week": "\u0647\u0630\u0627 \u0627\u0644\u0623\u0633\u0628\u0648\u0639",
    "Edit schedule": "\u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u062C\u062F\u0648\u0644",
    "Workout routines": "\u0628\u0631\u0627\u0645\u062C \u0627\u0644\u062A\u0645\u0631\u064A\u0646",
    "New routine": "\u0628\u0631\u0646\u0627\u0645\u062C \u062C\u062F\u064A\u062F",
    "Preview": "\u0645\u0639\u0627\u064A\u0646\u0629",
    "Resume": "\u0627\u0633\u062A\u0626\u0646\u0627\u0641",
    "Edit": "\u062A\u0639\u062F\u064A\u0644",
    "Exercise library": "\u0645\u0643\u062A\u0628\u0629 \u0627\u0644\u062D\u0631\u0643\u0627\u062A",
    "Search exercises": "\u0627\u0628\u062D\u062B \u0639\u0646 \u062D\u0631\u0643\u0629",
    "Exercise or muscle": "\u0627\u0644\u062D\u0631\u0643\u0629 \u0623\u0648 \u0627\u0644\u0639\u0636\u0644\u0629",
    "Equipment": "\u0627\u0644\u0645\u0639\u062F\u0627\u062A",
    "Muscle": "\u0627\u0644\u0639\u0636\u0644\u0629",
    "Plan tools and safety": "\u0623\u062F\u0648\u0627\u062A \u0627\u0644\u062E\u0637\u0629 \u0648\u0627\u0644\u0633\u0644\u0627\u0645\u0629",
    "Technique review": "\u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0623\u062F\u0627\u0621",
    "Program checkpoint": "\u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0628\u0631\u0646\u0627\u0645\u062C",
    "Export / share plan": "\u062A\u0635\u062F\u064A\u0631 \u0627\u0644\u062E\u0637\u0629 \u0623\u0648 \u0645\u0634\u0627\u0631\u0643\u062A\u0647\u0627",
    "Today\u2019s food, water, and quick meal entry.": "\u0627\u0644\u0637\u0639\u0627\u0645 \u0648\u0627\u0644\u0645\u0627\u0621 \u0648\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0648\u062C\u0628\u0627\u062A \u0627\u0644\u064A\u0648\u0645.",
    "Log meal": "\u0633\u062C\u0651\u0644 \u0648\u062C\u0628\u0629",
    "Calories": "\u0627\u0644\u0633\u0639\u0631\u0627\u062A",
    "Protein": "\u0627\u0644\u0628\u0631\u0648\u062A\u064A\u0646",
    "Targets and nutrition breakdown": "\u0627\u0644\u0623\u0647\u062F\u0627\u0641 \u0648\u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u062A\u063A\u0630\u064A\u0629",
    "Nutrition routine and supplements": "\u0639\u0627\u062F\u0627\u062A \u0627\u0644\u062A\u063A\u0630\u064A\u0629 \u0648\u0627\u0644\u0645\u0643\u0645\u0644\u0627\u062A",
    "Optional AI estimate": "\u062A\u0642\u062F\u064A\u0631 \u0627\u062E\u062A\u064A\u0627\u0631\u064A \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A",
    "Set up nutrition connections": "\u0625\u0639\u062F\u0627\u062F \u0627\u062A\u0635\u0627\u0644\u0627\u062A \u0627\u0644\u062A\u063A\u0630\u064A\u0629",
    "Weekly report": "\u0627\u0644\u062A\u0642\u0631\u064A\u0631 \u0627\u0644\u0623\u0633\u0628\u0648\u0639\u064A",
    "Workout history": "\u0633\u062C\u0644 \u0627\u0644\u062A\u0645\u0627\u0631\u064A\u0646",
    "Am I following my plan?": "\u0647\u0644 \u0623\u0644\u062A\u0632\u0645 \u0628\u062E\u0637\u062A\u064A\u061F",
    "Am I improving?": "\u0647\u0644 \u064A\u062A\u062D\u0633\u0646 \u0623\u062F\u0627\u0626\u064A\u061F",
    "What should I do next?": "\u0645\u0627 \u0627\u0644\u062E\u0637\u0648\u0629 \u0627\u0644\u062A\u0627\u0644\u064A\u0629\u061F",
    "Open routines": "\u0627\u0641\u062A\u062D \u0627\u0644\u0628\u0631\u0627\u0645\u062C",
    "Next-session targets": "\u0623\u0647\u062F\u0627\u0641 \u0627\u0644\u062C\u0644\u0633\u0629 \u0627\u0644\u0642\u0627\u062F\u0645\u0629",
    "Search sessions or exercises": "\u0627\u0628\u062D\u062B \u0641\u064A \u0627\u0644\u062C\u0644\u0633\u0627\u062A \u0623\u0648 \u0627\u0644\u062D\u0631\u0643\u0627\u062A",
    "From": "\u0645\u0646",
    "To": "\u0625\u0644\u0649",
    "Logged exercises": "\u0627\u0644\u062D\u0631\u0643\u0627\u062A \u0627\u0644\u0645\u0633\u062C\u0644\u0629",
    "No detailed set records.": "\u0644\u0627 \u062A\u0648\u062C\u062F \u062A\u0641\u0627\u0635\u064A\u0644 \u0644\u0644\u0645\u062C\u0645\u0648\u0639\u0627\u062A.",
    "Complete your first workout to see its history here.": "\u0623\u0643\u0645\u0644 \u0623\u0648\u0644 \u062A\u0645\u0631\u064A\u0646 \u0644\u0639\u0631\u0636 \u0633\u062C\u0644\u0647 \u0647\u0646\u0627.",
    "Weekly report and detailed analysis": "\u0627\u0644\u062A\u0642\u0631\u064A\u0631 \u0627\u0644\u0623\u0633\u0628\u0648\u0639\u064A \u0648\u0627\u0644\u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u062A\u0641\u0635\u064A\u0644\u064A",
    "Quick check-in": "\u0645\u062A\u0627\u0628\u0639\u0629 \u0633\u0631\u064A\u0639\u0629",
    "Measurements": "\u0627\u0644\u0642\u064A\u0627\u0633\u0627\u062A",
    "Log sleep": "\u0633\u062C\u0651\u0644 \u0627\u0644\u0646\u0648\u0645",
    "Health data, baselines and setup": "\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0635\u062D\u064A\u0629 \u0648\u062E\u0637 \u0627\u0644\u0623\u0633\u0627\u0633 \u0648\u0627\u0644\u0625\u0639\u062F\u0627\u062F",
    "\u2190 Wellbeing": "\u2190 \u0627\u0644\u0639\u0627\u0641\u064A\u0629",
    "Close": "\u0625\u063A\u0644\u0627\u0642",
    "Back": "\u0631\u062C\u0648\u0639",
    "General": "\u0639\u0627\u0645",
    "Targets": "\u0627\u0644\u0623\u0647\u062F\u0627\u0641",
    "Coach": "\u0627\u0644\u062A\u0648\u062C\u064A\u0647",
    "Sync": "\u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629",
    "Security": "\u0627\u0644\u0623\u0645\u0627\u0646",
    "YOUR PREFERENCES": "\u062A\u0641\u0636\u064A\u0644\u0627\u062A\u0643",
    "Make the app feel familiar": "\u0627\u062C\u0639\u0644 \u0627\u0644\u062A\u0637\u0628\u064A\u0642 \u0645\u0646\u0627\u0633\u0628\u064B\u0627 \u0644\u0643",
    "Theme Mode": "\u0627\u0644\u0645\u0638\u0647\u0631",
    "Emerald & Ivory": "\u0627\u0644\u0632\u0645\u0631\u062F \u0648\u0627\u0644\u0639\u0627\u062C",
    "Night Emerald": "\u0627\u0644\u0632\u0645\u0631\u062F \u0627\u0644\u0644\u064A\u0644\u064A",
    "Sound Pack": "\u0627\u0644\u0623\u0635\u0648\u0627\u062A",
    "Digital": "\u0631\u0642\u0645\u064A",
    "Clicks": "\u0646\u0642\u0631\u0627\u062A",
    "Gong": "\u062C\u0631\u0633",
    "Accent": "\u0627\u0644\u0644\u0648\u0646 \u0627\u0644\u0631\u0626\u064A\u0633\u064A",
    "Emerald": "\u0632\u0645\u0631\u062F\u064A",
    "Teal": "\u0641\u064A\u0631\u0648\u0632\u064A",
    "Copper": "\u0646\u062D\u0627\u0633\u064A",
    "Violet": "\u0628\u0646\u0641\u0633\u062C\u064A",
    "Weight": "\u0627\u0644\u0648\u0632\u0646",
    "Run guided setup again": "\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0625\u0639\u062F\u0627\u062F \u0627\u0644\u0645\u0648\u062C\u0651\u0647",
    "Install AWJ on this device": "\u062A\u062B\u0628\u064A\u062A \u0623\u0648\u062C \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u062C\u0647\u0627\u0632",
    "Log set": "\u0633\u062C\u0651\u0644 \u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0629",
    "Log Set": "\u0633\u062C\u0651\u0644 \u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0629",
    "Rest": "\u0631\u0627\u062D\u0629",
    "REST": "\u0631\u0627\u062D\u0629",
    "Pause": "\u0625\u064A\u0642\u0627\u0641 \u0645\u0624\u0642\u062A",
    "Skip": "\u062A\u062E\u0637\u0651\u064E",
    "Finish": "\u0625\u0646\u0647\u0627\u0621",
    "Finish workout": "\u0625\u0646\u0647\u0627\u0621 \u0627\u0644\u062A\u0645\u0631\u064A\u0646",
    "Finish session": "\u0625\u0646\u0647\u0627\u0621 \u0627\u0644\u062C\u0644\u0633\u0629",
    "Next set": "\u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u062A\u0627\u0644\u064A\u0629",
    "Start now": "\u0627\u0628\u062F\u0623 \u0627\u0644\u0622\u0646",
    "Weight (kg)": "\u0627\u0644\u0648\u0632\u0646 (\u0643\u062C\u0645)",
    "Reps": "\u0627\u0644\u062A\u0643\u0631\u0627\u0631\u0627\u062A",
    "Use the planned session": "\u0627\u062A\u0628\u0639 \u0627\u0644\u062C\u0644\u0633\u0629 \u0627\u0644\u0645\u062E\u0637\u0637\u0629",
    "There is not enough reliable data to adjust the plan. Use your warm-up and effort rating as the final check.": "\u0644\u0627 \u062A\u0648\u062C\u062F \u0628\u064A\u0627\u0646\u0627\u062A \u0643\u0627\u0641\u064A\u0629 \u0644\u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u062E\u0637\u0629. \u0627\u0633\u062A\u0639\u0646 \u0628\u0627\u0644\u0625\u062D\u0645\u0627\u0621 \u0648\u062A\u0642\u064A\u064A\u0645 \u0645\u062C\u0647\u0648\u062F\u0643 \u0642\u0628\u0644 \u0627\u0644\u0645\u062A\u0627\u0628\u0639\u0629.",
    "More recovery observations are needed.": "\u0646\u062D\u062A\u0627\u062C \u0625\u0644\u0649 \u0645\u0632\u064A\u062F \u0645\u0646 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u0639\u0627\u0641\u064A.",
    "No imported health data": "\u0644\u0627 \u062A\u0648\u062C\u062F \u0628\u064A\u0627\u0646\u0627\u062A \u0635\u062D\u064A\u0629 \u0645\u0633\u062A\u0648\u0631\u062F\u0629",
    "Start today": "\u0627\u0628\u062F\u0623 \u0627\u0644\u064A\u0648\u0645",
    "completed": "\u0645\u0643\u062A\u0645\u0644",
    "not completed": "\u063A\u064A\u0631 \u0645\u0643\u062A\u0645\u0644",
    "All": "\u0627\u0644\u0643\u0644",
    "Pending": "\u0627\u0644\u0645\u062A\u0628\u0642\u064A",
    "Done": "\u0645\u0643\u062A\u0645\u0644",
    "Check-ins stay available offline and update the Habit Log in Notion directly.": "\u062A\u0638\u0644 \u0627\u0644\u0645\u062A\u0627\u0628\u0639\u0629 \u0645\u062A\u0627\u062D\u0629 \u062F\u0648\u0646 \u0627\u062A\u0635\u0627\u0644\u060C \u0648\u064A\u064F\u062D\u062F\u0651\u064E\u062B \u0633\u062C\u0644 \u0627\u0644\u0639\u0627\u062F\u0627\u062A \u0641\u064A \u0646\u0648\u0634\u0646 \u0639\u0646\u062F \u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629.",
    "A new offline version is ready.": "\u064A\u062A\u0648\u0641\u0631 \u0625\u0635\u062F\u0627\u0631 \u062C\u062F\u064A\u062F \u062C\u0627\u0647\u0632 \u0644\u0644\u0639\u0645\u0644 \u062F\u0648\u0646 \u0627\u062A\u0635\u0627\u0644.",
    "Update now": "\u0627\u0644\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0622\u0646"
  };
  function translate(value) {
    const trimmed = value.trim();
    if (arabic[trimmed]) return value.replace(trimmed, arabic[trimmed]);
    if (/^Saved on device · \d+ waiting to sync$/.test(trimmed)) return trimmed.replace(/Saved on device · (\d+) waiting to sync/, "\u0645\u062D\u0641\u0648\u0638 \u0639\u0644\u0649 \u0627\u0644\u062C\u0647\u0627\u0632 \xB7 $1 \u0628\u0627\u0646\u062A\u0638\u0627\u0631 \u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629");
    if (/^\d+\/\d+ complete$/.test(trimmed)) return trimmed.replace(" complete", " \u0645\u0643\u062A\u0645\u0644");
    if (/^(All|Pending|Done) \(\d+\)$/.test(trimmed)) return trimmed.replace(/^(All|Pending|Done)/, (word) => arabic[word]);
    if (trimmed.includes(" \xB7 ")) return trimmed.split(" \xB7 ").map(translate).join(" \xB7 ");
    return value;
  }
  var localizeText = (value) => document.documentElement.lang === "ar" ? translate(value) : value;
  var originalText = /* @__PURE__ */ new WeakMap();
  var originalAttributes = /* @__PURE__ */ new WeakMap();
  function applyLocale(root = document) {
    const isArabic = document.documentElement.lang === "ar";
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode, parent = node.parentElement;
      if (!parent || parent.closest("script,style,textarea,input,option,[data-user-content]")) continue;
      const current = node.textContent || "", previous = originalText.get(node);
      if (isArabic) {
        const original = previous && translate(previous) === current ? previous : current;
        originalText.set(node, original);
        node.textContent = translate(original);
      } else if (previous !== void 0) {
        node.textContent = previous;
        originalText.delete(node);
      }
    }
    root.querySelectorAll?.("[aria-label],[placeholder],[title]").forEach((element) => {
      let originals = originalAttributes.get(element);
      if (!originals) {
        originals = /* @__PURE__ */ new Map();
        originalAttributes.set(element, originals);
      }
      for (const attribute of ["aria-label", "placeholder", "title"]) {
        const value = element.getAttribute(attribute);
        if (!value) continue;
        if (isArabic) {
          const previous = originals.get(attribute), original = previous && translate(previous) === value ? previous : value;
          originals.set(attribute, original);
          element.setAttribute(attribute, translate(original));
        } else if (originals.has(attribute)) {
          element.setAttribute(attribute, originals.get(attribute));
          originals.delete(attribute);
        }
      }
    });
  }

  // src/client/app-shell.js
  (function() {
    const nav = window.AWJ_NAVIGATION, core = window.AWJ_CORE_PAGES, preferences = window.AWJ_TRAINING_PREFERENCES;
    const route = (id) => nav.navigate(id), date = () => isoDay();
    preferences.normalize(state);
    const arabicCopy = { Today: "\u0627\u0644\u064A\u0648\u0645", Train: "\u0627\u0644\u062A\u0645\u0631\u064A\u0646", Nutrition: "\u0627\u0644\u062A\u063A\u0630\u064A\u0629", Wellbeing: "\u0627\u0644\u0639\u0627\u0641\u064A\u0629", Progress: "\u0627\u0644\u062A\u0642\u062F\u0645", Recovery: "\u0627\u0644\u062A\u0639\u0627\u0641\u064A", "Daily routines": "\u0627\u0644\u0639\u0627\u062F\u0627\u062A \u0627\u0644\u064A\u0648\u0645\u064A\u0629", "Your planned sessions, favourite routines and exercise library.": "\u062C\u0644\u0633\u0627\u062A\u0643 \u0627\u0644\u0645\u062E\u0637\u0637\u0629 \u0648\u062A\u0645\u0627\u0631\u064A\u0646\u0643 \u0627\u0644\u0645\u0641\u0636\u0644\u0629 \u0648\u0645\u0643\u062A\u0628\u0629 \u0627\u0644\u062D\u0631\u0643\u0627\u062A.", "Daily practices and recovery in one place.": "\u0639\u0627\u062F\u0627\u062A\u0643 \u0627\u0644\u064A\u0648\u0645\u064A\u0629 \u0648\u062A\u0639\u0627\u0641\u064A\u0643 \u0641\u064A \u0645\u0643\u0627\u0646 \u0648\u0627\u062D\u062F.", "Sleep and recovery inputs support your training.": "\u064A\u0633\u0627\u0639\u062F \u0627\u0644\u0646\u0648\u0645 \u0648\u0627\u0644\u062A\u0639\u0627\u0641\u064A \u0639\u0644\u0649 \u062A\u0648\u062C\u064A\u0647 \u062A\u0645\u0631\u064A\u0646\u0643.", "Your existing hygiene, wellness and journal routines.": "\u0639\u0627\u062F\u0627\u062A\u0643 \u0627\u0644\u0635\u062D\u064A\u0629 \u0648\u0627\u0644\u064A\u0648\u0645\u064A\u0629 \u0648\u0645\u0644\u0627\u062D\u0638\u0627\u062A\u0643.", "Consistency, performance, and your next step.": "\u0627\u0644\u0627\u0633\u062A\u0645\u0631\u0627\u0631 \u0648\u0627\u0644\u0623\u062F\u0627\u0621 \u0648\u062E\u0637\u0648\u062A\u0643 \u0627\u0644\u062A\u0627\u0644\u064A\u0629.", "Daily practices": "\u0627\u0644\u0639\u0627\u062F\u0627\u062A \u0627\u0644\u064A\u0648\u0645\u064A\u0629", "Habits, hygiene and journal": "\u0627\u0644\u0639\u0627\u062F\u0627\u062A \u0648\u0627\u0644\u0639\u0646\u0627\u064A\u0629 \u0627\u0644\u064A\u0648\u0645\u064A\u0629 \u0648\u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0627\u062A", "Recovery & health": "\u0627\u0644\u062A\u0639\u0627\u0641\u064A \u0648\u0627\u0644\u0635\u062D\u0629", "Sleep, check-ins and measurements": "\u0627\u0644\u0646\u0648\u0645 \u0648\u0627\u0644\u0645\u062A\u0627\u0628\u0639\u0629 \u0648\u0627\u0644\u0642\u064A\u0627\u0633\u0627\u062A", "Today\u2019s focus": "\u062A\u0631\u0643\u064A\u0632 \u0627\u0644\u064A\u0648\u0645", "Recovery day": "\u064A\u0648\u0645 \u0644\u0644\u062A\u0639\u0627\u0641\u064A", "Review recovery": "\u0631\u0627\u062C\u0639 \u0627\u0644\u062A\u0639\u0627\u0641\u064A", "View routines": "\u0639\u0631\u0636 \u0627\u0644\u062A\u0645\u0627\u0631\u064A\u0646", "Start workout": "\u0627\u0628\u062F\u0623 \u0627\u0644\u062A\u0645\u0631\u064A\u0646", "Resume workout": "\u0627\u0633\u062A\u0623\u0646\u0641 \u0627\u0644\u062A\u0645\u0631\u064A\u0646" };
    const tr = (value) => state.preferences?.language === "ar" ? arabicCopy[value] || value : value;
    function enter(view, tab) {
      stopExerciseClock();
      stopSessionClock();
      document.body.classList.remove("workout-mode", "workout-complete-mode", "rest-mode-active");
      timerDock.classList.add("is-hidden");
      timerDock.setAttribute("inert", "");
      if (state.timer?.interval) {
        clearInterval(state.timer.interval);
        state.timer.interval = null;
      }
      state.view = view;
      state.activeTab = tab;
      persistDebounced();
      updatePrimaryTabs();
    }
    function heading(title, description = "") {
      return `<header class="page-heading"><h1>${esc(tr(title))}</h1>${description ? `<p>${esc(tr(description))}</p>` : ""}</header>`;
    }
    function sheet(title, content, bind = () => {
    }) {
      const overlay = document.createElement("div");
      overlay.className = "awj-modal-backdrop";
      overlay.dataset.dialogReady = "true";
      overlay.tabIndex = -1;
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.setAttribute("aria-label", title);
      overlay.innerHTML = AWJ_SAFE_DOM.sanitize(`<section class="awj-modal-sheet"><header class="sheet-header"><h2>${esc(title)}</h2><button class="sheet-close" aria-label="Close">\xD7</button></header>${content}</section>`);
      const previous = document.activeElement;
      let closing = false;
      const close = async () => {
        if (closing) return;
        closing = true;
        await window.AWJ_MOTION.dismiss(overlay);
        if (previous?.isConnected) previous.focus();
      };
      overlay.querySelector(".sheet-close").onclick = close;
      overlay.onclick = (e) => {
        if (e.target === overlay) close();
      };
      overlay.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          close();
        }
        if (event.key === "Tab") {
          const controls = [...overlay.querySelectorAll('button,a[href],input,select,textarea,[tabindex="0"]')].filter((el) => !el.disabled && el.getClientRects().length);
          const first = controls[0], last = controls.at(-1);
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }
      });
      document.body.append(overlay);
      bind(overlay, close);
      overlay.querySelector("button,input")?.focus();
      return overlay;
    }
    function readiness() {
      const engine = window.AWJ_HEALTH_ENGINE, value = engine.readiness(state, date(), state.healthProfile), advice = engine.trainingRecommendation(state, date(), state.healthProfile, value);
      const imported = state.lastVitalsImportDate, age = daysSinceVitalsImport();
      return { value, advice, age, source: imported ? `Health data ${age === 0 ? "today" : `${age} day${age === 1 ? "" : "s"} ago`}` : "No imported health data", confidence: value.confidence || "low" };
    }
    function readinessMarkup() {
      const r = readiness();
      return `<section class="readiness-note"><details><summary><span class="eyebrow">TODAY\u2019S GUIDANCE</span><strong>${esc(r.advice.title)}</strong><span class="guidance-prompt" aria-label="Why this recommendation?">\u2197</span></summary><p>${esc(r.advice.detail || r.advice.message || "Use your warm-up as the final check.")}</p><p>${esc(r.source)} \xB7 ${esc(r.confidence)} confidence</p><p>${r.value.score === null ? "More recovery observations are needed." : `AWJ estimate: ${r.value.score}%`}</p><p>${esc((r.value.reasons || []).map((x) => typeof x === "string" ? x : x.detail || x.label || "").filter(Boolean).join(" "))}</p></details></section>`;
    }
    function saveStatus() {
      const queued = window.AWJ_SYNC_OUTBOX?.summary(state.syncQueue)?.total || 0, storage = window.AWJ_STORE?.saveStatus;
      const label = storage === "failed" ? "Save needs attention \xB7 open backups" : storage === "saving" ? "Saving on device\u2026" : queued ? `Saved on device \xB7 ${queued} waiting to sync` : state.lastSyncedAt ? "Saved on device \xB7 records synced" : "Saved on device";
      return `<button type="button" class="save-status ${queued ? "has-pending" : ""} ${storage === "failed" ? "save-failed" : ""}" data-save-status>${label}</button>`;
    }
    function bindSaveStatus() {
      document.querySelector("[data-save-status]")?.addEventListener("click", () => route(window.AWJ_STORE?.saveStatus === "failed" ? "settings-security" : "settings-sync"));
    }
    window.addEventListener("awj:storage-status", (event) => {
      const button = document.querySelector("[data-save-status]");
      if (button) {
        const holder = document.createElement("div");
        holder.innerHTML = AWJ_SAFE_DOM.sanitize(saveStatus());
        const fresh = holder.firstElementChild;
        if (fresh) {
          button.replaceWith(fresh);
          bindSaveStatus();
        }
      }
      document.querySelector(".awj-save-warning")?.remove();
      if (event.detail.status !== "failed") return;
      const warning = document.createElement("div"), message = document.createElement("span"), action = document.createElement("button");
      warning.className = "awj-save-warning";
      warning.setAttribute("role", "alert");
      message.textContent = "Could not save on this device. Keep AWJ open and check available storage.";
      action.type = "button";
      action.textContent = "Backups and recovery";
      action.addEventListener("click", () => route("settings-security"));
      warning.append(message, action);
      document.body.append(warning);
    });
    function checkin() {
      sheet("Quick recovery check-in", window.AWJ_HEALTH_UI.checkinMarkup(), (_root, close) => window.AWJ_HEALTH_UI.bind({ onSaved: () => {
        close();
        screenRegistry.update();
        showToast("Check-in saved on device.");
      } }));
    }
    function guardStart(id, proceed) {
      if (AWJ_TRAINING_SESSION.isResumableWorkout(state, sessions) && state.session !== id) {
        sheet("Workout in progress", '<p>Resume or explicitly end the current workout before starting another.</p><button class="primary-action" data-resume-active>Resume current workout</button>', (root, close) => root.querySelector("[data-resume-active]").onclick = () => {
          close();
          startSession(state.session, { acknowledgeWarnings: true });
        });
        return true;
      }
      const r = readiness();
      if (r.advice.mode === "pause") {
        sheet("Review your recovery warning", `<p>${esc(r.advice.detail || r.advice.message || r.advice.title)}</p><button class="primary-action" data-review-recovery>Review recovery</button><button data-acknowledge-workout>Record a modified workout</button>`, (root, close) => {
          root.querySelector("[data-review-recovery]").onclick = () => {
            close();
            route("health-vitals");
          };
          root.querySelector("[data-acknowledge-workout]").onclick = () => {
            close();
            proceed();
          };
        });
        return true;
      }
      return false;
    }
    const ui = { enter, heading, readinessMarkup, saveStatus, bindSaveStatus, route, checkin, core, preferences, sheet, date, tr, readiness };
    const { today } = createTodayScreen(ui), { train } = createTrainingScreen(ui), { nutrition } = createNutritionScreen(ui), { progress } = createProgressScreen(ui), { wellbeing, recovery, sleep, strain, routines } = createWellbeingScreens(ui);
    window.AWJ_LOCALE = Object.freeze({ apply: applyLocale, text: localizeText });
    const lifecycle = (mount) => ({ mount() {
      mount();
      applyLocale();
    }, update() {
      mount();
      applyLocale();
    }, destroy() {
      document.querySelectorAll(".awj-modal-backdrop").forEach((node) => node.remove());
    } });
    const screenRegistry = createScreenRegistry({ today: lifecycle(today), train: lifecycle(train), nutrition: lifecycle(nutrition), progress: lifecycle(progress), wellbeing: lifecycle(wellbeing), recovery: lifecycle(recovery), sleep: lifecycle(sleep), strain: lifecycle(strain), routines: lifecycle(routines), settings: createSettingsScreen() });
    const show = (id) => () => screenRegistry.show(id);
    window.AWJ_TRAINING_UI = Object.freeze({ today: show("today"), train: show("train"), nutrition: show("nutrition"), progress: show("progress"), wellbeing: show("wellbeing"), more: show("wellbeing"), recovery: () => ["recovery", "sleep", "strain"].includes(screenRegistry.current()) ? screenRegistry.update() : nav.navigate("health-vitals"), routines: show("routines"), refresh: () => screenRegistry.update(), checkin, sheet, guardStart });
    document.body.classList.add("training-first-app");
    nav.register([{ id: "today", path: "/today", title: "Today", activate: show("today") }, { id: "training-program", path: "/train", aliases: ["/training/program", "/training/today", "/program-active"], title: "Train", activate: show("train") }, { id: "training-today", path: "/training/today", title: "Today", activate: show("today") }, { id: "insights", path: "/progress", aliases: ["/insights"], title: "Progress", activate: show("progress") }, { id: "training-history", path: "/progress/history", aliases: ["/training/history"], title: "History", activate: show("progress") }, { id: "wellbeing", path: "/wellbeing", title: "Wellbeing", activate: show("wellbeing") }, { id: "more", path: "/more", title: "Wellbeing", activate: show("wellbeing") }, { id: "health-vitals", path: "/wellbeing/recovery", aliases: ["/more/recovery", "/health/vitals"], title: "Recovery", activate: show("recovery") }, { id: "health-wellness", path: "/wellbeing/routines", aliases: ["/more/routines", "/health/wellness"], title: "Daily routines", activate: show("routines") }]);
    nav.register([
      { id: "health-sleep", path: "/wellbeing/sleep", title: "Sleep", activate: show("sleep") },
      { id: "health-strain", path: "/wellbeing/strain", title: "Strain", activate: show("strain") },
      ...["today", "log", "plan"].map((view) => ({ id: "nutrition-" + view, path: "/nutrition/" + view, title: "Nutrition", activate: () => {
        state.nutritionView = view;
        screenRegistry.show("nutrition");
      } })),
      ...["general", "schedule", "targets", "coach", "sync", "security"].map((section) => ({ id: "settings-" + section, path: "/settings/" + section, title: "Settings", activate: () => {
        state.settingsSection = section;
        screenRegistry.show("settings");
      } }))
    ]);
    nav.setTabResolver((tab) => ({ home: "today", train: "training-program", food: "nutrition-today", wellbeing: "wellbeing", insights: "insights", more: "wellbeing", health: "health-vitals", vitals: "health-vitals", care: "health-wellness" })[tab] || tab);
    window.addEventListener("awj:navigation", () => {
      updatePrimaryTabs();
      if (["vitals", "care"].includes(state.activeTab) && !app.querySelector("[data-more-back]")) {
        const back = document.createElement("button");
        back.dataset.moreBack = "true";
        back.textContent = "\u2190 Wellbeing";
        back.onclick = () => route("wellbeing");
        app.prepend(back);
      }
    });
    let lastRingRoute = "";
    window.addEventListener("awj:navigation", (event) => {
      if (event.detail.id === lastRingRoute) return;
      lastRingRoute = event.detail.id;
      if (window.AWJ_MOTION.reduced()) return;
      app.querySelectorAll(".ring-value").forEach((circle) => circle.animate([{ strokeDashoffset: 100 }, { strokeDashoffset: Number(circle.getAttribute("stroke-dashoffset")) }], { duration: 360, easing: "ease-out" }));
    });
    nav.start({ fallback: "today" });
    const viewport = window.visualViewport;
    let baselineHeight = window.innerHeight, lastWidth = window.innerWidth, viewportFrame = 0;
    const editable = (element) => element?.matches?.("textarea,input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]):not([type=button]):not([type=submit])") && !element.readOnly && !element.disabled;
    function updateViewport() {
      viewportFrame = 0;
      const scale = viewport?.scale || 1, zoomed = Math.abs(scale - 1) > 0.05, editing = editable(document.activeElement);
      const height = viewport?.height || window.innerHeight, top = viewport?.offsetTop || 0;
      if (Math.abs(window.innerWidth - lastWidth) > 80) {
        baselineHeight = window.innerHeight;
        lastWidth = window.innerWidth;
      }
      if (!editing && !zoomed) baselineHeight = window.innerHeight;
      const inset = Math.max(0, window.innerHeight - height - top);
      const open = Boolean(editing && !zoomed && (inset > 100 || baselineHeight - height > 120));
      document.body.classList.toggle("is-keyboard-open", open);
      const style = document.documentElement.style;
      style.setProperty("--keyboard-bottom", `${open ? Math.round(inset) : 0}px`);
      style.setProperty("--visible-height", `${Math.round(height)}px`);
      style.setProperty("--visible-top", `${Math.round(top)}px`);
      if (open) requestAnimationFrame(() => {
        const input = document.activeElement;
        if (!editable(input)) return;
        const bounds = input.getBoundingClientRect(), action = app.querySelector(".workout-action-band");
        const footer = action?.getClientRects().length ? action.getBoundingClientRect().height + 16 : 16;
        if (bounds.top < top + 12 || bounds.bottom > top + height - footer) input.scrollIntoView({ block: "center", behavior: "instant" });
      });
    }
    const scheduleViewport = () => {
      if (!viewportFrame) viewportFrame = requestAnimationFrame(updateViewport);
    };
    viewport?.addEventListener("resize", scheduleViewport);
    viewport?.addEventListener("scroll", scheduleViewport);
    window.addEventListener("resize", scheduleViewport);
    document.addEventListener("focusin", scheduleViewport);
    document.addEventListener("focusout", () => setTimeout(scheduleViewport, 0));
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" || !event.target.matches("[data-live-log]")) return;
      event.preventDefault();
      const fields = [...app.querySelectorAll("[data-live-log]")], next = fields[fields.indexOf(event.target) + 1];
      if (next) next.focus();
      else event.target.blur();
    });
    document.addEventListener("pointerdown", (event) => {
      if (event.target.closest("[data-keyboard-dismiss]")) {
        event.preventDefault();
        document.activeElement?.blur();
        scheduleViewport();
      }
    });
    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-keyboard-dismiss]")) {
        document.activeElement?.blur();
        scheduleViewport();
      }
    });
    updateViewport();
  })();
})();
