const NOTION_VERSION = "2026-03-11";
const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const HEALTH_DATA_SOURCES = {
  recovery: "94f3f3a9-ca95-4f34-90dc-36090a9ec00c",
  sleep: "94f3f3a9-ca95-4f34-90dc-36090a9ec00c",
  nutrition: "fcfdaac1-87a5-4fc7-b437-42e1b247b80e",
  hygiene: "1890e774-1ad7-4904-a9ec-84267cd222a2",
  food: "97671c61-586a-4443-aea6-00b1d9f835a7"
};

const FOOD_SCHEMA = `Return only a JSON object with: food_name (string), portion_size (string), estimated_weight_g (number), calories (number), protein_g (number), carbs_g (number), fat_g (number), fiber_g (number), sugar_g (number), sodium_mg (number), confidence (High, Medium, or Low), confidence_pct (0-100 integer), notes (string), recognizable (boolean). All nutrition values are estimates. Use 0 instead of null. Sum multiple foods. If the input is Arabic, understand it natively and include the Arabic name after the English name.`;

const VITALS_SCHEMA = `Return only a JSON object with: sleep_hours (number or null), bedtime (string "HH:MM" 24-hour or null), wake_time (string "HH:MM" 24-hour or null), hrv_ms (number or null), resting_hr_bpm (number or null), respiratory_rate_bpm (number or null), active_energy_kcal (number or null), confidence (High, Medium, or Low), notes (string), recognizable (boolean). active_energy_kcal is the total active/move calories for the day, e.g. from Activity rings or the Health app's Active Energy stat - not a single workout's calories. Extract only values that are clearly visible in the screenshot; use null for anything not shown or ambiguous. Never guess or estimate a value that isn't legible.`;

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...extraHeaders } });
}

function safeText(value, max = 1800) {
  return String(value ?? "").trim().slice(0, max);
}

function richText(value) {
  const content = safeText(value);
  return content ? [{ type: "text", text: { content } }] : [];
}

// Hash-then-compare so string length and content never affect branch timing.
async function timingSafeEqual(a, b) {
  const enc = new TextEncoder();
  const [da, db] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(String(a ?? ""))),
    crypto.subtle.digest("SHA-256", enc.encode(String(b ?? "")))
  ]);
  const va = new Uint8Array(da), vb = new Uint8Array(db);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i];
  return diff === 0;
}

async function paired(request, env) {
  return Boolean(await authInfo(request, env));
}

const SECURITY_HEADERS = {
  "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(self), microphone=(self), geolocation=()",
  "strict-transport-security": "max-age=31536000; includeSubDomains"
};

function withSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

// Best-effort per-colo fixed-window limiter using the edge Cache API. It is not
// perfectly consistent across Cloudflare's network, but it materially raises the
// cost of brute-forcing REP_SYNC_KEY or hammering the paid Gemini endpoint. For a
// guaranteed limit, also enable a Cloudflare Rate Limiting Rule on /api/* in the dashboard.
async function rateLimited(request, bucket, limit, windowSeconds, env) {
  const binding = bucket.includes("analyze") ? env?.AI_RATE_LIMITER : ["pair-check", "pair-claim", "push-subscribe"].includes(bucket) ? env?.PAIR_RATE_LIMITER : null;
  if (binding?.limit) {
    const identity = request.headers.get("x-rep-sync-key") || request.headers.get("cf-connecting-ip") || "anonymous";
    const digest = b64urlEncode(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(identity))));
    try { return !(await binding.limit({ key: `${bucket}:${digest.slice(0, 24)}` })).success; } catch { /* fall through to the edge-cache limiter */ }
  }
  if (typeof caches === "undefined" || !caches.default) return false;
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const cacheKey = new Request(`https://rate-limit.internal/${bucket}/${encodeURIComponent(ip)}`);
  const cache = caches.default;
  const now = Date.now();
  let count = 0, resetAt = now + windowSeconds * 1000;
  const cached = await cache.match(cacheKey);
  if (cached) {
    const data = await cached.json().catch(() => null);
    if (data && data.resetAt > now) { count = data.count; resetAt = data.resetAt; }
  }
  count++;
  if (count > limit) return true;
  const ttl = Math.max(1, Math.ceil((resetAt - now) / 1000));
  await cache.put(cacheKey, new Response(JSON.stringify({ count, resetAt }), { headers: { "content-type": "application/json", "cache-control": `max-age=${ttl}` } }));
  return false;
}

function rateLimitResponse() {
  return json({ ok: false, error: "Too many requests. Try again shortly." }, 429, { "retry-after": "60" });
}

function requestTooLarge(request, maxBytes) { const length = Number(request.headers.get("content-length")); return Number.isFinite(length) && length > maxBytes; }

function numberInRange(value, maximum) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(number, maximum)) : 0;
}

