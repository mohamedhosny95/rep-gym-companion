(function(){
  'use strict';

  const PLATE_DEFINITIONS = [
    { kg: 25, color: "#e53935", textColor: "#fff", heightPct: 100, width: 18, label: "25" },
    { kg: 20, color: "#2979ff", textColor: "#fff", heightPct: 100, width: 16, label: "20" },
    { kg: 15, color: "#ffd600", textColor: "#111", heightPct: 88, width: 14, label: "15" },
    { kg: 10, color: "#00e676", textColor: "#111", heightPct: 75, width: 12, label: "10" },
    { kg: 5,  color: "#f5f5f5", textColor: "#111", heightPct: 58, width: 10, label: "5" },
    { kg: 2.5, color: "#ff5252", textColor: "#fff", heightPct: 46, width: 8, label: "2.5" },
    { kg: 1.25, color: "#cfd8dc", textColor: "#111", heightPct: 36, width: 7, label: "1.25" }
  ];

  const BARS = [
    { id: "olympic", kg: 20, en: "Olympic Bar (20 kg)" },
    { id: "womens",  kg: 15, en: "Women's Bar (15 kg)" },
    { id: "ez",      kg: 10, en: "EZ Curl Bar (10 kg)" },
    { id: "smith",   kg: 0,  en: "Smith Machine / Sled (0 kg)" }
  ];

  function calculatePlates(targetKg, barKg = 20, availablePlates = [20, 10, 5, 2.5, 1.25]) {
    const remainder = Math.max(0, targetKg - barKg);
    const perSide = remainder / 2;
    let current = perSide;
    const loaded = [];

    const sortedPlates = [...availablePlates].sort((a, b) => b - a);

    for (const plateKg of sortedPlates) {
      const def = PLATE_DEFINITIONS.find(p => p.kg === plateKg) || { kg: plateKg, color: "#9e9e9e", textColor: "#fff", heightPct: 60, width: 10, label: String(plateKg) };
      const count = Math.floor(current / plateKg);
      if (count > 0) {
        for (let i = 0; i < count; i++) loaded.push(def);
        current = Math.round((current - count * plateKg) * 100) / 100;
      }
    }

    return {
      targetKg,
      barKg,
      perSide: Math.round(perSide * 10) / 10,
      plates: loaded,
      remainder: Math.round(current * 2 * 10) / 10
    };
  }

  function renderBarbellSvg(plates) {
    const svgWidth = 320;
    const svgHeight = 120;
    const centerY = svgHeight / 2;
    const sleeveStartX = 50;
    const sleeveLength = 250;
    const barHeight = 14;
    const collarWidth = 12;
    const collarHeight = 60;

    let platesSvg = "";
    let currentX = sleeveStartX + collarWidth + 4;

    for (const plate of plates) {
      const pHeight = (plate.heightPct / 100) * (svgHeight - 16);
      const pY = centerY - pHeight / 2;
      platesSvg += `
        <g class="plate-group">
          <rect x="${currentX}" y="${pY}" width="${plate.width}" height="${pHeight}" rx="3" fill="${plate.color}" stroke="rgba(0,0,0,0.3)" stroke-width="1.5"/>
          <text x="${currentX + plate.width / 2}" y="${centerY + 4}" font-size="${plate.width > 12 ? 10 : 8}" font-weight="900" text-anchor="middle" fill="${plate.textColor}" transform="rotate(-90 ${currentX + plate.width / 2} ${centerY + 4})">${plate.label}</text>
        </g>
      `;
      currentX += plate.width + 2;
    }

    // Clamp collar
    const clampX = Math.min(currentX + 2, sleeveStartX + sleeveLength - 16);
    const clampSvg = plates.length ? `<rect x="${clampX}" y="${centerY - 20}" width="8" height="40" rx="2" fill="#78909c" stroke="#37474f" stroke-width="1"/>` : "";

    return `
      <svg class="barbell-sleeve-svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="100%" height="120" xmlns="http://www.w3.org/2000/svg">
        <!-- Shaft & Collar -->
        <rect x="0" y="${centerY - barHeight / 2}" width="${sleeveStartX}" height="${barHeight}" fill="#546e7a" rx="2"/>
        <rect x="${sleeveStartX}" y="${centerY - collarHeight / 2}" width="${collarWidth}" height="${collarHeight}" fill="#37474f" rx="3"/>
        <!-- Sleeve -->
        <rect x="${sleeveStartX + collarWidth}" y="${centerY - (barHeight + 6) / 2}" width="${sleeveLength}" height="${barHeight + 6}" fill="#78909c" rx="2"/>
        <!-- End Cap -->
        <circle cx="${sleeveStartX + sleeveLength}" cy="${centerY}" r="${(barHeight + 6) / 2}" fill="#37474f"/>
        <!-- Plates -->
        ${platesSvg}
        <!-- Clamp -->
        ${clampSvg}
      </svg>
    `;
  }

  function openPlateCalculator(options = {}) {
    let currentWeight = Number(options.initialWeight) || 60;
    let selectedBarId = options.barId || "olympic";

    const modal = document.createElement("div");
    modal.className = "rep-modal-backdrop plate-calc-backdrop";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label",  "Barbell Plate Calculator");

    function renderModalContent() {
      const barDef = BARS.find(b => b.id === selectedBarId) || BARS[0];
      const result = calculatePlates(currentWeight, barDef.kg);

      const plateSummary = result.plates.reduce((acc, p) => {
        acc[p.kg] = (acc[p.kg] || 0) + 1;
        return acc;
      }, {});

      const summaryList = Object.entries(plateSummary)
        .sort((a, b) => Number(b[0]) - Number(a[0]))
        .map(([kg, count]) => {
          const def = PLATE_DEFINITIONS.find(p => p.kg === Number(kg));
          return `<span class="plate-badge" style="background:${def?.color||'#9e9e9e'};color:${def?.textColor||'#fff'};">${count} × ${kg}kg</span>`;
        }).join("");

      modal.innerHTML = REP_SAFE_DOM.sanitize(`
        <div class="rep-modal-sheet plate-calc-sheet">
          <div class="sheet-header">
            <div>
              <small style="color:var(--acid);font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;">${ "BARBELL PLATE CALCULATOR"}</small>
              <h2 style="font-size:18px;margin:2px 0 0;">${currentWeight} kg <span style="font-size:13px;font-weight:700;color:var(--muted);">${ `(${result.perSide} kg/side)`}</span></h2>
            </div>
            <button class="sheet-close" type="button" aria-label="${ 'Close'}">✕</button>
          </div>

          <div class="plate-visualizer-wrap">
            ${renderBarbellSvg(result.plates)}
          </div>

          <div class="plate-summary-row">
            ${summaryList || `<span style="color:var(--muted);font-size:12px;">${ "Bar only (no plates needed)"}</span>`}
          </div>

          ${result.remainder > 0 ? `<p class="plate-remainder-note" style="color:var(--orange);font-size:11px;margin:4px 0 10px;">⚠️ ${ `Remaining ${result.remainder} kg cannot be matched with 1.25kg plates.`}</p>` : ''}

          <div class="plate-stepper-grid">
            <button type="button" data-adj="-10">-10</button>
            <button type="button" data-adj="-5">-5</button>
            <button type="button" data-adj="-2.5">-2.5</button>
            <button type="button" data-adj="+2.5">+2.5</button>
            <button type="button" data-adj="+5">+5</button>
            <button type="button" data-adj="+10">+10</button>
          </div>

          <div class="plate-bar-selector">
            <label style="display:block;font-size:11px;font-weight:800;color:var(--muted);margin-bottom:6px;">${ "Bar Type"}</label>
            <div class="bar-pill-grid">
              ${BARS.map(b => `
                <button type="button" data-bar="${b.id}" class="${selectedBarId === b.id ? 'is-active' : ''}">${ b.en}</button>
              `).join("")}
            </div>
          </div>

          <div class="sheet-actions">
            ${options.onApply ? `<button type="button" class="btn-apply" style="flex:1;height:48px;border:0;border-radius:12px;background:var(--acid);color:var(--acid-ink);font-size:13px;font-weight:900;cursor:pointer;">${ `Apply (${currentWeight} kg)`}</button>` : ''}
            <button type="button" class="btn-done" style="flex:1;height:48px;border:1px solid var(--line);border-radius:12px;background:var(--panel);color:var(--text);font-size:13px;font-weight:900;cursor:pointer;">${ "Done"}</button>
          </div>
        </div>
      `);

      // Bind listeners
      modal.querySelector(".sheet-close").onclick = () => modal.remove();
      modal.querySelector(".btn-done").onclick = () => modal.remove();
      if (options.onApply) {
        modal.querySelector(".btn-apply").onclick = () => {
          options.onApply(currentWeight);
          modal.remove();
        };
      }

      modal.querySelectorAll("[data-adj]").forEach(btn => {
        btn.onclick = () => {
          const delta = parseFloat(btn.dataset.adj);
          currentWeight = Math.max(barDef.kg, Math.round((currentWeight + delta) * 10) / 10);
          renderModalContent();
        };
      });

      modal.querySelectorAll("[data-bar]").forEach(btn => {
        btn.onclick = () => {
          selectedBarId = btn.dataset.bar;
          const newBar = BARS.find(b => b.id === selectedBarId);
          if (newBar && currentWeight < newBar.kg) currentWeight = newBar.kg;
          renderModalContent();
        };
      });
    }

    renderModalContent();
    document.body.appendChild(modal);
  }

  window.REP_PLATE_CALCULATOR = {
    calculatePlates,
    openPlateCalculator
  };
})();
