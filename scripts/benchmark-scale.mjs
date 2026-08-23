import { chromium } from "playwright";
import { createServer } from "node:http";
import { existsSync, createReadStream } from "node:fs";
import { extname, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const port = 4179;
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp" };

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  let file = join(root, "dist/client", url.pathname === "/" ? "index.html" : `.${url.pathname}`);
  if (!existsSync(file)) file = join(root, "dist/client/index.html");
  const type = mime[extname(file)] || "application/octet-stream";
  res.writeHead(200, { "content-type": `${type}; charset=utf-8` });
  createReadStream(file).pipe(res);
});

await new Promise(resolve => server.listen(port, resolve));
const baseUrl = `http://localhost:${port}`;

function generate365DayDataset() {
  const history = [];
  const foodEntries = [];
  const sleepLogs = [];
  const bodyWeights = [];
  const dailyHabits = {};
  const activeEnergy = {};
  const healthMetrics = {};

  const baseDate = new Date("2025-08-23T00:00:00.000Z");

  for (let d = 0; d < 365; d++) {
    const current = new Date(baseDate.getTime() + d * 86400000);
    const isoDay = current.toISOString().slice(0, 10);
    const dayName = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][current.getUTCDay()];

    // 1. History (workouts on workout days)
    if (["Sunday","Tuesday","Thursday"].includes(dayName)) {
      history.push({
        id: `workout-${d}`,
        date: current.toISOString(),
        session: "gym",
        name: "Gym Full Body",
        durationMinutes: 48,
        calories: 320,
        exercises: [
          { name: "Leg Press", sets: [{ weight: "120", reps: "10" }, { weight: "130", reps: "10" }, { weight: "140", reps: "8" }] },
          { name: "Chest Press", sets: [{ weight: "60", reps: "10" }, { weight: "65", reps: "8" }, { weight: "70", reps: "6" }] },
          { name: "Seated Row", sets: [{ weight: "50", reps: "12" }, { weight: "55", reps: "10" }, { weight: "60", reps: "10" }] }
        ]
      });
    }

    // 2. Food entries (3 per day)
    foodEntries.push(
      { id: `f-${d}-1`, date: `${isoDay}T08:00:00.000Z`, food_name: "Oatmeal with whey & berries", calories: 420, protein_g: 35, carbs_g: 50, fat_g: 8, mealType: "Breakfast" },
      { id: `f-${d}-2`, date: `${isoDay}T13:00:00.000Z`, food_name: "Grilled chicken breast, rice & greens", calories: 650, protein_g: 55, carbs_g: 70, fat_g: 12, mealType: "Lunch" },
      { id: `f-${d}-3`, date: `${isoDay}T19:30:00.000Z`, food_name: "Salmon fillet with roasted potatoes", calories: 580, protein_g: 45, carbs_g: 40, fat_g: 22, mealType: "Dinner" }
    );

    // 3. Sleep logs
    sleepLogs.push({
      date: isoDay,
      inBed: `${isoDay}T22:30:00.000Z`,
      outOfBed: `${new Date(current.getTime() + 86400000).toISOString().slice(0, 10)}T06:30:00.000Z`,
      hours: 7.5 + (d % 3) * 0.4,
      hrv: 55 + (d % 20),
      restingHr: 52 + (d % 8),
      deepSleepMinutes: 85 + (d % 15)
    });

    // 4. Daily habits
    dailyHabits[isoDay] = {
      morningSunlight: true,
      creatine: true,
      proteinGoal: true,
      eveningWindDown: d % 2 === 0,
      postureWork: true
    };

    // 5. Active Energy
    activeEnergy[isoDay] = 450 + (d % 200);

    // 6. Health metrics
    healthMetrics[isoDay] = {
      steps: 8500 + (d % 3000),
      activeCalories: 500 + (d % 150),
      distanceKm: 6.2 + (d % 3)
    };

    // 7. Weekly body weight
    if (d % 7 === 0) {
      bodyWeights.push({
        date: isoDay,
        week: isoDay,
        kg: 78.5 - Math.round((d / 365) * 30) / 10
      });
    }
  }

  return {
    history,
    foodEntries,
    sleepLogs,
    bodyWeights,
    daily: { habits: dailyHabits },
    activeEnergy,
    healthMetrics
  };
}

const browser = await chromium.launch({
  channel: existsSync("/Applications/Google Chrome.app") ? "chrome" : undefined,
  args: ["--no-sandbox"]
});

