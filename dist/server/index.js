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

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
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
  if (!env.REP_SYNC_KEY) return false;
  return timingSafeEqual(request.headers.get("x-rep-sync-key") || "", env.REP_SYNC_KEY);
}

const SECURITY_HEADERS = {
  "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(self), microphone=(self), geolocation=()"
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
async function rateLimited(request, bucket, limit, windowSeconds) {
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
  return json({ ok: false, error: "Too many requests. Try again shortly." }, 429);
}

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

function parseModelJson(text) {
  const cleaned = String(text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI returned an unreadable response.");
  return JSON.parse(match[0]);
}

async function geminiGenerate(env, parts, jsonMode = true) {
  const apiKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("Food analysis is not configured in the Worker. In Cloudflare, open Settings → Variables and secrets and add a secret named GEMINI_API_KEY.");
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
  if (await rateLimited(request, "food-analyze", 30, 60)) return rateLimitResponse();
  if (!(await paired(request, env))) return json({ ok: false, error: "Pairing key is incorrect or missing." }, 401);
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
  const suppliedKey = request.headers.get("x-rep-sync-key") || "";
  if (!(await timingSafeEqual(suppliedKey, env.REP_SYNC_KEY))) return json({ ok: false, error: "Pairing key is incorrect." }, 401);
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
  if (!(await timingSafeEqual(request.headers.get("x-rep-sync-key")||"", env.REP_SYNC_KEY))) return json({ok:false,error:"Pairing key is incorrect."},401);
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

async function route(request, env) {
  const url = new URL(request.url);
  if (url.pathname === "/api/pair-check") {
    if (request.method === "POST") {
      if (await rateLimited(request, "pair-check", 20, 60)) return rateLimitResponse();
      return (await paired(request, env))
        ? json({ ok: true, foodAi: Boolean(env.GEMINI_API_KEY || env.GOOGLE_API_KEY), notion: Boolean(env.NOTION_TOKEN) })
        : json({ ok: false, error: "Pairing key is incorrect." }, 401);
    }
    if (request.method === "OPTIONS") return new Response(null, { status: 204 });
    return json({ ok: false, error: "Method not allowed." }, 405);
  }
  if (url.pathname === "/api/food/analyze") {
    if (request.method === "POST") return analyzeFood(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204 });
    return json({ ok: false, error: "Method not allowed." }, 405);
  }
  if (url.pathname === "/api/notion-sync") {
    if (request.method === "POST") {
      if (await rateLimited(request, "notion-sync", 60, 60)) return rateLimitResponse();
      try { const body=await request.clone().json().catch(()=>null);return body?.workout?await syncWorkout(request, env):await syncHealth(request,env,body); }
      catch (error) { return json({ ok: false, error: safeText(error?.message || "Sync failed.", 300) }, 502); }
    }
    if (request.method === "OPTIONS") return new Response(null, { status: 204 });
    return json({ ok: false, error: "Method not allowed." }, 405);
  }
  if (env.ASSETS && typeof env.ASSETS.fetch === "function") return env.ASSETS.fetch(request);
  return new Response("Rep Gym Companion", { headers: { "content-type": "text/plain; charset=utf-8" } });
}

export default {
  async fetch(request, env) {
    return withSecurityHeaders(await route(request, env));
  }
};
