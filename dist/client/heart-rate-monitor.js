/* Web Bluetooth Heart Rate Monitor & Circadian Recovery Zones for Health OS.
   Supports Polar, Garmin, Apple Watch BLE broadcast, Scosche, Whoop, and standard GATT HR straps. */

(function(){
  const HR_SERVICE = 0x180D;
  const HR_CHARACTERISTIC = 0x2A37;

  const state = {
    connected: false,
    deviceName: null,
    currentBpm: null,
    peakBpm: 0,
    minBpm: 999,
    currentZone: 1,
    restingHr: 58,
    maxHr: 192,
    listeners: new Set(),
    simulated: false,
    intervalId: null
  };

  function computeMaxHr(){
    const age = Number(window.state?.healthProfile?.age) || 28;
    return 220 - age;
  }

  function getZone(bpm, maxHr){
    if(!bpm || bpm <= 0) return { zone: 1, name: "Rest", color: "var(--muted)", pct: 0 };
    const pct = Math.round((bpm / maxHr) * 100);
    if(pct < 60) return { zone: 1, name: "Recovery (Z1)", color: "#38bdf8", pct };
    if(pct < 70) return { zone: 2, name: "Aerobic Base (Z2)", color: "#4ade80", pct };
    if(pct < 80) return { zone: 3, name: "Tempo / Cardio (Z3)", color: "var(--acid)", pct };
    if(pct < 90) return { zone: 4, name: "Threshold (Z4)", color: "#fb923c", pct };
    return { zone: 5, name: "Max Effort (Z5)", color: "#f43f5e", pct };
  }

  function parseHeartRate(dataView){
    const flags = dataView.getUint8(0);
    const rate16Bits = flags & 0x1;
    let bpm = 0;
    if(rate16Bits){
      bpm = dataView.getUint16(1, true);
    } else {
      bpm = dataView.getUint8(1);
    }
    return bpm;
  }

  function updateBpm(bpm){
    if(!bpm || bpm < 30 || bpm > 240) return;
    state.currentBpm = bpm;
    if(bpm > state.peakBpm) state.peakBpm = bpm;
    if(bpm < state.minBpm) state.minBpm = bpm;
    state.maxHr = computeMaxHr();
    const zoneInfo = getZone(bpm, state.maxHr);
    state.currentZone = zoneInfo.zone;

    // Notify listeners
    state.listeners.forEach(fn => {
      try { fn({ bpm, zone: zoneInfo, peak: state.peakBpm, min: state.minBpm }); } catch(e){}
    });

    // Update any live DOM badges
    document.querySelectorAll("[data-live-hr-bpm]").forEach(el => el.textContent = bpm);
    document.querySelectorAll("[data-live-hr-badge]").forEach(el => {
      el.style.borderColor = zoneInfo.color;
      el.style.color = zoneInfo.color;
    });
  }

  async function connectBluetooth(){
    if(!navigator.bluetooth){
      throw Error(window.state?.lang === "ar" ? "تقنية Web Bluetooth غير مدعومة في هذا المتصفح. يمكنك تفعيل وضع المحاكاة." : "Web Bluetooth is not supported in this browser. You can use Simulation mode.");
    }
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [HR_SERVICE] }],
        optionalServices: ["battery_service"]
      });

      device.addEventListener("gattserverdisconnected", onDisconnected);
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(HR_SERVICE);
      const characteristic = await service.getCharacteristic(HR_CHARACTERISTIC);
      await characteristic.startNotifications();

      characteristic.addEventListener("characteristicvaluechanged", event => {
        const value = event.target.value;
        const bpm = parseHeartRate(value);
        updateBpm(bpm);
      });

      state.connected = true;
      state.deviceName = device.name || "Bluetooth Heart Rate";
      state.simulated = false;
      return { ok: true, deviceName: state.deviceName };
    } catch(err){
      if(err.name === "NotFoundError" || err.name === "AbortError") {
        return { ok: false, cancelled: true };
      }
      throw err;
    }
  }

  function startSimulation(baseBpm = 135){
    stopSimulation();
    state.connected = true;
    state.simulated = true;
    state.deviceName = window.state?.lang === "ar" ? "محاكي نبضات القلب" : "Simulated HR Monitor";
    let cur = baseBpm;
    updateBpm(cur);
    state.intervalId = setInterval(() => {
      const delta = (Math.random() * 6 - 3);
      cur = Math.max(80, Math.min(185, Math.round(cur + delta)));
      updateBpm(cur);
    }, 1500);
    return { ok: true, deviceName: state.deviceName };
  }

  function stopSimulation(){
    if(state.intervalId){
      clearInterval(state.intervalId);
      state.intervalId = null;
    }
    state.simulated = false;
  }

  function disconnect(){
    stopSimulation();
    state.connected = false;
    state.deviceName = null;
    state.currentBpm = null;
    state.listeners.forEach(fn => fn({ bpm: null, zone: null, peak: 0, min: 0 }));
  }

  function onDisconnected(){
    disconnect();
    if(window.showToast){
      window.showToast(window.state?.lang === "ar" ? "انقطع اتصال حساس نبضات القلب." : "Heart rate monitor disconnected.");
    }
  }

  function subscribe(fn){
    state.listeners.add(fn);
    return () => state.listeners.delete(fn);
  }

  function renderHrBadge(ar){
    if(!state.connected || !state.currentBpm){
      return `<button class="hr-connect-btn" data-open-hr-modal type="button" aria-label="${ar?"ربط حساس النبض":"Connect Heart Rate"}"><span class="hr-icon">💓</span><span>${ar?"ربط النبض":"Connect HR"}</span></button>`;
    }
    const zone = getZone(state.currentBpm, state.maxHr);
    return `<button class="hr-live-badge" data-open-hr-modal data-live-hr-badge type="button" style="border-color:${zone.color};color:${zone.color};" aria-label="Heart Rate ${state.currentBpm} BPM">
      <span class="hr-pulse-dot" style="background:${zone.color};"></span>
      <strong data-live-hr-bpm>${state.currentBpm}</strong>
      <small>BPM</small>
    </button>`;
  }

  function openHrModal(){
    if(document.querySelector(".hr-modal-overlay")) return;
    const ar = window.state?.lang === "ar";
    const overlay = document.createElement("div");
    overlay.className = "timed-mode hr-modal-overlay";
    const maxHr = computeMaxHr();
    const zone = getZone(state.currentBpm || 120, maxHr);

    overlay.innerHTML = REP_SAFE_DOM.sanitize(`
      <div class="workout-preflight-panel" style="max-width:440px;margin:auto;">
        <button class="dialog-close" data-hr-close aria-label="Close">×</button>
        <span class="set-log-kicker" style="color:#f43f5e;">💓 ${ar?"مراقبة النبض ومناطق التدريب":"LIVE HEART RATE & RECOVERY ZONES"}</span>
        <h2 style="margin:4px 0 14px;">${ar?"حساس نبضات القلب":"Heart Rate Monitor"}</h2>
        
        <div class="hr-status-card" style="text-align:center;padding:18px;border-radius:18px;background:linear-gradient(145deg,rgba(244,63,94,.08),var(--panel-2));border:1px solid rgba(244,63,94,.2);margin-bottom:14px;">
          <div style="font-size:36px;font-weight:900;color:${zone.color};">
            <span data-modal-hr-bpm>${state.currentBpm || "—"}</span> <small style="font-size:16px;color:var(--muted);">BPM</small>
          </div>
          <div style="margin-top:4px;font-size:12px;font-weight:800;color:${zone.color};" data-modal-hr-zone>
            ${state.connected ? zone.name : (ar ? "غير متصل" : "Not connected")}
          </div>
          <small style="display:block;margin-top:4px;color:var(--muted);font-size:11px;">
            ${state.connected ? `${ar?"الجهاز المتصل: ":"Device: "} ${esc(state.deviceName)}` : (ar ? "يدعم Polar, Garmin, Apple Watch BLE, Whoop" : "Supports Polar, Garmin, Apple Watch BLE, Whoop")}
          </small>
        </div>

        <div class="hr-zones-breakdown" style="display:grid;gap:6px;margin-bottom:14px;font-size:11px;">
          <div style="display:flex;justify-content:space-between;padding:6px 10px;border-radius:8px;background:rgba(56,189,248,.08);color:#38bdf8;">
            <strong>Z1: Active Recovery (<60%)</strong><span>< ${Math.round(maxHr * 0.6)} BPM</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:6px 10px;border-radius:8px;background:rgba(74,222,128,.08);color:#4ade80;">
            <strong>Z2: Aerobic Base (60–70%)</strong><span>${Math.round(maxHr * 0.6)}–${Math.round(maxHr * 0.7)} BPM</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:6px 10px;border-radius:8px;background:rgba(201,255,61,.08);color:var(--acid);">
            <strong>Z3: Tempo / Hypertrophy (70–80%)</strong><span>${Math.round(maxHr * 0.7)}–${Math.round(maxHr * 0.8)} BPM</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:6px 10px;border-radius:8px;background:rgba(251,146,60,.08);color:#fb923c;">
            <strong>Z4: Lactate Threshold (80–90%)</strong><span>${Math.round(maxHr * 0.8)}–${Math.round(maxHr * 0.9)} BPM</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:6px 10px;border-radius:8px;background:rgba(244,63,94,.08);color:#f43f5e;">
            <strong>Z5: Max Effort (90%+)</strong><span>>${Math.round(maxHr * 0.9)} BPM</span>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          ${!state.connected ? `
            <button class="settings-primary" data-hr-ble-connect style="background:#f43f5e;color:#fff;">
              🔍 ${ar?"بحث عبر Bluetooth":"Pair Bluetooth HR"}
            </button>
            <button class="settings-primary" data-hr-sim-connect style="background:var(--panel-2);color:var(--text);border:1px solid var(--line);">
              ⚡ ${ar?"محاكاة تجريبية":"Simulate HR"}
            </button>
          ` : `
            <button class="settings-primary" data-hr-disconnect style="grid-column:1/-1;background:var(--panel-2);color:#f43f5e;border:1px solid rgba(244,63,94,.3);">
              ✕ ${ar?"قطع الاتصال":"Disconnect Sensor"}
            </button>
          `}
        </div>
      </div>
    `);
    document.body.appendChild(overlay);

    const closeBtn = overlay.querySelector("[data-hr-close]");
    const unsubscribe = subscribe(({ bpm, zone }) => {
      const bpmEl = overlay.querySelector("[data-modal-hr-bpm]");
      const zoneEl = overlay.querySelector("[data-modal-hr-zone]");
      if(bpmEl && bpm) bpmEl.textContent = bpm;
      if(zoneEl && zone) {
        zoneEl.textContent = zone.name;
        zoneEl.style.color = zone.color;
      }
    });

    closeBtn.onclick = () => {
      unsubscribe();
      overlay.remove();
    };

    overlay.querySelector("[data-hr-ble-connect]")?.addEventListener("click", async () => {
      try {
        await connectBluetooth();
        unsubscribe();
        overlay.remove();
        if(window.renderExercise) window.renderExercise();
      } catch(e){
        if(window.showToast) window.showToast(String(e.message || e));
      }
    });

    overlay.querySelector("[data-hr-sim-connect]")?.addEventListener("click", () => {
      startSimulation();
      unsubscribe();
      overlay.remove();
      if(window.renderExercise) window.renderExercise();
      if(window.showToast) window.showToast(ar?"تم تفعيل وضع محاكاة نبضات القلب.":"Heart rate simulation started.");
    });

    overlay.querySelector("[data-hr-disconnect]")?.addEventListener("click", () => {
      disconnect();
      unsubscribe();
      overlay.remove();
      if(window.renderExercise) window.renderExercise();
    });
  }

  function esc(s){ return String(s||"").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

  window.REP_HEART_RATE = {
    getState: () => ({ ...state }),
    connectBluetooth,
    startSimulation,
    stopSimulation,
    disconnect,
    subscribe,
    getZone,
    renderHrBadge,
    openHrModal
  };
})();
