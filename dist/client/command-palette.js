/* Universal Command Palette & Quick Launcher for Rep Gym Companion.
   Enables instant keyboard-driven and touch-driven navigation across workouts, tools, and insights. */

(function(){
  function getActions(state){
    const ar = state.lang === "ar";
    return [
      // Navigation
      { id: "nav-today", title: ar ? "الرئيسية · اليوم" : "Home · Today", category: ar ? "تنقل" : "Navigation", icon: "🏠", action: () => window.setPrimaryTab?.("today") },
      { id: "nav-training", title: ar ? "التدريب · التمارين" : "Training · Workouts", category: ar ? "تنقل" : "Navigation", icon: "🏋️", action: () => window.setPrimaryTab?.("training") },
      { id: "nav-food", title: ar ? "التغذية · متتبع الوجبات" : "Nutrition · Food Tracker", category: ar ? "تنقل" : "Navigation", icon: "🥗", action: () => window.setPrimaryTab?.("food") },
      { id: "nav-vitals", title: ar ? "العلامات الحيوية والنوم" : "Vitals · Recovery & Sleep", category: ar ? "تنقل" : "Navigation", icon: "❤️", action: () => window.setPrimaryTab?.("health") },
      { id: "nav-insights", title: ar ? "التحليلات والذكاء التدريبي" : "Insights · Strength & Habits", category: ar ? "تنقل" : "Navigation", icon: "📈", action: () => window.setPrimaryTab?.("insights") },
      { id: "nav-settings", title: ar ? "الإعدادات والأمان" : "Settings & Security", category: ar ? "تنقل" : "Navigation", icon: "⚙️", action: () => window.renderRepSettings?.() },

      // Quick Tools
      { id: "tool-plate", title: ar ? "حاسبة أوزان الباربل (Plate Math)" : "Barbell Plate Math Calculator", category: ar ? "أدوات" : "Tools", icon: "🏋️", action: () => window.showPlateCalculator?.(60) },
      { id: "tool-pdf", title: ar ? "تصدير بطاقة الدورة التدريبية (PDF)" : "Export Mesocycle Report (PDF)", category: ar ? "أدوات" : "Tools", icon: "📄", action: () => window.REP_REPORT_CARD?.openPrintableReport(state) },
      { id: "tool-sync", title: ar ? "مزامنة كل شيء الآن" : "Sync Everything Now", category: ar ? "أدوات" : "Tools", icon: "🔄", action: () => window.REP_SYNC_RUNTIME?.syncEverything?.() },
      { id: "tool-import", title: ar ? "استيراد بيانات (Strong / Hevy / Apple Health)" : "Import Data (Strong / Hevy / Apple Health)", category: ar ? "أدوات" : "Tools", icon: "📥", action: () => { window.renderRepSettings?.("general"); document.querySelector(".data-migration-card")?.scrollIntoView({ behavior: "smooth" }); } },
      { id: "tool-preview", title: ar ? "تبديل وضع المعاينة التجريبي (بدون حفظ)" : "Toggle Preview / Sandbox Mode (No Saving)", category: ar ? "أدوات" : "Tools", icon: "🔬", action: () => window.togglePreviewMode?.() },
      { id: "tool-lang", title: ar ? "Switch to English" : "التبديل إلى العربية", category: ar ? "تفضيلات" : "Preferences", icon: "🌐", action: () => document.querySelector("#langButton")?.click() },

      // Workouts
      { id: "wo-gym", title: ar ? "بدء حصة الجيم (Full Body Push / Pull)" : "Start Gym Workout (Full Body Push/Pull)", category: ar ? "تمارين" : "Workouts", icon: "⚡", action: () => window.showSessionPreview?.("gym") },
      { id: "wo-cardio", title: ar ? "بدء حصة الكارديو (Incline Walk)" : "Start Cardio Session (Incline Walk)", category: ar ? "تمارين" : "Workouts", icon: "🏃", action: () => window.showSessionPreview?.("cardio") },
      { id: "wo-bad", title: ar ? "حصة يوم الإرهاق (Bad Day Active Recovery)" : "Low-Energy Recovery Session", category: ar ? "تمارين" : "Workouts", icon: "🌿", action: () => window.showSessionPreview?.("bad") }
    ];
  }

  function openPalette(){
    if(document.querySelector(".command-palette-overlay")) return;
    const ar = window.state?.lang === "ar";
    const actions = getActions(window.state || {});
    let selectedIdx = 0;

    const overlay = document.createElement("div");
    overlay.className = "command-palette-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", ar ? "لوحة الأوامر السريعة" : "Command Palette");

    overlay.innerHTML = `
      <div class="command-palette-modal">
        <div class="palette-input-wrap">
          <span class="palette-search-icon">🔍</span>
          <input type="text" class="palette-input" placeholder="${ar ? "ابحث عن تمرين، أداة، أو إعداد… (Esc للإغلاق)" : "Search exercises, tools, or settings… (Esc to exit)"}" autofocus>
          <kbd class="palette-esc-kbd">ESC</kbd>
        </div>
        <div class="palette-results-list" role="listbox"></div>
      </div>
    `;

    document.body.appendChild(overlay);

    const input = overlay.querySelector(".palette-input");
    const list = overlay.querySelector(".palette-results-list");

    function renderResults(query = ""){
      const q = query.toLowerCase().trim();
      const filtered = q
        ? actions.filter(a => a.title.toLowerCase().includes(q) || a.category.toLowerCase().includes(q))
        : actions;

      if(!filtered.length){
        list.innerHTML = `<div class="palette-empty">${ar ? "لا توجد نتائج مطابقة." : "No matching actions found."}</div>`;
        return;
      }

      selectedIdx = Math.max(0, Math.min(selectedIdx, filtered.length - 1));

      list.innerHTML = filtered.map((item, idx) => `
        <button type="button" class="palette-item ${idx === selectedIdx ? "is-selected" : ""}" data-idx="${idx}" role="option" aria-selected="${idx === selectedIdx}">
          <span class="palette-item-icon">${item.icon}</span>
          <div class="palette-item-text">
            <strong>${item.title}</strong>
            <small>${item.category}</small>
          </div>
          <span class="palette-item-arrow">↵</span>
        </button>
      `).join("");

      list.querySelectorAll(".palette-item").forEach(el => {
        el.onclick = () => {
          const idx = Number(el.dataset.idx);
          executeAction(filtered[idx]);
        };
      });

      const activeEl = list.querySelector(".palette-item.is-selected");
      activeEl?.scrollIntoView({ block: "nearest" });
    }

    function executeAction(item){
      if(!item) return;
      closePalette();
      try { item.action(); } catch(e){ console.error(e); }
    }

    function closePalette(){
      overlay.remove();
      document.removeEventListener("keydown", handleKeydown);
    }

    function handleKeydown(e){
      if(e.key === "Escape"){
        e.preventDefault();
        closePalette();
        return;
      }

      const q = input.value.toLowerCase().trim();
      const filtered = q
        ? actions.filter(a => a.title.toLowerCase().includes(q) || a.category.toLowerCase().includes(q))
        : actions;

      if(e.key === "ArrowDown"){
        e.preventDefault();
        if(filtered.length){
          selectedIdx = (selectedIdx + 1) % filtered.length;
          renderResults(input.value);
        }
      } else if(e.key === "ArrowUp"){
        e.preventDefault();
        if(filtered.length){
          selectedIdx = (selectedIdx - 1 + filtered.length) % filtered.length;
          renderResults(input.value);
        }
      } else if(e.key === "Enter"){
        e.preventDefault();
        if(filtered[selectedIdx]){
          executeAction(filtered[selectedIdx]);
        }
      }
    }

    overlay.onclick = e => {
      if(e.target === overlay) closePalette();
    };

    input.oninput = e => {
      selectedIdx = 0;
      renderResults(e.target.value);
    };

    document.addEventListener("keydown", handleKeydown);
    renderResults();
    setTimeout(() => input.focus(), 50);
  }

  // Global shortcut: Cmd+K / Ctrl+K
  document.addEventListener("keydown", e => {
    if((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k"){
      e.preventDefault();
      openPalette();
    }
  });

  const commandPalette = {
    open: openPalette
  };

  if(typeof window !== "undefined"){
    window.REP_COMMAND_PALETTE = commandPalette;
  }
  if(typeof globalThis !== "undefined"){
    globalThis.REP_COMMAND_PALETTE = commandPalette;
  }
})();
