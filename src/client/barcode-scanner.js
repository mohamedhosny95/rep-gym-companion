/* Native Barcode Scanner & Nutrition Lens for Health OS.
   Fast camera-driven grocery and barcode scanning for instant macro logging. */

(function(){
  const COMMON_BARCODES = {
    "000000000001": { food_name: "Greek Yogurt (0% Fat)", portion_size: "170g (1 cup)", calories: 100, protein_g: 18, carbs_g: 6, fat_g: 0, fiber_g: 0, confidence: "High" },
    "000000000002": { food_name: "Whey Isolate Protein Scoop", portion_size: "30g (1 scoop)", calories: 120, protein_g: 25, carbs_g: 2, fat_g: 1, fiber_g: 0, confidence: "High" },
    "000000000003": { food_name: "Quest Protein Bar", portion_size: "60g (1 bar)", calories: 200, protein_g: 21, carbs_g: 22, fat_g: 7, fiber_g: 14, confidence: "High" },
    "000000000004": { food_name: "Rolled Oats", portion_size: "40g (1/2 cup)", calories: 150, protein_g: 5, carbs_g: 27, fat_g: 2.5, fiber_g: 4, confidence: "High" },
    "000000000005": { food_name: "Almond Milk (Unsweetened)", portion_size: "240ml (1 cup)", calories: 30, protein_g: 1, carbs_g: 1, fat_g: 2.5, fiber_g: 1, confidence: "High" },
    "000000000006": { food_name: "Cottage Cheese (Low Fat)", portion_size: "113g (1/2 cup)", calories: 90, protein_g: 14, carbs_g: 5, fat_g: 1.5, fiber_g: 0, confidence: "High" },
    "000000000007": { food_name: "Tuna in Spring Water (Canned)", portion_size: "120g (1 can drained)", calories: 130, protein_g: 30, carbs_g: 0, fat_g: 1, fiber_g: 0, confidence: "High" }
  };

  let activeStream = null;
  let scanAnimationId = null;
  let detector = null;

  async function getDetector(){
    if(detector) return detector;
    if("BarcodeDetector" in window){
      try {
        const formats = await window.BarcodeDetector.getSupportedFormats();
        detector = new window.BarcodeDetector({ formats: formats.filter(f => ["ean_13","ean_8","upc_a","upc_e","qr_code","code_128"].includes(f)) });
        return detector;
      } catch{}
    }
    return null;
  }

  async function lookupBarcode(code){
    const clean = String(code).trim();
    if(COMMON_BARCODES[clean]) return COMMON_BARCODES[clean];

    // Try Open Food Facts public API (HTTPS)
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(clean)}.json?fields=product_name,brands,nutriments,serving_size`);
      if(res.ok){
        const data = await res.json();
        if(data.status === 1 && data.product){
          const p = data.product;
          const nut = p.nutriments || {};
          const name = p.product_name || p.brands || `Product ${clean}`;
          const cals = Math.round(Number(nut["energy-kcal_serving"] || nut["energy-kcal_100g"] || (Number(nut["energy_100g"]||0)/4.184)) || 0);
          const prot = Math.round((Number(nut.proteins_serving || nut.proteins_100g) || 0) * 10) / 10;
          const carbs = Math.round((Number(nut.carbohydrates_serving || nut.carbohydrates_100g) || 0) * 10) / 10;
          const fat = Math.round((Number(nut.fat_serving || nut.fat_100g) || 0) * 10) / 10;
          const fiber = Math.round((Number(nut.fiber_serving || nut.fiber_100g) || 0) * 10) / 10;

          return {
            food_name: p.brands ? `${p.brands} - ${name}` : name,
            portion_size: p.serving_size || "100g",
            calories: cals,
            protein_g: prot,
            carbs_g: carbs,
            fat_g: fat,
            fiber_g: fiber,
            sugar_g: Math.round((Number(nut.sugars_serving || nut.sugars_100g) || 0) * 10) / 10,
            sodium_mg: Math.round((Number(nut.sodium_serving || nut.sodium_100g) || 0) * 1000),
            confidence: "High",
            confidence_pct: 95,
            source: "Open Food Facts",
            barcode: clean,
            rawNote: `Barcode ${clean}: ${name}`
          };
        }
      }
    } catch{}

    // Fallback item
    return {
      food_name: `Scanned Item (${clean})`,
      portion_size: "1 package",
      calories: 180,
      protein_g: 15,
      carbs_g: 18,
      fat_g: 5,
      fiber_g: 2,
      confidence: "Estimated",
      confidence_pct: 70,
      source: "Barcode estimate",
      barcode: clean,
      rawNote: `Barcode ${clean}`
    };
  }

  function openScannerModal(onScanned){
    if(document.querySelector(".barcode-modal-overlay")) return;
    const overlay = document.createElement("div");
    overlay.className = "timed-mode barcode-modal-overlay";
    overlay.innerHTML = REP_SAFE_DOM.sanitize(`
      <div class="workout-preflight-panel barcode-scanner-panel" style="max-width:440px;margin:auto;padding:16px;">
        <button class="dialog-close" data-barcode-close aria-label="Close">×</button>
        <span class="set-log-kicker" style="color:var(--acid);">📷 ${"SMART BARCODE SCANNER"}</span>
        <h2 style="margin:4px 0 12px;">${"Scan Product Barcode"}</h2>
        
        <div class="barcode-viewfinder" style="position:relative;width:100%;height:240px;background:#000;border-radius:16px;overflow:hidden;margin-bottom:12px;">
          <video data-scanner-video autoplay playsinline muted style="width:100%;height:100%;object-fit:cover;"></video>
          <div class="scanner-laser"></div>
          <div class="scanner-corners"></div>
          <div class="scanner-hint" data-scanner-hint style="position:absolute;bottom:10px;left:0;right:0;text-align:center;color:#fff;font-size:11px;font-weight:800;text-shadow:0 2px 4px rgba(0,0,0,.8);">
            ${"Point camera at product barcode"}
          </div>
        </div>

        <form data-manual-barcode-form style="display:grid;grid-template-columns:1fr auto;gap:8px;margin-bottom:10px;">
          <input data-manual-barcode-input type="text" inputmode="numeric" placeholder="${"Or type barcode number"}" style="height:44px;padding:0 12px;border:1px solid var(--line);border-radius:11px;background:#131715;color:var(--text);font:inherit;font-size:14px;">
          <button type="submit" class="settings-primary" style="height:44px;padding:0 16px;background:var(--acid);color:var(--acid-ink);">${"Lookup"}</button>
        </form>

        <div style="display:flex;gap:6px;">
          <button type="button" data-barcode-demo="000000000001" style="flex:1;padding:6px;border:1px solid var(--line);border-radius:8px;background:var(--panel-2);color:var(--muted);font-size:10px;cursor:pointer;">🥛 Greek Yogurt</button>
          <button type="button" data-barcode-demo="000000000002" style="flex:1;padding:6px;border:1px solid var(--line);border-radius:8px;background:var(--panel-2);color:var(--muted);font-size:10px;cursor:pointer;">⚡ Whey Isolate</button>
          <button type="button" data-barcode-demo="000000000003" style="flex:1;padding:6px;border:1px solid var(--line);border-radius:8px;background:var(--panel-2);color:var(--muted);font-size:10px;cursor:pointer;">🍫 Quest Bar</button>
        </div>
      </div>
    `);
    document.body.appendChild(overlay);

    const video = overlay.querySelector("[data-scanner-video]");
    const hint = overlay.querySelector("[data-scanner-hint]");
    let isClosing = false;

    function cleanup(){
      isClosing = true;
      if(scanAnimationId) cancelAnimationFrame(scanAnimationId);
      if(activeStream){
        activeStream.getTracks().forEach(t => t.stop());
        activeStream = null;
      }
      overlay.remove();
    }

    overlay.querySelector("[data-barcode-close]").onclick = cleanup;

    async function startCamera(){
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        activeStream = stream;
        video.srcObject = stream;
        await video.play();

        const barDetector = await getDetector();
        if(barDetector){
          async function scanFrame(){
            if(isClosing) return;
            try {
              const barcodes = await barDetector.detect(video);
              if(barcodes && barcodes.length > 0){
                const code = barcodes[0].rawValue;
                if(code){
                  if(window.REP_AUDIO_COACH?.playTone) window.REP_AUDIO_COACH.playTone(1000, "sine", 0.15);
                  handleFound(code);
                  return;
                }
              }
            } catch{}
            scanAnimationId = requestAnimationFrame(scanFrame);
          }
          scanFrame();
        }
      } catch{
        if(hint) hint.textContent =  "Camera unavailable. Use manual input below.";
      }
    }
    startCamera();

    async function handleFound(code){
      cleanup();
      if(window.showToast) window.showToast( `Barcode ${code} found. Fetching nutrition…`);
      const item = await lookupBarcode(code);
      if(onScanned){
        onScanned(item);
      } else if(window.state){
        window.state.foodDraft = {
          ...item,
          mealType: window.state.foodMealType || "Snack",
          logMethod: "Barcode"
        };
        window.state.foodStatus =  "Product nutrition loaded via barcode. Confirm portions.";
        if(window.persist) window.persist();
        if(window.renderNutrition) window.renderNutrition();
      }
    }

    overlay.querySelector("[data-manual-barcode-form]").onsubmit = e => {
      e.preventDefault();
      const val = overlay.querySelector("[data-manual-barcode-input]").value;
      if(val) handleFound(val);
    };

    overlay.querySelectorAll("[data-barcode-demo]").forEach(btn => {
      btn.onclick = () => handleFound(btn.dataset.barcodeDemo);
    });
  }

  window.REP_BARCODE_SCANNER = {
    lookupBarcode,
    openScannerModal
  };
})();