function normalizeNutrition(value = {}) {
  const nutrition = {
    food_name: safeText(value.food_name || "Unknown food", 240),
    portion_size: safeText(value.portion_size || "Unknown", 180),
    estimated_weight_g: numberInRange(value.estimated_weight_g, 10000),
    calories: numberInRange(value.calories, 10000),
    protein_g: numberInRange(value.protein_g, 1000),
    carbs_g: numberInRange(value.carbs_g, 2000),
    fat_g: numberInRange(value.fat_g, 1000),
    fiber_g: numberInRange(value.fiber_g, 250),
    sugar_g: numberInRange(value.sugar_g, 1000),
    sodium_mg: numberInRange(value.sodium_mg, 100000),
    confidence: ["High", "Medium", "Low"].includes(value.confidence) ? value.confidence : "Low",
    confidence_pct: Math.round(numberInRange(value.confidence_pct, 100)),
    notes: safeText(value.notes, 900),
    recognizable: value.recognizable !== false,
    source: safeText(value.source || "AI estimate", 80)
  };
  const macroCalories = nutrition.protein_g * 4 + nutrition.carbs_g * 4 + nutrition.fat_g * 9;
  if (nutrition.calories && macroCalories && Math.abs(macroCalories - nutrition.calories) > Math.max(100, nutrition.calories * .2)) {
    nutrition.confidence = "Low";
    nutrition.confidence_pct = Math.min(nutrition.confidence_pct || 40, 50);
    nutrition.notes = safeText(`${nutrition.notes} Validation warning: calories differ materially from macro-derived energy.`, 900);
  }
  return nutrition;
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function normalizeVitals(value = {}) {
  const clampOrNull = (raw, min, max) => {
    const number = Number(raw);
    return Number.isFinite(number) && number >= min && number <= max ? Math.round(number * 10) / 10 : null;
  };
  const time = raw => TIME_PATTERN.test(String(raw || "")) ? raw : null;
  return {
    sleep_hours: clampOrNull(value.sleep_hours, 0, 16),
    bedtime: time(value.bedtime),
    wake_time: time(value.wake_time),
    hrv_ms: clampOrNull(value.hrv_ms, 5, 300),
    resting_hr_bpm: clampOrNull(value.resting_hr_bpm, 30, 120),
    respiratory_rate_bpm: clampOrNull(value.respiratory_rate_bpm, 5, 40),
    active_energy_kcal: clampOrNull(value.active_energy_kcal, 0, 10000),
    confidence: ["High", "Medium", "Low"].includes(value.confidence) ? value.confidence : "Low",
    notes: safeText(value.notes, 400),
    recognizable: value.recognizable !== false
  };
}

function parseModelJson(text) {
  const cleaned = String(text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI returned an unreadable response.");
  return JSON.parse(match[0]);
}

async function geminiGenerate(env, parts, jsonMode = true) {
  const apiKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("AI analysis is not configured in the Worker. In Cloudflare, open Settings → Variables and secrets and add a secret named GEMINI_API_KEY.");
  const model = safeText(env.GEMINI_MODEL || "gemini-2.5-flash", 100);
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { temperature: .1, maxOutputTokens: jsonMode ? 2048 : 64, ...(jsonMode ? { responseMimeType: "application/json" } : {}) } })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || `Food analysis failed (${response.status}).`);
  return (data.candidates?.[0]?.content?.parts || []).map(part => part.text || "").join("").trim();
}