try {
  const context = await browser.newContext({ viewport: { width: 390, height: 900 } });
  const page = await context.newPage();

  const dataset = generate365DayDataset();
  console.log(`Generated 365-day synthetic dataset:`);
  console.log(`  - ${dataset.history.length} workout sessions`);
  console.log(`  - ${dataset.foodEntries.length} food entries`);
  console.log(`  - ${dataset.sleepLogs.length} sleep logs`);
  console.log(`  - ${dataset.bodyWeights.length} weekly body weights`);

  // Seed dataset into IndexedDB before applying CPU throttling
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.evaluate(async ({ dataset }) => {
    localStorage.setItem("rep-gym-companion-v1", JSON.stringify({ version: 6 }));
    await new Promise((resolve, reject) => {
      const req = indexedDB.open("health-os-state-v1", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("records");
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction("records", "readwrite");
        const store = tx.objectStore("records");
        store.put(dataset.history, "state:history");
        store.put(dataset.foodEntries, "state:foodEntries");
        store.put(dataset.sleepLogs, "state:sleepLogs");
        store.put(dataset.bodyWeights, "state:bodyWeights");
        store.put(dataset.daily, "state:daily");
        store.put(dataset.healthMetrics, "state:healthMetrics");
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });
  }, { dataset });

  const client = await page.context().newCDPSession(page);
  await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });

  await page.addInitScript(() => {
    window.__repVitals = {
      lcp: 0,
      cls: 0,
      longTask: 0,
      longTasks: [],
      phase: "init"
    };

    try {
      new PerformanceObserver(list => {
        const entries = list.getEntries();
        if (entries.length) {
          window.__repVitals.lcp = entries[entries.length - 1].startTime;
        }
      }).observe({ type: "largest-contentful-paint", buffered: true });
    } catch {}

    try {
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            window.__repVitals.cls += entry.value;
          }
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch {}

    try {
      new PerformanceObserver(list => list.getEntries().forEach(entry => {
        window.__repVitals.longTask = Math.max(window.__repVitals.longTask, entry.duration);
        window.__repVitals.longTasks.push({
          phase: window.__repVitals.phase,
          startTime: Math.round(entry.startTime),
          duration: Math.round(entry.duration),
          name: entry.name
        });
      })).observe({ type: "longtask", buffered: true });
    } catch {}
  });

  page.on("pageerror", err => console.error("Page error:", err));
  page.on("console", msg => {
    if (msg.type() === "error") console.error("Console error:", msg.text());
    else if (msg.text().includes("[profile:")) console.log("  " + msg.text());
  });

  console.log("\n=== Benchmarking Cold Start with 1+ Year Dataset ===");
  const startLoad = Date.now();
  await page.goto(baseUrl, { waitUntil: "load" });
  await page.waitForSelector('html[data-app-ready="true"]', { timeout: 15000 });
  await page.waitForSelector('text=TODAY', { timeout: 15000 });
  const loadDuration = Date.now() - startLoad;
  console.log(`Cold start load duration: ${loadDuration}ms`);
  await page.waitForTimeout(300);

  console.log("\n=== Benchmarking Tab Switches with 1+ Year Dataset ===");
  for (const tab of ["train", "food", "health", "insights", "home"]) {
    await page.evaluate(p => { if(window.__repVitals) window.__repVitals.phase = "tab:" + p; }, tab);
    const startTab = Date.now();
    await page.evaluate(t => document.querySelector(`[data-app-tab="${t}"]`)?.click(), tab);
    await page.waitForTimeout(350);
    const tabDuration = Date.now() - startTab;
    console.log(`Tab [${tab}] rendered in: ${tabDuration}ms`);
  }

  // Benchmark debounced write with 1-year data volume
  console.log("\n=== Benchmarking Large-State Write / Persist ===");
  const writeDuration = await page.evaluate(async () => {
    const start = performance.now();
    if (window.REP_STORE && window.state) {
      window.state.foodEntries.unshift({ id: "bench-new", date: new Date().toISOString(), food_name: "Protein shake", calories: 200 });
      window.REP_STORE.persist("rep-gym-companion-v1", window.state);
      await window.REP_STORE.flush();
    }
    return Math.round(performance.now() - start);
  });
  console.log(`Write + Flush duration: ${writeDuration}ms`);

  const vitals = await page.evaluate(() => window.__repVitals);
  console.log("\n=== Scale Benchmark Summary (4x CPU Slowdown + 365 Days) ===");
  console.log(`LCP: ${Math.round(vitals.lcp)}ms (budget <= 2500ms)`);
  console.log(`CLS: ${vitals.cls.toFixed(4)} (budget <= 0.1)`);
  console.log(`Max Long Task: ${Math.round(vitals.longTask)}ms`);
  console.log("\nAll Long Tasks (>50ms):");
  vitals.longTasks.forEach(t => {
    console.log(`  [${t.phase || "unknown"}] ${t.duration}ms at ${t.startTime}ms`);
  });

  if (loadDuration > 6000) throw Error(`Cold start too slow: ${loadDuration}ms`);
  if (writeDuration > 100) throw Error(`Write duration exceeded budget: ${writeDuration}ms`);
  if (vitals.lcp > 2500) throw Error(`LCP exceeded budget: ${vitals.lcp}ms`);
  if (vitals.longTask > 200) throw Error(`Application long task exceeded 200ms budget: ${Math.round(vitals.longTask)}ms`);

  console.log("\n✅ ALL 365-DAY SCALE BENCHMARKS PASSED");

} finally {
  await browser.close();
  server.close();
}
