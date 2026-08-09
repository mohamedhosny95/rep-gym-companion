const NOTION_VERSION = "2026-03-11";
const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const HEALTH_DATA_SOURCES = {
  recovery: "94f3f3a9-ca95-4f34-90dc-36090a9ec00c",
  nutrition: "fcfdaac1-87a5-4fc7-b437-42e1b247b80e",
  hygiene: "1890e774-1ad7-4904-a9ec-84267cd222a2"
};

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
  const result = await notionRequest(env, `/data_sources/${env.NOTION_DATA_SOURCE_ID}/query`, {
    method: "POST",
    body: JSON.stringify({
      page_size: 100,
      filter: { property: "Workout ID", rich_text: { equals: safeText(workoutId, 100) } }
    })
  });
  return new Set((result.results || []).map(page => (page.properties?.Entry?.title || []).map(part => part.plain_text || "").join("")));
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
  if (suppliedKey !== env.REP_SYNC_KEY) return json({ ok: false, error: "Pairing key is incorrect." }, 401);
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
  const names={recovery:"NOTION_RECOVERY_DATA_SOURCE_ID",nutrition:"NOTION_NUTRITION_DATA_SOURCE_ID",hygiene:"NOTION_HYGIENE_DATA_SOURCE_ID"};
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
  return {
    "Day":{title:richText(`${payload.plan} · ${payload.date}`)},"Date":{date:{start:safeText(payload.date,10)}},"Plan":{select:{name:safeText(payload.plan,20)}},
    "Calories Target":{number:Number(payload.caloriesTarget)||0},"Protein Target":{number:Number(payload.proteinTarget)||0},"Water Target L":{number:Number(payload.waterTarget)||0},
    "Meals Complete":{number:Number(payload.mealsComplete)||0},"Meals Total":{number:Number(payload.mealsTotal)||0},"Hydration Complete":{checkbox:Boolean(payload.hydrationComplete)},
    "Supplements Complete":{checkbox:Boolean(payload.supplementsComplete)},"Completion Percent":{number:Number(payload.completion)||0},"Notes":{rich_text:richText(payload.notes)}
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

async function syncHealth(request, env, body) {
  if (!env.NOTION_TOKEN || !env.REP_SYNC_KEY) return json({ok:false,error:"Sync is not configured on the server."},503);
  if ((request.headers.get("x-rep-sync-key")||"")!==env.REP_SYNC_KEY) return json({ok:false,error:"Pairing key is incorrect."},401);
  const kind=safeText(body?.kind,20),payload=body?.payload,source=healthSource(env,kind);
  if(!source||!payload||!/^\d{4}-\d{2}-\d{2}$/.test(safeText(payload.date,10)))return json({ok:false,error:"Invalid health log payload."},400);
  const builders={recovery:recoveryProperties,nutrition:nutritionProperties,hygiene:hygieneProperties},properties=builders[kind]?.(payload);
  if(!properties)return json({ok:false,error:"Unsupported health log type."},400);
  const pageId=await existingHealthPage(env,source,payload.date);
  if(pageId)await notionRequest(env,`/pages/${pageId}`,{method:"PATCH",body:JSON.stringify({properties})});
  else await notionRequest(env,"/pages",{method:"POST",body:JSON.stringify({parent:{type:"data_source_id",data_source_id:source},properties})});
  return json({ok:true,created:pageId?0:1,updated:pageId?1:0});
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/notion-sync") {
      if (request.method === "POST") {
        try { const body=await request.clone().json().catch(()=>null);return body?.workout?await syncWorkout(request, env):await syncHealth(request,env,body); }
        catch (error) { return json({ ok: false, error: safeText(error?.message || "Sync failed.", 300) }, 502); }
      }
      if (request.method === "OPTIONS") return new Response(null, { status: 204 });
      return json({ ok: false, error: "Method not allowed." }, 405);
    }
    if (env.ASSETS && typeof env.ASSETS.fetch === "function") return env.ASSETS.fetch(request);
    return new Response("Rep Gym Companion", { headers: { "content-type": "text/plain; charset=utf-8" } });
  }
};