async function lookupBarcode(barcode) {
  const code = String(barcode || "").replace(/\D/g, "");
  if (code.length < 8) throw new Error("No readable barcode was found.");
  const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`, { headers: { "user-agent": "RepFoodTracker/1.0" } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.status !== 1) throw new Error(`Barcode ${code} was not found in Open Food Facts.`);
  const product = data.product || {}, nutrients = product.nutriments || {}, serving = Number(product.serving_quantity), factor = serving > 0 ? serving / 100 : 1;
  const n = key => numberInRange((Number(nutrients[key]) || 0) * factor, 100000);
  const sodium = n("sodium_100g") * 1000 || n("salt_100g") / 2.54 * 1000;
  return normalizeNutrition({ food_name: `${product.product_name || product.generic_name || "Unknown product"}${product.brands ? ` (${product.brands})` : ""}`, portion_size: serving > 0 ? (product.serving_size || `${serving}g`) : "100g", estimated_weight_g: serving || 100, calories: n("energy-kcal_100g"), protein_g: n("proteins_100g"), carbs_g: n("carbohydrates_100g"), fat_g: n("fat_100g"), fiber_g: n("fiber_100g"), sugar_g: n("sugars_100g"), sodium_mg: sodium, confidence: "High", confidence_pct: 92, notes: `Open Food Facts data. Barcode: ${code}`, recognizable: true, source: "Open Food Facts" });
}

async function analyzeFood(request, env) {
  if (await rateLimited(request, "food-analyze", 30, 60, env)) return rateLimitResponse();
  if (!(await paired(request, env))) return json({ ok: false, error: "Pairing key is incorrect or missing." }, 401);
  if (requestTooLarge(request, 13_500_000)) return json({ ok: false, error: "The image is too large. Choose a smaller photo." }, 413);
  const body = await request.json().catch(() => null), mode = safeText(body?.mode, 30), description = safeText(body?.description, 1200);
  if (!body || !["text", "restaurant", "photo", "barcode-image", "barcode"].includes(mode)) return json({ ok: false, error: "Unsupported food input." }, 400);
  try {
    if (mode === "barcode") return json({ ok: true, nutrition: await lookupBarcode(body.barcode), logMethod: "Barcode" });
    const image = safeText(body.image, 12_000_000), mimeType = /^image\/(jpeg|png|webp|heic|heif)$/i.test(body.mimeType || "") ? body.mimeType : "image/jpeg";
    if (["photo", "barcode-image"].includes(mode) && !image) return json({ ok: false, error: "Image data is missing." }, 400);
    if (mode === "barcode-image") {
      const rawCode = await geminiGenerate(env, [{ text: "Extract the numeric EAN/UPC barcode from this image. Return only digits, or NONE." }, { inlineData: { mimeType, data: image } }], false);
      return json({ ok: true, nutrition: await lookupBarcode(rawCode), logMethod: "Barcode" });
    }
    const prompt = mode === "restaurant" ? `Estimate this restaurant meal using general knowledge. Never claim the values are official. State portion assumptions and uncertainty in notes. ${FOOD_SCHEMA}\nMeal: ${description}` : mode === "photo" ? `Analyze all food visible in this image. Use plate, hand, utensils, or packaging to estimate portion size. ${FOOD_SCHEMA}${description ? `\nUser note: ${description}` : ""}` : `Calculate nutrition for this food description. Specific quantities increase confidence; vague portions must be Medium or Low confidence. ${FOOD_SCHEMA}\nMeal: ${description}`;
    const parts = [{ text: prompt }];
    if (mode === "photo") parts.push({ inlineData: { mimeType, data: image } });
    const raw = await geminiGenerate(env, parts, true), nutrition = normalizeNutrition({ ...parseModelJson(raw), source: mode === "photo" ? "AI estimate (photo)" : mode === "restaurant" ? "AI estimate (restaurant, unverified)" : "AI estimate (ingredients)" });
    return json({ ok: true, nutrition, logMethod: mode === "photo" ? "Photo" : mode === "restaurant" ? "Restaurant" : "Ingredients" });
  } catch (error) {
    return json({ ok: false, error: safeText(error?.message || "Food analysis failed.", 300) }, 502);
  }
}

async function analyzeVitalsScreenshot(request, env) {
  if (await rateLimited(request, "vitals-analyze", 20, 60, env)) return rateLimitResponse();
  if (!(await paired(request, env))) return json({ ok: false, error: "Pairing key is incorrect or missing." }, 401);
  if (requestTooLarge(request, 13_500_000)) return json({ ok: false, error: "The screenshot is too large." }, 413);
  const body = await request.json().catch(() => null);
  const image = safeText(body?.image, 12_000_000), mimeType = /^image\/(jpeg|png|webp|heic|heif)$/i.test(body?.mimeType || "") ? body.mimeType : "image/jpeg";
  if (!image) return json({ ok: false, error: "Image data is missing." }, 400);
  try {
    const prompt = `This is a screenshot from the Apple Health app or an Apple Watch face. Read sleep duration, bedtime, wake time, Heart Rate Variability (HRV), Resting Heart Rate, Respiratory Rate, and Active Energy (total daily active/move calories, e.g. from Activity rings) wherever they are visible. ${VITALS_SCHEMA}`;
    const raw = await geminiGenerate(env, [{ text: prompt }, { inlineData: { mimeType, data: image } }], true);
    return json({ ok: true, vitals: normalizeVitals(parseModelJson(raw)) });
  } catch (error) {
    return json({ ok: false, error: safeText(error?.message || "Screenshot analysis failed.", 300) }, 502);
  }
}

const VITALS_IMPORT_PREFIX = "vitals:";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Shortcuts' "Format Date" action has no exact-format option on the phones
// we've tested against - only locale-driven presets (Short/Medium/Long).
// Rather than forcing a specific device locale, these accept whatever a
// reasonable Short-format date/time looks like and normalize it, alongside
// the exact ISO/24-hour strings other import paths already send.
function parseFlexibleDate(raw) {
  const value = String(raw || "").trim();
  if (DATE_PATTERN.test(value)) return value;
  const dmy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    const day = Number(dmy[1]), month = Number(dmy[2]), year = dmy[3];
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  const mdy = value.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (mdy) {
    const month = Number(mdy[1]), day = Number(mdy[2]), year = mdy[3];
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  return null;
}
function parseFlexibleTime(raw) {
  const value = String(raw || "").trim();
  if (TIME_PATTERN.test(value)) return value;
  const twelveHour = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (twelveHour) {
    let hour = Number(twelveHour[1]) % 12;
    if (/pm/i.test(twelveHour[3])) hour += 12;
    return `${String(hour).padStart(2, "0")}:${twelveHour[2]}`;
  }
  return null;
}

function normalizeVitalsImport(value = {}) {
  const clampOrNull = (raw, min, max) => {
    const number = Number(raw);
    return Number.isFinite(number) && number >= min && number <= max ? Math.round(number * 10) / 10 : null;
  };
  return {
    date: parseFlexibleDate(value.date),
    sleep_hours: clampOrNull(value.sleep_hours, 0, 16),
    bedtime: parseFlexibleTime(value.bedtime),
    wake_time: parseFlexibleTime(value.wake_time),
    hrv_ms: clampOrNull(value.hrv_ms, 5, 300),
    resting_hr_bpm: clampOrNull(value.resting_hr_bpm, 30, 120),
    respiratory_rate_bpm: clampOrNull(value.respiratory_rate_bpm, 5, 40),
    active_energy_kcal: clampOrNull(value.active_energy_kcal, 0, 10000)
  };
}

// Automated import from an on-device Apple Shortcuts automation (or an
// export tool like Health Auto Export). A Worker has no memory between
// requests, so the Shortcut writes into KV here and the client picks up
// anything new the next time it opens - reuses the same optional PUSH_KV
// binding the push-reminder feature already uses, under a distinct prefix.
async function importVitals(request, env) {
  if (await rateLimited(request, "vitals-import", 30, 3600, env)) return rateLimitResponse();
  if (!(await paired(request, env))) return json({ ok: false, error: "Pairing key is incorrect or missing." }, 401);
  if (!env.PUSH_KV) return json({ ok: false, error: "Automated import isn't configured on the server yet. In Cloudflare, create a KV namespace and bind it as PUSH_KV." }, 501);
  const body = await request.json().catch(() => null);
  const vitals = normalizeVitalsImport(body || {});
  if (!vitals.date) return json({ ok: false, error: "A valid date (YYYY-MM-DD) is required." }, 400);
  await env.PUSH_KV.put(`${VITALS_IMPORT_PREFIX}${vitals.date}`, JSON.stringify(vitals), { expirationTtl: 60 * 60 * 24 * 180 });
  return json({ ok: true });
}

// Health Auto Export (https://www.healthyapps.dev) is a third-party App
// Store app whose REST API automation feature already does what our own
// Shortcut instructions ask a user to build by hand - it exports a
// documented JSON shape: {"data":{"metrics":[{"name","units","data":[{"qty","date"}]}],"sleep":[{...}]}}.
// This adapter accepts that shape directly and reduces it to the same
// per-day objects normalizeVitalsImport() already produces, so it reuses
// every bit of the storage/pending/merge pipeline built for manual import.
const HAE_METRIC_FIELDS = [
  { test: name => /heartratevariab|hrv/.test(name), field: "hrv_ms", agg: "avg" },
  { test: name => /restingheartrate/.test(name), field: "resting_hr_bpm", agg: "avg" },
  { test: name => /respiratoryrate|breathingrate|breathrate/.test(name), field: "respiratory_rate_bpm", agg: "avg" },
  { test: name => /activeenergy/.test(name), field: "active_energy_kcal", agg: "sum" }
];

function haeDateParts(raw) {
  const match = String(raw || "").match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
  return match ? { date: match[1], time: match[2] } : null;
}

function parseHaeExport(body) {
  const byDate = new Map();
  const entryFor = date => {
    if (!byDate.has(date)) byDate.set(date, { date, sleep_hours: null, bedtime: null, wake_time: null, hrv_ms: null, resting_hr_bpm: null, respiratory_rate_bpm: null, active_energy_kcal: null });
    return byDate.get(date);
  };
  for (const metric of Array.isArray(body?.data?.metrics) ? body.data.metrics : []) {
    const name = String(metric?.name || "").toLowerCase().replace(/[^a-z]/g, "");
    const mapping = HAE_METRIC_FIELDS.find(candidate => candidate.test(name));
    if (!mapping || !Array.isArray(metric.data)) continue;
    const perDay = new Map();
    for (const point of metric.data) {
      const parts = haeDateParts(point?.date), qty = Number(point?.qty);
      if (!parts || !Number.isFinite(qty)) continue;
      if (!perDay.has(parts.date)) perDay.set(parts.date, []);
      perDay.get(parts.date).push(qty);
    }
    for (const [date, values] of perDay) {
      const total = values.reduce((a, b) => a + b, 0);
      entryFor(date)[mapping.field] = mapping.agg === "sum" ? Math.round(total) : Math.round((total / values.length) * 10) / 10;
    }
  }
  for (const record of Array.isArray(body?.data?.sleep) ? body.data.sleep : []) {
    const wake = haeDateParts(record?.sleepEnd || record?.inBedEnd || record?.date);
    if (!wake) continue;
    const entry = entryFor(wake.date);
    entry.wake_time = wake.time;
    entry.bedtime = haeDateParts(record?.sleepStart || record?.inBedStart)?.time || entry.bedtime;
    const hours = Number(record?.totalSleep) || Number(record?.asleep) || null;
    if (Number.isFinite(hours) && hours > 0) entry.sleep_hours = Math.round(hours * 10) / 10;
  }
  return [...byDate.values()].filter(e => e.sleep_hours || e.bedtime || e.hrv_ms || e.resting_hr_bpm || e.respiratory_rate_bpm || e.active_energy_kcal);
}

async function importVitalsHae(request, env) {
  if (await rateLimited(request, "vitals-import-hae", 30, 3600, env)) return rateLimitResponse();
  if (!(await paired(request, env))) return json({ ok: false, error: "Pairing key is incorrect or missing." }, 401);
  if (!env.PUSH_KV) return json({ ok: false, error: "Automated import isn't configured on the server yet. In Cloudflare, create a KV namespace and bind it as PUSH_KV." }, 501);
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return json({ ok: false, error: "Invalid JSON body." }, 400);
  let entries;
  try { entries = parseHaeExport(body); } catch { return json({ ok: false, error: "Could not parse the Health Auto Export payload." }, 400); }
  if (!entries.length) return json({ ok: false, error: "No recognizable Sleep, HRV, Resting Heart Rate, Respiratory Rate, or Active Energy data found in this export." }, 400);
  let imported = 0;
  for (const entry of entries) {
    const normalized = normalizeVitalsImport(entry);
    if (!normalized.date) continue;
    await env.PUSH_KV.put(`${VITALS_IMPORT_PREFIX}${normalized.date}`, JSON.stringify(normalized), { expirationTtl: 60 * 60 * 24 * 180 });
    imported++;
  }
  return json({ ok: true, imported });
}

async function pendingVitals(request, env) {
  if (await rateLimited(request, "vitals-pending", 60, 60, env)) return rateLimitResponse();
  if (!(await paired(request, env))) return json({ ok: false, error: "Pairing key is incorrect or missing." }, 401);
  if (!env.PUSH_KV) return json({ ok: true, entries: [] });
  const url = new URL(request.url), sinceParam = url.searchParams.get("since");
  const since = DATE_PATTERN.test(sinceParam || "") ? sinceParam : "2000-01-01";
  const entries = [];
  let cursor;
  for (let page = 0; page < 10; page++) {
    const list = await env.PUSH_KV.list({ prefix: VITALS_IMPORT_PREFIX, cursor });
    for (const key of list.keys) {
      const date = key.name.slice(VITALS_IMPORT_PREFIX.length);
      if (date < since) continue;
      const raw = await env.PUSH_KV.get(key.name);
      if (raw) entries.push(JSON.parse(raw));
    }
    if (list.list_complete) break;
    cursor = list.cursor;
  }
  entries.sort((a, b) => a.date.localeCompare(b.date));
  return json({ ok: true, entries });
}

async function notionRequest(env, path, init = {}) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(`https://api.notion.com/v1${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${env.NOTION_TOKEN}`,
        "notion-version": NOTION_VERSION,
        "content-type": "application/json",
        ...(init.headers || {})
      }
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) return data;
    if (response.status === 429 && attempt < 3) {
      const wait = Math.max(1, Number(response.headers.get("retry-after")) || 1);
      await new Promise(resolve => setTimeout(resolve, wait * 1000));
      continue;
    }
    throw new Error(data.message || `Notion request failed (${response.status})`);
  }
}

async function existingEntries(env, workoutId) {
  const titles = new Set();
  let cursor;
  for (let page = 0; page < 5; page++) {
    const result = await notionRequest(env, `/data_sources/${env.NOTION_DATA_SOURCE_ID}/query`, {
      method: "POST",
      body: JSON.stringify({
        page_size: 100,
        start_cursor: cursor,
        filter: { property: "Workout ID", rich_text: { equals: safeText(workoutId, 100) } }
      })
    });
    for (const item of result.results || []) titles.add((item.properties?.Entry?.title || []).map(part => part.plain_text || "").join(""));
    if (!result.has_more || !result.next_cursor) break;
    cursor = result.next_cursor;
  }
  return titles;
}

function notionProperties(workout, row) {
  const properties = {
    "Entry": { title: richText(row.entry) },
    "Date": { date: { start: safeText(workout.date, 40) } },
    "Workout ID": { rich_text: richText(workout.id) },
    "Workout Type": { select: { name: safeText(workout.type, 60) } },
    "Exercise": { select: { name: safeText(row.exercise, 100) } },
    "Set Number": { number: Number(row.set) || 1 },
    "Completed": { checkbox: true },
    "Personal Best": { checkbox: Boolean(row.personalBest) },
    "Progression": { select: { name: safeText(row.progression || "Hold", 30) } },
    "Notes": { rich_text: richText(row.note) }
  };
  const numeric = {
    "Weight (kg)": row.weight,
    "Reps": row.reps,
    "RPE": row.rpe,
    "Duration (sec)": row.duration,
    "Rest (sec)": row.rest
  };
  for (const [name, value] of Object.entries(numeric)) {
    const number = Number(value);
    if (value !== "" && value != null && Number.isFinite(number)) properties[name] = { number };
  }
  return properties;
}

async function syncWorkout(request, env) {
  if (!env.NOTION_TOKEN || !env.NOTION_DATA_SOURCE_ID || !env.REP_SYNC_KEY) {
    return json({ ok: false, error: "Sync is not configured on the server." }, 503);
  }
  if (!(await paired(request, env))) return json({ ok: false, error: "Pairing key is incorrect or expired." }, 401);
  const body = await request.json().catch(() => null), workout = body?.workout;
  if (!workout || !safeText(workout.id) || !safeText(workout.date) || !Array.isArray(workout.entries)) {
    return json({ ok: false, error: "Invalid workout payload." }, 400);
  }
  if (workout.entries.length > 100) return json({ ok: false, error: "Workout is too large." }, 413);
  let created = 0, skipped = 0;const existing=await existingEntries(env,workout.id);
  for (const row of workout.entries) {
    if (!row?.entry || !row?.exercise) continue;
    if (existing.has(safeText(row.entry,200))) { skipped++; continue; }
    await notionRequest(env, "/pages", {
      method: "POST",
      body: JSON.stringify({
        parent: { type: "data_source_id", data_source_id: env.NOTION_DATA_SOURCE_ID },
        properties: notionProperties(workout, row)
      })
    });
    created++;
  }
  return json({ ok: true, created, skipped });
}

function healthSource(env, kind) {
  const names={recovery:"NOTION_RECOVERY_DATA_SOURCE_ID",sleep:"NOTION_RECOVERY_DATA_SOURCE_ID",nutrition:"NOTION_NUTRITION_DATA_SOURCE_ID",hygiene:"NOTION_HYGIENE_DATA_SOURCE_ID",food:"NOTION_FOOD_DATA_SOURCE_ID"};
  return env[names[kind]] || HEALTH_DATA_SOURCES[kind];
}

async function existingHealthPage(env, dataSourceId, date) {
  const result=await notionRequest(env,`/data_sources/${dataSourceId}/query`,{method:"POST",body:JSON.stringify({page_size:1,filter:{property:"Date",date:{equals:safeText(date,10)}}})});
  return result.results?.[0]?.id || null;
}

function recoveryProperties(payload) {
  return {
    "Check-in":{title:richText(`Recovery · ${payload.date}`)},"Date":{date:{start:safeText(payload.date,10)}},
    "Soreness":{number:Number(payload.soreness)||0},"Energy":{number:Number(payload.energy)||0},"Sleep Hours":{number:Number(payload.sleep)||0},
    "Pain":{checkbox:Boolean(payload.pain)},"Red Flags":{number:Number(payload.flags)||0},
    "Recommendation":{select:{name:safeText(payload.recommendation||"Hold",40)}},"Notes":{rich_text:richText(payload.notes)}
  };
}

function nutritionProperties(payload) {
  const properties = {
    "Day":{title:richText(`${payload.plan} · ${payload.date}`)},"Date":{date:{start:safeText(payload.date,10)}},"Plan":{select:{name:safeText(payload.plan,20)}},
    "Calories Target":{number:Number(payload.caloriesTarget)||0},"Protein Target":{number:Number(payload.proteinTarget)||0},"Water Target L":{number:Number(payload.waterTarget)||0},
    "Meals Complete":{number:Number(payload.mealsComplete)||0},"Meals Total":{number:Number(payload.mealsTotal)||0},"Hydration Complete":{checkbox:Boolean(payload.hydrationComplete)},
    "Supplements Complete":{checkbox:Boolean(payload.supplementsComplete)},"Completion Percent":{number:Number(payload.completion)||0},"Notes":{rich_text:richText(payload.notes)}
  };
  // Only written on days a weigh-in actually happened, so the column stays a
  // sparse weekly series instead of repeating the same number every day.
  const weight = Number(payload.weightKg);
  if (Number.isFinite(weight) && weight >= 30 && weight <= 300) properties["Weight (kg)"] = { number: weight };
  return properties;
}

function sleepProperties(payload) {
  return {
    "Check-in":{title:richText(`Recovery · ${payload.date}`)},"Date":{date:{start:safeText(payload.date,10)}},
    "Sleep Hours":{number:Number(payload.sleep)||0}
  };
}
function hygieneProperties(payload) {
  return {
    "Day":{title:richText(`Daily care · ${payload.date}`)},"Date":{date:{start:safeText(payload.date,10)}},"Morning Complete":{checkbox:Boolean(payload.morningComplete)},
    "Evening Complete":{checkbox:Boolean(payload.eveningComplete)},"Post-workout Complete":{checkbox:Boolean(payload.postWorkoutComplete)},"Hair Routine Complete":{checkbox:Boolean(payload.hairRoutineComplete)},
    "SPF":{checkbox:Boolean(payload.spf)},"Floss":{checkbox:Boolean(payload.floss)},"Beard Oil":{checkbox:Boolean(payload.beardOil)},"Shower Within 30m":{checkbox:Boolean(payload.showerWithin30m)},
    "Completion Percent":{number:Number(payload.completion)||0},"Notes":{rich_text:richText(payload.notes)}
  };
}

function foodProperties(payload) {
  const method=["Photo","Restaurant","Ingredients","Barcode","Voice","Re-log","Template"].includes(payload.logMethod)?payload.logMethod:"Ingredients";
  const meal=["Breakfast","Lunch","Dinner","Snack"].includes(payload.mealType)?payload.mealType:"Snack",marker=`[REP:${safeText(payload.id,100)}]`;
  return {
    "Name":{title:richText(payload.food_name||payload.rawNote||"Meal note")},"Date":{date:{start:safeText(payload.date,40)}},"Meal Type":{select:{name:meal}},"Log Method":{select:{name:method}},
    "Calories":{number:Number(payload.calories)||0},"Protein":{number:Number(payload.protein_g)||0},"Carbs":{number:Number(payload.carbs_g)||0},"Fat":{number:Number(payload.fat_g)||0},"Fiber":{number:Number(payload.fiber_g)||0},
    "Sugar":{number:Number(payload.sugar_g)||0},"Sodium":{number:Number(payload.sodium_mg)||0},"Portion Size":{rich_text:richText(payload.portion_size)},"Confidence":{select:{name:["High","Medium","Low"].includes(payload.confidence)?payload.confidence:"Low"}},
    "Notes":{rich_text:richText(`${marker} ${safeText(payload.rawNote,900)}${payload.notes?` · ${safeText(payload.notes,600)}`:""}`)}
  };
}

async function syncFood(env,payload,source) {
  if(!payload?.id||!payload?.date)return json({ok:false,error:"Invalid food entry."},400);
  const marker=`[REP:${safeText(payload.id,100)}]`,result=await notionRequest(env,`/data_sources/${source}/query`,{method:"POST",body:JSON.stringify({page_size:1,filter:{property:"Notes",rich_text:{contains:marker}}})});
  if(result.results?.length)return json({ok:true,created:0,skipped:1});
  await notionRequest(env,"/pages",{method:"POST",body:JSON.stringify({parent:{type:"data_source_id",data_source_id:source},properties:foodProperties(payload)})});
  return json({ok:true,created:1,skipped:0});
}

async function syncHealth(request, env, body) {
  if (!env.NOTION_TOKEN || !env.REP_SYNC_KEY) return json({ok:false,error:"Sync is not configured on the server."},503);
  if (!(await paired(request, env))) return json({ok:false,error:"Pairing key is incorrect or expired."},401);
  const kind=safeText(body?.kind,20),payload=body?.payload,source=healthSource(env,kind);
  if(!source||!payload||!/^\d{4}-\d{2}-\d{2}$/.test(safeText(payload.date,10)))return json({ok:false,error:"Invalid health log payload."},400);
  if(kind==="food")return syncFood(env,payload,source);
  const builders={recovery:recoveryProperties,sleep:sleepProperties,nutrition:nutritionProperties,hygiene:hygieneProperties},properties=builders[kind]?.(payload);
  if(!properties)return json({ok:false,error:"Unsupported health log type."},400);
  const pageId=await existingHealthPage(env,source,payload.date);
  if(pageId)await notionRequest(env,`/pages/${pageId}`,{method:"PATCH",body:JSON.stringify({properties})});
  else await notionRequest(env,"/pages",{method:"POST",body:JSON.stringify({parent:{type:"data_source_id",data_source_id:source},properties})});
  return json({ok:true,created:pageId?0:1,updated:pageId?1:0});
}

// --- Web Push (RFC 8291 aes128gcm content encoding + RFC 8292 VAPID) ---
// Hand-rolled against the Workers runtime's Web Crypto API since this project
// has no build step or npm dependencies in the Worker. Verified by round-
// tripping encrypt/decrypt locally against the same derivation a receiving
// browser performs before this was wired up to a real push service.

const b64urlEncode = bytes => {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const b64urlDecode = str => {
  const padding = "=".repeat((4 - str.length % 4) % 4);
  const raw = atob((str + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
};
const concatBytes = (...arrays) => {
  const out = new Uint8Array(arrays.reduce((n, a) => n + a.length, 0));
  let offset = 0;
  for (const a of arrays) { out.set(a, offset); offset += a.length; }
  return out;
};
async function hmacSha256(keyBytes, dataBytes) {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, dataBytes));
}

// The master pairing secret is accepted only for initial setup and external
// automations. Browser clients exchange it for a signed, expiring credential.
const credentialEncoder = new TextEncoder(), credentialDecoder = new TextDecoder();
async function signCredential(env, payload) {
  const encoded = b64urlEncode(credentialEncoder.encode(JSON.stringify(payload)));
  const signature = await hmacSha256(credentialEncoder.encode(env.REP_SYNC_KEY || ""), credentialEncoder.encode(encoded));
  return `rep1.${encoded}.${b64urlEncode(signature)}`;
}
async function verifyCredential(env, token, expectedType = "device") {
  try {
    if (!env.REP_SYNC_KEY || String(token || "").length > 1400) return null;
    const [version, encoded, signature, ...extra] = String(token || "").split(".");
    if (version !== "rep1" || !encoded || !signature || extra.length) return null;
    const expected = b64urlEncode(await hmacSha256(credentialEncoder.encode(env.REP_SYNC_KEY), credentialEncoder.encode(encoded)));
    if (!(await timingSafeEqual(signature, expected))) return null;
    const payload = JSON.parse(credentialDecoder.decode(b64urlDecode(encoded))), now = Math.floor(Date.now() / 1000);
    if (payload.typ !== expectedType || !Number.isFinite(payload.exp) || payload.exp <= now || Number(payload.iat) > now + 60) return null;
    return payload;
  } catch { return null; }
}
async function authInfo(request, env) {
  const supplied = request.headers.get("x-rep-sync-key") || "";
  if (!env.REP_SYNC_KEY || !supplied) return null;
  if (await timingSafeEqual(supplied, env.REP_SYNC_KEY)) return { type: "master" };
  const payload = await verifyCredential(env, supplied, "device");
  return payload ? { type: "device", payload } : null;
}
function capabilities(env) {
  return {
    foodAi: Boolean(env.GEMINI_API_KEY || env.GOOGLE_API_KEY), notion: Boolean(env.NOTION_TOKEN),
    vitalsAi: Boolean(env.GEMINI_API_KEY || env.GOOGLE_API_KEY), vitalsImport: Boolean(env.PUSH_KV),
    push: Boolean(env.PUSH_KV && env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY_JWK)
  };
}
async function issueDeviceCredential(env) {
  const now = Math.floor(Date.now() / 1000), exp = now + 90 * 86400;
  return { credential: await signCredential(env, { typ: "device", iat: now, exp, jti: crypto.randomUUID() }), expiresAt: new Date(exp * 1000).toISOString() };
}
async function createPairHandoff(request, env) {
  if (!(await paired(request, env))) return json({ ok: false, error: "This device is not paired." }, 401);
  const now = Math.floor(Date.now() / 1000), exp = now + 300, jti = crypto.randomUUID(), token = await signCredential(env, { typ: "handoff", iat: now, exp, jti });
  if (env.PUSH_KV) await env.PUSH_KV.put(`handoff:${jti}`, "ready", { expirationTtl: 360 });
  const url = new URL(request.url); url.pathname = "/"; url.search = `?pair=${encodeURIComponent(token)}`;
  return json({ ok: true, url: url.toString(), expiresAt: new Date(exp * 1000).toISOString() });
}
async function claimPairHandoff(request, env) {
  if (!env.REP_SYNC_KEY) return json({ ok: false, error: "Pairing is not configured." }, 503);
  const body = await request.json().catch(() => null), handoff = await verifyCredential(env, body?.token, "handoff");
  if (!handoff) return json({ ok: false, error: "This pairing link is invalid or expired." }, 401);
  if (env.PUSH_KV) {
    const key = `handoff:${handoff.jti}`;
    if (await env.PUSH_KV.get(key) !== "ready") return json({ ok: false, error: "This pairing link was already used or expired." }, 401);
    await env.PUSH_KV.delete(key);
  }
  return json({ ok: true, ...await issueDeviceCredential(env), ...capabilities(env) });
}

let vapidJwtCache = null;
async function vapidAuthHeader(env, audience) {
  if (vapidJwtCache && vapidJwtCache.aud === audience && vapidJwtCache.exp > Date.now() / 1000 + 60) return vapidJwtCache.jwt;
  const key = await crypto.subtle.importKey("jwk", JSON.parse(env.VAPID_PRIVATE_KEY_JWK), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;
  const enc = new TextEncoder();
  const unsigned = `${b64urlEncode(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })))}.${b64urlEncode(enc.encode(JSON.stringify({ aud: audience, exp, sub: env.VAPID_SUBJECT || "mailto:admin@example.com" })))}`;
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(unsigned));
  const jwt = `${unsigned}.${b64urlEncode(new Uint8Array(signature))}`;
  vapidJwtCache = { aud: audience, jwt, exp };
  return `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`;
}

async function encryptWebPush(subscription, payloadObject) {
  const enc = new TextEncoder();
  const uaPublicRaw = b64urlDecode(subscription.keys.p256dh);
  const authSecret = b64urlDecode(subscription.keys.auth);

  const asKeyPair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPublicRaw = new Uint8Array(await crypto.subtle.exportKey("raw", asKeyPair.publicKey));
  const uaPublicKey = await crypto.subtle.importKey("raw", uaPublicRaw, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaPublicKey }, asKeyPair.privateKey, 256));

  const prkKey = await hmacSha256(authSecret, sharedSecret);
  const keyInfo = concatBytes(enc.encode("WebPush: info\0"), uaPublicRaw, asPublicRaw);
  const ikm = await hmacSha256(prkKey, concatBytes(keyInfo, new Uint8Array([1])));

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmacSha256(salt, ikm);
  const cek = (await hmacSha256(prk, concatBytes(enc.encode("Content-Encoding: aes128gcm\0"), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmacSha256(prk, concatBytes(enc.encode("Content-Encoding: nonce\0"), new Uint8Array([1])))).slice(0, 12);

  const paddedPlaintext = concatBytes(enc.encode(JSON.stringify(payloadObject)), new Uint8Array([2]));
  const cekKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, cekKey, paddedPlaintext));

  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, 4096, false);
  return concatBytes(salt, recordSize, new Uint8Array([65]), asPublicRaw, ciphertext);
}

async function sendWebPush(env, subscription, payloadObject) {
  const body = await encryptWebPush(subscription, payloadObject);
  const authorization = await vapidAuthHeader(env, new URL(subscription.endpoint).origin);
  return fetch(subscription.endpoint, {
    method: "POST",
    headers: { authorization, "content-type": "application/octet-stream", "content-encoding": "aes128gcm", ttl: "86400" },
    body
  });
}

const pushKvKey = endpoint => `sub:${endpoint}`;

async function subscribePush(request, env) {
  if (!env.PUSH_KV) return json({ ok: false, error: "Push notifications are not set up on the server yet." }, 503);
  if (await rateLimited(request, "push-subscribe", 20, 60, env)) return rateLimitResponse();
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).origin !== new URL(request.url).origin) return json({ ok: false, error: "Origin is not allowed." }, 403);
  const body = await request.json().catch(() => null);
  const rawSubscription = body?.subscription, time = safeText(body?.time, 5), endpoint = safeText(rawSubscription?.endpoint, 1800), p256dh = safeText(rawSubscription?.keys?.p256dh, 300), auth = safeText(rawSubscription?.keys?.auth, 200);
  let keyShapeValid = false, endpointValid = false;
  try { const publicBytes = b64urlDecode(p256dh), authBytes = b64urlDecode(auth); keyShapeValid = publicBytes.length === 65 && publicBytes[0] === 4 && authBytes.length >= 16; endpointValid = new URL(endpoint).protocol === "https:"; } catch { /* invalid subscription fields */ }
  if (!endpointValid || !keyShapeValid || !TIME_PATTERN.test(time)) {
    return json({ ok: false, error: "Invalid subscription payload." }, 400);
  }
  const timezoneOffsetMinutes = Math.max(-840, Math.min(840, Number(body.timezoneOffsetMinutes) || 0)), subscription = { endpoint, expirationTime: rawSubscription.expirationTime || null, keys: { p256dh, auth } };
  const record = { subscription, time, timezoneOffsetMinutes, lang: body.lang === "ar" ? "ar" : "en", updatedAt: new Date().toISOString(), lastSentDate: null };
  await env.PUSH_KV.put(pushKvKey(endpoint), JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 400 });
  return json({ ok: true });
}

async function unsubscribePush(request, env) {
  if (!env.PUSH_KV) return json({ ok: true });
  const body = await request.json().catch(() => null);
  const endpoint = safeText(body?.endpoint, 500);
  if (endpoint) await env.PUSH_KV.delete(pushKvKey(endpoint));
  return json({ ok: true });
}

async function sendScheduledReminders(env) {
  if (!env.PUSH_KV || !env.VAPID_PRIVATE_KEY_JWK || !env.VAPID_PUBLIC_KEY) return;
  const now = new Date();
  let cursor;
  while (true) {
    const list = await env.PUSH_KV.list({ cursor, prefix: "sub:" });
    for (const key of list.keys) {
      const raw = await env.PUSH_KV.get(key.name);
      if (!raw) continue;
      const record = JSON.parse(raw);
      const local = new Date(now.getTime() - (Number(record.timezoneOffsetMinutes) || 0) * 60000), localDate = local.toISOString().slice(0, 10), localTime = local.toISOString().slice(11, 16);
      const legacyDue = record.timezoneOffsetMinutes === undefined && record.utcHour === now.getUTCHours() && now.getUTCMinutes() === 0;
      if ((!legacyDue && localTime !== record.time) || record.lastSentDate === localDate) continue;
      const message = record.lang === "ar"
        ? { title: "Health OS", body: "حان وقت تسجيل يومك — تمرين، طعام، أو نوم." }
        : { title: "Health OS", body: "Time to log your day — a workout, a meal, or your sleep." };
      try {
        const response = await sendWebPush(env, record.subscription, message);
        if (response.status === 404 || response.status === 410) await env.PUSH_KV.delete(key.name);
        else if (response.ok) { record.lastSentDate = localDate; await env.PUSH_KV.put(key.name, JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 400 }); }
      } catch { /* transient failure; retried automatically on the next cron tick */ }
    }
    if (list.list_complete) break;
    cursor = list.cursor;
  }
}

async function route(request, env) {
  const url = new URL(request.url);
  if (url.pathname === "/api/pair-check") {
    if (request.method === "POST") {
      if (await rateLimited(request, "pair-check", 20, 60, env)) return rateLimitResponse();
      const auth = await authInfo(request, env);
      if (!auth) return json({ ok: false, error: "Pairing key is incorrect or expired." }, 401);
      const renewSoon = auth.type === "device" && Number(auth.payload?.exp) - Math.floor(Date.now() / 1000) < 14 * 86400;
      const device = auth.type === "master" || renewSoon ? await issueDeviceCredential(env) : {};
      return json({ ok: true, ...capabilities(env), ...device, deviceCredential: auth.type === "device" });
    }
    if (request.method === "OPTIONS") return new Response(null, { status: 204 });
    return json({ ok: false, error: "Method not allowed." }, 405);
  }
  if (url.pathname === "/api/pair/handoff") {
    if (request.method === "POST") return createPairHandoff(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204 });
    return json({ ok: false, error: "Method not allowed." }, 405);
  }
  if (url.pathname === "/api/pair/claim") {
    if (request.method === "POST") {
      if (await rateLimited(request, "pair-claim", 20, 60, env)) return rateLimitResponse();
      return claimPairHandoff(request, env);
    }
    if (request.method === "OPTIONS") return new Response(null, { status: 204 });
    return json({ ok: false, error: "Method not allowed." }, 405);
  }
  if (url.pathname === "/api/food/analyze") {
    if (request.method === "POST") return analyzeFood(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204 });
    return json({ ok: false, error: "Method not allowed." }, 405);
  }
  if (url.pathname === "/api/vitals/analyze") {
    if (request.method === "POST") return analyzeVitalsScreenshot(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204 });
    return json({ ok: false, error: "Method not allowed." }, 405);
  }
  if (url.pathname === "/api/vitals/import") {
    if (request.method === "POST") return importVitals(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204 });
    return json({ ok: false, error: "Method not allowed." }, 405);
  }
  if (url.pathname === "/api/vitals/import-hae") {
    if (request.method === "POST") return importVitalsHae(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204 });
    return json({ ok: false, error: "Method not allowed." }, 405);
  }
  if (url.pathname === "/api/vitals/pending") {
    if (request.method === "GET") return pendingVitals(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204 });
    return json({ ok: false, error: "Method not allowed." }, 405);
  }
  if (url.pathname === "/api/notion-sync") {
    if (request.method === "POST") {
      if (await rateLimited(request, "notion-sync", 60, 60, env)) return rateLimitResponse();
      if (requestTooLarge(request, 2_000_000)) return json({ ok: false, error: "Sync payload is too large." }, 413);
      if (!(await paired(request, env))) return json({ ok: false, error: "Pairing key is incorrect or expired." }, 401);
      try {
        const idempotency = safeText(request.headers.get("x-rep-idempotency-key"), 180), digest = idempotency ? b64urlEncode(new Uint8Array(await crypto.subtle.digest("SHA-256", credentialEncoder.encode(idempotency)))) : "", marker = digest ? `sync:${digest}` : "";
        if (marker && env.PUSH_KV && await env.PUSH_KV.get(marker)) return json({ ok: true, created: 0, skipped: 1, duplicate: true });
        const body = await request.clone().json().catch(() => null), response = body?.workout ? await syncWorkout(request, env) : await syncHealth(request, env, body);
        if (marker && env.PUSH_KV && response.ok) await env.PUSH_KV.put(marker, "done", { expirationTtl: 60 * 60 * 24 * 30 });
        return response;
      }
      catch (error) { return json({ ok: false, error: safeText(error?.message || "Sync failed.", 300) }, 502); }
    }
    if (request.method === "OPTIONS") return new Response(null, { status: 204 });
    return json({ ok: false, error: "Method not allowed." }, 405);
  }
  if (url.pathname === "/api/push/public-key") {
    if (request.method === "GET") return json({ ok: true, key: env.VAPID_PUBLIC_KEY || null });
    if (request.method === "OPTIONS") return new Response(null, { status: 204 });
    return json({ ok: false, error: "Method not allowed." }, 405);
  }
  if (url.pathname === "/api/push/subscribe") {
    if (request.method === "POST") return subscribePush(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204 });
    return json({ ok: false, error: "Method not allowed." }, 405);
  }
  if (url.pathname === "/api/push/unsubscribe") {
    if (request.method === "POST") return unsubscribePush(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204 });
    return json({ ok: false, error: "Method not allowed." }, 405);
  }
  if (env.ASSETS && typeof env.ASSETS.fetch === "function") return env.ASSETS.fetch(request);
  return new Response("Rep Gym Companion", { headers: { "content-type": "text/plain; charset=utf-8" } });
}

export default {
  async fetch(request, env) {
    return withSecurityHeaders(await route(request, env));
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(sendScheduledReminders(env));
  }
};
