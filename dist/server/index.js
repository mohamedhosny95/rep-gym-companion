// src/server/contracts.ts
var SYNC_KINDS = ["food", "nutrition", "recovery", "sleep", "hygiene", "habit"];
function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function validateSyncBody(value) {
  if (!isRecord(value)) return null;
  if (isRecord(value.workout)) {
    const entries = value.workout.entries;
    if (!Array.isArray(entries) || entries.length === 0 || entries.length > 500) return null;
    return { workout: value.workout };
  }
  if (!SYNC_KINDS.includes(value.kind) || !isRecord(value.payload)) return null;
  return { kind: value.kind, payload: value.payload };
}
function validatePushSchedule(value) {
  if (!isRecord(value) || !isRecord(value.subscription) || !isRecord(value.subscription.keys)) return null;
  const endpoint = String(value.subscription.endpoint ?? "").trim();
  const p256dh = String(value.subscription.keys.p256dh ?? "").trim();
  const auth = String(value.subscription.keys.auth ?? "").trim();
  const time = String(value.time ?? "").trim();
  const timezoneOffsetMinutes = Number(value.timezoneOffsetMinutes);
  const timezone = value.timezone ? String(value.timezone).trim() : null;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || !Number.isFinite(timezoneOffsetMinutes) || timezoneOffsetMinutes < -840 || timezoneOffsetMinutes > 840) return null;
  if (timezone && (timezone.length > 64 || !/^[A-Za-z0-9_+\/-]+$/.test(timezone))) return null;
  if (timezone) {
    try {
      new Intl.DateTimeFormat("en", { timeZone: timezone }).format();
    } catch {
      return null;
    }
  }
  try {
    if (new URL(endpoint).protocol !== "https:") return null;
  } catch {
    return null;
  }
  if (!endpoint || endpoint.length > 1800 || !p256dh || p256dh.length > 300 || !auth || auth.length > 200) return null;
  return {
    subscription: { endpoint, expirationTime: Number.isFinite(Number(value.subscription.expirationTime)) ? Number(value.subscription.expirationTime) : null, keys: { p256dh, auth } },
    time,
    timezoneOffsetMinutes,
    timezone,
    lang: value.lang === "ar" ? "ar" : "en"
  };
}
function validateDeviceId(value) {
  const id = String(value ?? "").trim();
  return /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}
function validateTelemetry(value) {
  if (!isRecord(value)) return null;
  const number = (field, maximum) => {
    const result = Number(value[field]);
    return Number.isFinite(result) && result >= 0 && result <= maximum ? result : null;
  };
  const build = String(value.build ?? "").slice(0, 16);
  const lcpMs = number("lcpMs", 12e4), cls = number("cls", 100), interactionMs = number("interactionMs", 12e4), longTaskMs = number("longTaskMs", 12e4), loadMs = number("loadMs", 12e4);
  if (!/^[a-z0-9._-]{1,16}$/i.test(build) || [lcpMs, cls, interactionMs, longTaskMs, loadMs].some((metric) => metric === null)) return null;
  return { build, lcpMs, cls, interactionMs, longTaskMs, loadMs };
}

// src/server/observability.ts
var SERVICE_LEVEL_OBJECTIVES = Object.freeze({
  availability: 0.999,
  internalErrorRate: 1e-3,
  verifiedSyncWithinMinutes: 5,
  verifiedSyncRate: 0.995,
  pairingSuccessRate: 0.995
});
function logEvent(level, event, fields = {}) {
  const payload = JSON.stringify({ event, timestamp: (/* @__PURE__ */ new Date()).toISOString(), ...fields });
  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.log(payload);
}

// src/server/integrations/web-push.ts
var jwtCache = /* @__PURE__ */ new Map();
var encoder = new TextEncoder();
function cryptoBytes(bytes) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
}
function b64urlEncode(bytes) {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(value) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const raw = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}
function concatBytes(...arrays) {
  const result = new Uint8Array(arrays.reduce((total, value) => total + value.length, 0));
  let offset = 0;
  for (const value of arrays) {
    result.set(value, offset);
    offset += value.length;
  }
  return result;
}
async function hmacSha256(keyBytes, dataBytes) {
  const key = await crypto.subtle.importKey("raw", cryptoBytes(keyBytes), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, cryptoBytes(dataBytes)));
}
async function vapidAuthorization(env, audience) {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY_JWK) throw new Error("Web Push is not configured.");
  const cacheKey = `${audience}
${env.VAPID_PUBLIC_KEY}`;
  const cached = jwtCache.get(cacheKey);
  if (cached && cached.exp > Date.now() / 1e3 + 60) return cached.jwt;
  const key = await crypto.subtle.importKey("jwk", JSON.parse(env.VAPID_PRIVATE_KEY_JWK), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const exp = Math.floor(Date.now() / 1e3) + 12 * 3600;
  const header = b64urlEncode(encoder.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64urlEncode(encoder.encode(JSON.stringify({ aud: audience, exp, sub: env.VAPID_SUBJECT || "mailto:admin@example.com" })));
  const unsigned = `${header}.${claims}`;
  const signature = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, encoder.encode(unsigned)));
  const jwt = `vapid t=${unsigned}.${b64urlEncode(signature)}, k=${env.VAPID_PUBLIC_KEY}`;
  jwtCache.set(cacheKey, { jwt, exp });
  if (jwtCache.size > 8) jwtCache.delete(jwtCache.keys().next().value);
  return jwt;
}
async function encryptPayload(subscription, payload) {
  const userPublicRaw = b64urlDecode(subscription.keys.p256dh);
  const authSecret = b64urlDecode(subscription.keys.auth);
  if (userPublicRaw.length !== 65 || userPublicRaw[0] !== 4 || authSecret.length < 16) throw new Error("Invalid Web Push key material.");
  const applicationKeys = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const applicationPublicRaw = new Uint8Array(await crypto.subtle.exportKey("raw", applicationKeys.publicKey));
  const userPublicKey = await crypto.subtle.importKey("raw", cryptoBytes(userPublicRaw), { name: "ECDH", namedCurve: "P-256" }, false, []);
  const deriveAlgorithm = { name: "ECDH", public: userPublicKey };
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits(deriveAlgorithm, applicationKeys.privateKey, 256));
  const pseudoRandomKey = await hmacSha256(authSecret, sharedSecret);
  const keyInfo = concatBytes(encoder.encode("WebPush: info\0"), userPublicRaw, applicationPublicRaw);
  const inputKeyMaterial = await hmacSha256(pseudoRandomKey, concatBytes(keyInfo, new Uint8Array([1])));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const pseudoRandom = await hmacSha256(salt, inputKeyMaterial);
  const contentKey = (await hmacSha256(pseudoRandom, concatBytes(encoder.encode("Content-Encoding: aes128gcm\0"), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmacSha256(pseudoRandom, concatBytes(encoder.encode("Content-Encoding: nonce\0"), new Uint8Array([1])))).slice(0, 12);
  const plaintext = concatBytes(encoder.encode(JSON.stringify(payload)), new Uint8Array([2]));
  const key = await crypto.subtle.importKey("raw", cryptoBytes(contentKey), { name: "AES-GCM" }, false, ["encrypt"]);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: cryptoBytes(nonce) }, key, cryptoBytes(plaintext)));
  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, 4096, false);
  return concatBytes(salt, recordSize, new Uint8Array([65]), applicationPublicRaw, ciphertext);
}
async function sendWebPush(env, subscription, payload) {
  const startedAt = Date.now();
  const body = await encryptPayload(subscription, payload);
  const origin = new URL(subscription.endpoint).origin;
  const authorization = await vapidAuthorization(env, origin);
  try {
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: { authorization, "content-type": "application/octet-stream", "content-encoding": "aes128gcm", ttl: "86400" },
      body: body.buffer,
      signal: AbortSignal.timeout(1e4)
    });
    logEvent(response.ok ? "info" : "warn", "push_delivery_completed", { providerOrigin: origin, status: response.status, durationMs: Date.now() - startedAt });
    return response;
  } catch (error) {
    logEvent("error", "push_delivery_failed", { providerOrigin: origin, durationMs: Date.now() - startedAt, error: error instanceof Error ? error.message.slice(0, 160) : "Unknown error" });
    throw error;
  }
}

// src/server/durable-objects/device-coordinator.ts
import { DurableObject } from "cloudflare:workers";
function zoneParts(timestamp, timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(timestamp));
  const number = (type) => Number(parts.find((part) => part.type === type)?.value);
  return { year: number("year"), month: number("month"), day: number("day"), hour: number("hour"), minute: number("minute"), second: number("second") };
}
function localDateAt(timestamp, timezone) {
  if (typeof timezone === "number") return new Date(timestamp - timezone * 6e4).toISOString().slice(0, 10);
  const parts = zoneParts(timestamp, timezone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}
function nextReminderAt(time, timezone, from = Date.now()) {
  const [hourText, minuteText] = time.split(":");
  const hour = Number(hourText), minute = Number(minuteText);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) throw new Error("Invalid reminder time.");
  if (typeof timezone === "number") {
    const localNow2 = new Date(from - timezone * 6e4);
    let scheduled2 = Date.UTC(localNow2.getUTCFullYear(), localNow2.getUTCMonth(), localNow2.getUTCDate(), hour, minute) + timezone * 6e4;
    if (scheduled2 <= from + 1e3) scheduled2 += 864e5;
    return scheduled2;
  }
  const localNow = zoneParts(from, timezone), todayWall = Date.UTC(localNow.year, localNow.month - 1, localNow.day, hour, minute);
  const resolveWall = (localWall) => {
    let result = localWall;
    for (let iteration = 0; iteration < 3; iteration++) {
      const atCandidate = zoneParts(result, timezone), offset = Date.UTC(atCandidate.year, atCandidate.month - 1, atCandidate.day, atCandidate.hour, atCandidate.minute, atCandidate.second) - result;
      result = localWall - offset;
    }
    return result;
  };
  let scheduled = resolveWall(todayWall);
  if (scheduled <= from + 1e3) {
    const tomorrow = new Date(Date.UTC(localNow.year, localNow.month - 1, localNow.day) + 864e5);
    scheduled = resolveWall(Date.UTC(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), tomorrow.getUTCDate(), hour, minute));
  }
  return scheduled;
}
var DeviceCoordinator = class extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    void ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS _sql_schema_migrations (id INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')));
        CREATE TABLE IF NOT EXISTS device (
          singleton INTEGER PRIMARY KEY CHECK (singleton = 1), device_id TEXT NOT NULL UNIQUE, label TEXT NOT NULL,
          created_at TEXT NOT NULL, last_seen_at TEXT NOT NULL, revoked_at TEXT
        );
        CREATE TABLE IF NOT EXISTS push_subscription (
          singleton INTEGER PRIMARY KEY CHECK (singleton = 1), endpoint TEXT NOT NULL, p256dh TEXT NOT NULL, auth TEXT NOT NULL,
          expiration_time INTEGER, reminder_time TEXT NOT NULL, timezone_offset INTEGER NOT NULL, timezone TEXT, lang TEXT NOT NULL,
          last_sent_date TEXT, updated_at TEXT NOT NULL, last_status INTEGER, last_error TEXT
        );
        CREATE TABLE IF NOT EXISTS sync_receipts (
          digest TEXT PRIMARY KEY, receipt_json TEXT NOT NULL, expires_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_sync_receipts_expiry ON sync_receipts(expires_at);
        INSERT OR IGNORE INTO _sql_schema_migrations (id) VALUES (1);
      `);
      const columns = this.ctx.storage.sql.exec("PRAGMA table_info(push_subscription)").toArray();
      if (!columns.some((column) => column.name === "timezone")) this.ctx.storage.sql.exec("ALTER TABLE push_subscription ADD COLUMN timezone TEXT");
    });
  }
  async register(record) {
    this.ctx.storage.sql.exec(
      `INSERT INTO device (singleton, device_id, label, created_at, last_seen_at, revoked_at)
       VALUES (1, ?, ?, ?, ?, NULL)
       ON CONFLICT(singleton) DO UPDATE SET label=excluded.label, last_seen_at=excluded.last_seen_at, revoked_at=NULL`,
      record.id,
      record.label,
      record.createdAt,
      record.lastSeenAt
    );
  }
  async status() {
    const rows = this.ctx.storage.sql.exec("SELECT device_id, label, created_at, last_seen_at, revoked_at FROM device WHERE singleton=1").toArray();
    const row = rows[0];
    return row ? { id: row.device_id, label: row.label, createdAt: row.created_at, lastSeenAt: row.last_seen_at, active: !row.revoked_at, revokedAt: row.revoked_at } : null;
  }
  async validate() {
    return Boolean((await this.status())?.active);
  }
  async touch(at = (/* @__PURE__ */ new Date()).toISOString()) {
    this.ctx.storage.sql.exec("UPDATE device SET last_seen_at=? WHERE singleton=1 AND revoked_at IS NULL", at);
  }
  async revoke(at = (/* @__PURE__ */ new Date()).toISOString()) {
    this.ctx.storage.sql.exec("UPDATE device SET revoked_at=? WHERE singleton=1", at);
    this.ctx.storage.sql.exec("DELETE FROM push_subscription");
    this.ctx.storage.sql.exec("DELETE FROM sync_receipts");
    await this.ctx.storage.deleteAlarm();
  }
  async setPush(input) {
    if (!await this.validate()) throw new Error("Device is revoked.");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    this.ctx.storage.sql.exec(
      `INSERT INTO push_subscription (singleton, endpoint, p256dh, auth, expiration_time, reminder_time, timezone_offset, timezone, lang, last_sent_date, updated_at, last_status, last_error)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL, NULL)
       ON CONFLICT(singleton) DO UPDATE SET endpoint=excluded.endpoint, p256dh=excluded.p256dh, auth=excluded.auth,
       expiration_time=excluded.expiration_time, reminder_time=excluded.reminder_time, timezone_offset=excluded.timezone_offset,
       timezone=excluded.timezone, lang=excluded.lang, updated_at=excluded.updated_at, last_error=NULL`,
      input.subscription.endpoint,
      input.subscription.keys.p256dh,
      input.subscription.keys.auth,
      input.subscription.expirationTime,
      input.time,
      input.timezoneOffsetMinutes,
      input.timezone,
      input.lang,
      now
    );
    const next = nextReminderAt(input.time, input.timezone || input.timezoneOffsetMinutes);
    await this.ctx.storage.setAlarm(next);
    return { nextReminderAt: new Date(next).toISOString() };
  }
  async clearPush(endpoint) {
    if (endpoint) this.ctx.storage.sql.exec("DELETE FROM push_subscription WHERE singleton=1 AND endpoint=?", endpoint);
    else this.ctx.storage.sql.exec("DELETE FROM push_subscription");
    const remaining = this.ctx.storage.sql.exec("SELECT COUNT(*) AS count FROM push_subscription").one().count;
    if (!remaining) await this.ctx.storage.deleteAlarm();
  }
  pushRow() {
    return this.ctx.storage.sql.exec(
      "SELECT endpoint, p256dh, auth, expiration_time, reminder_time, timezone_offset, timezone, lang, last_sent_date, updated_at, last_status, last_error FROM push_subscription WHERE singleton=1"
    ).toArray()[0] ?? null;
  }
  subscription(row) {
    return { endpoint: row.endpoint, expirationTime: row.expiration_time, keys: { p256dh: row.p256dh, auth: row.auth } };
  }
  async sendNow(payload) {
    const row = this.pushRow();
    if (!row || !await this.validate()) return { ok: false, status: 404 };
    const response = await sendWebPush(this.env, this.subscription(row), payload);
    if (response.status === 404 || response.status === 410) await this.clearPush();
    else this.ctx.storage.sql.exec("UPDATE push_subscription SET last_status=?, last_error=NULL WHERE singleton=1", response.status);
    return { ok: response.ok, status: response.status };
  }
  async getReceipt(digest) {
    this.ctx.storage.sql.exec("DELETE FROM sync_receipts WHERE expires_at <= ?", Date.now());
    const row = this.ctx.storage.sql.exec("SELECT receipt_json, expires_at FROM sync_receipts WHERE digest=?", digest).toArray()[0];
    if (!row || row.expires_at <= Date.now()) return null;
    try {
      return JSON.parse(row.receipt_json);
    } catch {
      return null;
    }
  }
  async putReceipt(digest, receipt, ttlMs = 30 * 864e5) {
    this.ctx.storage.sql.exec(
      "INSERT INTO sync_receipts (digest, receipt_json, expires_at) VALUES (?, ?, ?) ON CONFLICT(digest) DO UPDATE SET receipt_json=excluded.receipt_json, expires_at=excluded.expires_at",
      digest,
      JSON.stringify(receipt),
      Date.now() + ttlMs
    );
  }
  async clearAll() {
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();
  }
  async alarm(alarmInfo) {
    const row = this.pushRow();
    if (!row || !await this.validate()) {
      await this.ctx.storage.deleteAlarm();
      return;
    }
    const zone = row.timezone || row.timezone_offset, today = localDateAt(Date.now(), zone);
    if (row.last_sent_date === today) {
      await this.ctx.storage.setAlarm(nextReminderAt(row.reminder_time, zone));
      return;
    }
    const message = row.lang === "ar" ? { title: "Health OS", body: "\u062D\u0627\u0646 \u0648\u0642\u062A \u062A\u0633\u062C\u064A\u0644 \u064A\u0648\u0645\u0643 \u2014 \u062A\u0645\u0631\u064A\u0646\u060C \u0637\u0639\u0627\u0645\u060C \u0623\u0648 \u0646\u0648\u0645." } : { title: "Health OS", body: "Time to log your day \u2014 a workout, a meal, or your sleep." };
    try {
      const response = await sendWebPush(this.env, this.subscription(row), message);
      if (response.status === 404 || response.status === 410) {
        await this.clearPush();
        return;
      }
      if (!response.ok) throw new Error(`Push provider returned ${response.status}.`);
      this.ctx.storage.sql.exec("UPDATE push_subscription SET last_sent_date=?, last_status=?, last_error=NULL WHERE singleton=1", today, response.status);
      await this.ctx.storage.setAlarm(nextReminderAt(row.reminder_time, zone));
    } catch (error) {
      const messageText = error instanceof Error ? error.message.slice(0, 180) : "Unknown push failure";
      this.ctx.storage.sql.exec("UPDATE push_subscription SET last_error=? WHERE singleton=1", messageText);
      logEvent("error", "device_alarm_failed", { retryCount: alarmInfo?.retryCount ?? 0, error: messageText });
      if ((alarmInfo?.retryCount ?? 0) >= 5) {
        await this.ctx.storage.setAlarm(Date.now() + 30 * 6e4);
        return;
      }
      throw error;
    }
  }
};

// src/server/durable-objects/device-registry.ts
import { DurableObject as DurableObject2 } from "cloudflare:workers";
var DeviceRegistry = class extends DurableObject2 {
  constructor(ctx, env) {
    super(ctx, env);
    void ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS devices (
          device_id TEXT PRIMARY KEY, label TEXT NOT NULL, created_at TEXT NOT NULL,
          last_seen_at TEXT NOT NULL, revoked_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_devices_activity ON devices(revoked_at, last_seen_at DESC);
      `);
    });
  }
  async register(record) {
    this.ctx.storage.sql.exec(
      `INSERT INTO devices (device_id, label, created_at, last_seen_at, revoked_at) VALUES (?, ?, ?, ?, NULL)
       ON CONFLICT(device_id) DO UPDATE SET label=excluded.label, last_seen_at=excluded.last_seen_at, revoked_at=NULL`,
      record.id,
      record.label,
      record.createdAt,
      record.lastSeenAt
    );
  }
  async touch(deviceId, at = (/* @__PURE__ */ new Date()).toISOString()) {
    this.ctx.storage.sql.exec("UPDATE devices SET last_seen_at=? WHERE device_id=? AND revoked_at IS NULL", at, deviceId);
  }
  async revoke(deviceId, at = (/* @__PURE__ */ new Date()).toISOString()) {
    this.ctx.storage.sql.exec("UPDATE devices SET revoked_at=? WHERE device_id=?", at, deviceId);
  }
  async list(limit = 100) {
    const safeLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
    return this.ctx.storage.sql.exec(
      "SELECT device_id, label, created_at, last_seen_at, revoked_at FROM devices WHERE revoked_at IS NULL ORDER BY last_seen_at DESC LIMIT ?",
      safeLimit
    ).toArray().map((row) => ({ id: row.device_id, label: row.label, createdAt: row.created_at, lastSeenAt: row.last_seen_at, revokedAt: row.revoked_at }));
  }
};

// src/server/index.js
var NOTION_VERSION = "2026-03-11";
var JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
var WORKOUT_DATA_SOURCE = "ed9f1653-2232-4fa5-94ed-fa8a0e139c2c";
var HEALTH_DATA_SOURCES = {
  recovery: "94f3f3a9-ca95-4f34-90dc-36090a9ec00c",
  sleep: "94f3f3a9-ca95-4f34-90dc-36090a9ec00c",
  nutrition: "fcfdaac1-87a5-4fc7-b437-42e1b247b80e",
  hygiene: "1890e774-1ad7-4904-a9ec-84267cd222a2",
  habit: "e4ed7261-0722-43be-84b7-a0fffc414a11",
  food: "97671c61-586a-4443-aea6-00b1d9f835a7"
};
var FOOD_DESTINATION = {
  name: "View of Food Entries",
  databaseId: "6433f54c-687e-4813-869a-aadeaf3acaab",
  viewId: "bde632d4-554c-4344-a3a6-a9e1eb15fd50",
  url: "https://app.notion.com/p/mohamedhosny95/6433f54c687e4813869aaadeaf3acaab?v=bde632d4554c4344a3a6a9e1eb15fd50&source=copy_link"
};
var FOOD_REQUIRED_PROPERTIES = {
  Name: "title",
  Date: "date",
  "Meal Type": "select",
  "Log Method": "select",
  Calories: "number",
  Protein: "number",
  Carbs: "number",
  Fat: "number",
  Fiber: "number",
  Sugar: "number",
  Sodium: "number",
  "Portion Size": "rich_text",
  Confidence: "select",
  Notes: "rich_text"
};
var SYSTEM_HEALTH_KEY = "system:health:latest";
var SYSTEM_ALERT_KEY = "system:health:alert";
var OUTBOUND_TIMEOUT_MS = 15e3;
var FOOD_SCHEMA = `Return only a JSON object with: food_name (string), portion_size (string), estimated_weight_g (number), calories (number), protein_g (number), carbs_g (number), fat_g (number), fiber_g (number), sugar_g (number), sodium_mg (number), confidence (High, Medium, or Low), confidence_pct (0-100 integer), notes (string), recognizable (boolean). All nutrition values are estimates. Use 0 instead of null. Sum multiple foods. If the input is Arabic, understand it natively and include the Arabic name after the English name.`;
var VITALS_SCHEMA = `Return only a JSON object with: sleep_hours (number or null), bedtime (string "HH:MM" 24-hour or null), wake_time (string "HH:MM" 24-hour or null), hrv_ms (number or null), resting_hr_bpm (number or null), respiratory_rate_bpm (number or null), active_energy_kcal (number or null), confidence (High, Medium, or Low), notes (string), recognizable (boolean). active_energy_kcal is the total active/move calories for the day, e.g. from Activity rings or the Health app's Active Energy stat - not a single workout's calories. Extract only values that are clearly visible in the screenshot; use null for anything not shown or ambiguous. Never guess or estimate a value that isn't legible.`;
function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...extraHeaders } });
}
function safeText(value, max = 1800) {
  return String(value ?? "").trim().slice(0, max);
}
function timeoutSignal(timeoutMs, signal) {
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}
async function fetchWithTimeout(input, init = {}, timeoutMs = OUTBOUND_TIMEOUT_MS, provider = "External service") {
  try {
    return await fetch(input, { ...init, signal: timeoutSignal(timeoutMs, init.signal) });
  } catch (error) {
    if (error?.name === "TimeoutError" || error?.name === "AbortError") throw new Error(`${provider} timed out. Try again.`);
    throw error;
  }
}
function requestOriginAllowed(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
function richText(value) {
  const content = safeText(value);
  return content ? [{ type: "text", text: { content } }] : [];
}
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
async function automationPaired(request, env) {
  const supplied = request.headers.get("x-rep-sync-key") || "", expected = env.VITALS_IMPORT_KEY || env.REP_SYNC_KEY || "";
  return Boolean(supplied && expected.length >= 32 && await timingSafeEqual(supplied, expected));
}
var SECURITY_HEADERS = {
  "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; report-uri /api/security/csp-report",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(self), microphone=(self), geolocation=()",
  "strict-transport-security": "max-age=31536000; includeSubDomains"
};
function withSecurityHeaders(response, requestId = "") {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  if (requestId) headers.set("x-request-id", requestId);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
async function rateLimited(request, bucket, limit, windowSeconds, env) {
  const binding = bucket.includes("analyze") ? env?.AI_RATE_LIMITER : ["pair-check", "pair-claim", "push-subscribe", "pair-handoff", "push-test", "push-unsubscribe", "pair-devices-delete"].includes(bucket) ? env?.PAIR_RATE_LIMITER : null;
  if (binding?.limit) {
    const identity = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
    const digest = b64urlEncode2(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(identity))));
    try {
      return !(await binding.limit({ key: `${bucket}:${digest.slice(0, 24)}` })).success;
    } catch {
    }
  }
  if (typeof caches === "undefined" || !caches.default) return false;
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const cacheKey = new Request(`https://rate-limit.internal/${bucket}/${encodeURIComponent(ip)}`);
  const cache = caches.default;
  const now = Date.now();
  let count = 0, resetAt = now + windowSeconds * 1e3;
  const cached = await cache.match(cacheKey);
  if (cached) {
    const data = await cached.json().catch(() => null);
    if (data && data.resetAt > now) {
      count = data.count;
      resetAt = data.resetAt;
    }
  }
  count++;
  if (count > limit) return true;
  const ttl = Math.max(1, Math.ceil((resetAt - now) / 1e3));
  await cache.put(cacheKey, new Response(JSON.stringify({ count, resetAt }), { headers: { "content-type": "application/json", "cache-control": `max-age=${ttl}` } }));
  return false;
}
function rateLimitResponse() {
  return json({ ok: false, error: "Too many requests. Try again shortly." }, 429, { "retry-after": "60" });
}
function requestTooLarge(request, maxBytes) {
  const length = Number(request.headers.get("content-length"));
  return Number.isFinite(length) && length > maxBytes;
}
function numberInRange(value, maximum) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(number, maximum)) : 0;
}
function normalizeNutrition(value = {}) {
  const nutrition = {
    food_name: safeText(value.food_name || "Unknown food", 240),
    portion_size: safeText(value.portion_size || "Unknown", 180),
    estimated_weight_g: numberInRange(value.estimated_weight_g, 1e4),
    calories: numberInRange(value.calories, 1e4),
    protein_g: numberInRange(value.protein_g, 1e3),
    carbs_g: numberInRange(value.carbs_g, 2e3),
    fat_g: numberInRange(value.fat_g, 1e3),
    fiber_g: numberInRange(value.fiber_g, 250),
    sugar_g: numberInRange(value.sugar_g, 1e3),
    sodium_mg: numberInRange(value.sodium_mg, 1e5),
    confidence: ["High", "Medium", "Low"].includes(value.confidence) ? value.confidence : "Low",
    confidence_pct: Math.round(numberInRange(value.confidence_pct, 100)),
    notes: safeText(value.notes, 900),
    recognizable: value.recognizable !== false,
    source: safeText(value.source || "AI estimate", 80)
  };
  const macroCalories = nutrition.protein_g * 4 + nutrition.carbs_g * 4 + nutrition.fat_g * 9;
  if (nutrition.calories && macroCalories && Math.abs(macroCalories - nutrition.calories) > Math.max(100, nutrition.calories * 0.2)) {
    nutrition.confidence = "Low";
    nutrition.confidence_pct = Math.min(nutrition.confidence_pct || 40, 50);
    nutrition.notes = safeText(`${nutrition.notes} Validation warning: calories differ materially from macro-derived energy.`, 900);
  }
  return nutrition;
}
var TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
function normalizeVitals(value = {}) {
  const clampOrNull = (raw, min, max) => {
    const number = Number(raw);
    return Number.isFinite(number) && number >= min && number <= max ? Math.round(number * 10) / 10 : null;
  };
  const time = (raw) => TIME_PATTERN.test(String(raw || "")) ? raw : null;
  return {
    sleep_hours: clampOrNull(value.sleep_hours, 0, 16),
    bedtime: time(value.bedtime),
    wake_time: time(value.wake_time),
    hrv_ms: clampOrNull(value.hrv_ms, 5, 300),
    resting_hr_bpm: clampOrNull(value.resting_hr_bpm, 30, 120),
    respiratory_rate_bpm: clampOrNull(value.respiratory_rate_bpm, 5, 40),
    active_energy_kcal: clampOrNull(value.active_energy_kcal, 0, 1e4),
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
  if (!apiKey) throw new Error("AI analysis is not configured in the Worker. In Cloudflare, open Settings \u2192 Variables and secrets and add a secret named GEMINI_API_KEY.");
  const model = safeText(env.GEMINI_MODEL || "gemini-2.5-flash", 100);
  const response = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { temperature: 0.1, maxOutputTokens: jsonMode ? 2048 : 64, ...jsonMode ? { responseMimeType: "application/json" } : {} } })
  }, 25e3, "AI analysis");
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || `Food analysis failed (${response.status}).`);
  return (data.candidates?.[0]?.content?.parts || []).map((part) => part.text || "").join("").trim();
}
async function lookupBarcode(barcode) {
  const code = String(barcode || "").replace(/\D/g, "");
  if (code.length < 8) throw new Error("No readable barcode was found.");
  const response = await fetchWithTimeout(`https://world.openfoodfacts.org/api/v0/product/${code}.json`, { headers: { "user-agent": "RepFoodTracker/1.0" } }, 1e4, "Barcode lookup");
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.status !== 1) throw new Error(`Barcode ${code} was not found in Open Food Facts.`);
  const product = data.product || {}, nutrients = product.nutriments || {}, serving = Number(product.serving_quantity), factor = serving > 0 ? serving / 100 : 1;
  const n = (key) => numberInRange((Number(nutrients[key]) || 0) * factor, 1e5);
  const sodium = n("sodium_100g") * 1e3 || n("salt_100g") / 2.54 * 1e3;
  return normalizeNutrition({ food_name: `${product.product_name || product.generic_name || "Unknown product"}${product.brands ? ` (${product.brands})` : ""}`, portion_size: serving > 0 ? product.serving_size || `${serving}g` : "100g", estimated_weight_g: serving || 100, calories: n("energy-kcal_100g"), protein_g: n("proteins_100g"), carbs_g: n("carbohydrates_100g"), fat_g: n("fat_100g"), fiber_g: n("fiber_100g"), sugar_g: n("sugars_100g"), sodium_mg: sodium, confidence: "High", confidence_pct: 92, notes: `Open Food Facts data. Barcode: ${code}`, recognizable: true, source: "Open Food Facts" });
}
async function analyzeFood(request, env) {
  if (await rateLimited(request, "food-analyze", 30, 60, env)) return rateLimitResponse();
  if (!await paired(request, env)) return json({ ok: false, error: "Pairing key is incorrect or missing." }, 401);
  if (requestTooLarge(request, 135e5)) return json({ ok: false, error: "The image is too large. Choose a smaller photo." }, 413);
  const body = await request.json().catch(() => null), mode = safeText(body?.mode, 30), description = safeText(body?.description, 1200);
  if (!body || !["text", "restaurant", "photo", "barcode-image", "barcode"].includes(mode)) return json({ ok: false, error: "Unsupported food input." }, 400);
  try {
    if (mode === "barcode") return json({ ok: true, nutrition: await lookupBarcode(body.barcode), logMethod: "Barcode" });
    const image = safeText(body.image, 12e6), mimeType = /^image\/(jpeg|png|webp|heic|heif)$/i.test(body.mimeType || "") ? body.mimeType : "image/jpeg";
    if (["photo", "barcode-image"].includes(mode) && !image) return json({ ok: false, error: "Image data is missing." }, 400);
    if (mode === "barcode-image") {
      const rawCode = await geminiGenerate(env, [{ text: "Extract the numeric EAN/UPC barcode from this image. Return only digits, or NONE." }, { inlineData: { mimeType, data: image } }], false);
      return json({ ok: true, nutrition: await lookupBarcode(rawCode), logMethod: "Barcode" });
    }
    const prompt = mode === "restaurant" ? `Estimate this restaurant meal using general knowledge. Never claim the values are official. State portion assumptions and uncertainty in notes. ${FOOD_SCHEMA}
Meal: ${description}` : mode === "photo" ? `Analyze all food visible in this image. Use plate, hand, utensils, or packaging to estimate portion size. ${FOOD_SCHEMA}${description ? `
User note: ${description}` : ""}` : `Calculate nutrition for this food description. Specific quantities increase confidence; vague portions must be Medium or Low confidence. ${FOOD_SCHEMA}
Meal: ${description}`;
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
  if (!await paired(request, env)) return json({ ok: false, error: "Pairing key is incorrect or missing." }, 401);
  if (requestTooLarge(request, 135e5)) return json({ ok: false, error: "The screenshot is too large." }, 413);
  const body = await request.json().catch(() => null);
  const image = safeText(body?.image, 12e6), mimeType = /^image\/(jpeg|png|webp|heic|heif)$/i.test(body?.mimeType || "") ? body.mimeType : "image/jpeg";
  if (!image) return json({ ok: false, error: "Image data is missing." }, 400);
  try {
    const prompt = `This is a screenshot from the Apple Health app or an Apple Watch face. Read sleep duration, bedtime, wake time, Heart Rate Variability (HRV), Resting Heart Rate, Respiratory Rate, and Active Energy (total daily active/move calories, e.g. from Activity rings) wherever they are visible. ${VITALS_SCHEMA}`;
    const raw = await geminiGenerate(env, [{ text: prompt }, { inlineData: { mimeType, data: image } }], true);
    return json({ ok: true, vitals: normalizeVitals(parseModelJson(raw)) });
  } catch (error) {
    return json({ ok: false, error: safeText(error?.message || "Screenshot analysis failed.", 300) }, 502);
  }
}
var VITALS_IMPORT_PREFIX = "vitals:";
var DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
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
    active_energy_kcal: clampOrNull(value.active_energy_kcal, 0, 1e4),
    steps: clampOrNull(value.steps, 0, 2e5),
    exercise_minutes: clampOrNull(value.exercise_minutes, 0, 1440),
    stand_minutes: clampOrNull(value.stand_minutes, 0, 1440),
    vo2_max: clampOrNull(value.vo2_max, 5, 100),
    oxygen_saturation_pct: clampOrNull(value.oxygen_saturation_pct, 50, 100),
    wrist_temperature_c: clampOrNull(value.wrist_temperature_c, 20, 45),
    sleep_deep_hours: clampOrNull(value.sleep_deep_hours, 0, 10),
    sleep_rem_hours: clampOrNull(value.sleep_rem_hours, 0, 10),
    coverage_minutes: clampOrNull(value.coverage_minutes, 0, 1440),
    heart_rate_samples: clampOrNull(value.heart_rate_samples, 0, 1e5),
    workout_hr_samples: clampOrNull(value.workout_hr_samples, 0, 1e5),
    watch_battery_pct: clampOrNull(value.watch_battery_pct, 0, 100),
    source: safeText(value.source || "health-import", 60)
  };
}
async function storeVitalsImport(env, vitals) {
  const key = `${VITALS_IMPORT_PREFIX}${vitals.date}`, now = (/* @__PURE__ */ new Date()).toISOString(), existing = await env.PUSH_KV.get(key, "json");
  const priorRuns = Array.isArray(existing?.import_runs) ? existing.import_runs : existing?.imported_at ? [existing.imported_at] : [];
  const merged = { ...existing || {} };
  for (const [field, value] of Object.entries(vitals)) if (value !== null && value !== void 0 && value !== "") merged[field] = value;
  const record = { ...merged, date: vitals.date, imported_at: now, import_runs: [.../* @__PURE__ */ new Set([...priorRuns, now])].sort().slice(-24) };
  await env.PUSH_KV.put(key, JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 180 });
  return record;
}
async function importVitals(request, env) {
  if (await rateLimited(request, "vitals-import", 30, 3600, env)) return rateLimitResponse();
  if (!await automationPaired(request, env)) return json({ ok: false, error: "Automation key is incorrect or missing." }, 401);
  if (!env.PUSH_KV) return json({ ok: false, error: "Automated import isn't configured on the server yet. In Cloudflare, create a KV namespace and bind it as PUSH_KV." }, 501);
  const body = await request.json().catch(() => null);
  const vitals = normalizeVitalsImport(body || {});
  if (!vitals.date) return json({ ok: false, error: "A valid date (YYYY-MM-DD) is required." }, 400);
  const stored = await storeVitalsImport(env, vitals);
  return json({ ok: true, imported_at: stored.imported_at, runs: stored.import_runs.length });
}
var HAE_METRIC_FIELDS = [
  { test: (name) => /heartratevariab|hrv/.test(name), field: "hrv_ms", agg: "avg" },
  { test: (name) => /restingheartrate/.test(name), field: "resting_hr_bpm", agg: "avg" },
  { test: (name) => /respiratoryrate|breathingrate|breathrate/.test(name), field: "respiratory_rate_bpm", agg: "avg" },
  { test: (name) => /activeenergy/.test(name), field: "active_energy_kcal", agg: "sum" },
  { test: (name) => /stepcount|steps/.test(name), field: "steps", agg: "sum" },
  { test: (name) => /appleexercisetime|exercisetime/.test(name), field: "exercise_minutes", agg: "sum" },
  { test: (name) => /applestandtime|standtime/.test(name), field: "stand_minutes", agg: "sum" },
  { test: (name) => /vo2max/.test(name), field: "vo2_max", agg: "avg" },
  { test: (name) => /oxygensaturation|spo2/.test(name), field: "oxygen_saturation_pct", agg: "avg" },
  { test: (name) => /wristtemperature/.test(name), field: "wrist_temperature_c", agg: "avg" }
];
function haeDateParts(raw) {
  const match = String(raw || "").match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
  return match ? { date: match[1], time: match[2] } : null;
}
function parseHaeExport(body) {
  const byDate = /* @__PURE__ */ new Map();
  const entryFor = (date) => {
    if (!byDate.has(date)) byDate.set(date, { date, sleep_hours: null, bedtime: null, wake_time: null, hrv_ms: null, resting_hr_bpm: null, respiratory_rate_bpm: null, active_energy_kcal: null, steps: null, exercise_minutes: null, stand_minutes: null, vo2_max: null, oxygen_saturation_pct: null, wrist_temperature_c: null, source: "Health Auto Export" });
    return byDate.get(date);
  };
  for (const metric of Array.isArray(body?.data?.metrics) ? body.data.metrics : []) {
    const name = String(metric?.name || "").toLowerCase().replace(/[^a-z]/g, "");
    const mapping = HAE_METRIC_FIELDS.find((candidate) => candidate.test(name));
    if (!mapping || !Array.isArray(metric.data)) continue;
    const perDay = /* @__PURE__ */ new Map();
    for (const point of metric.data) {
      const parts = haeDateParts(point?.date), qty = Number(point?.qty);
      if (!parts || !Number.isFinite(qty)) continue;
      if (!perDay.has(parts.date)) perDay.set(parts.date, []);
      perDay.get(parts.date).push(qty);
    }
    for (const [date, values] of perDay) {
      const total = values.reduce((a, b) => a + b, 0);
      entryFor(date)[mapping.field] = mapping.agg === "sum" ? Math.round(total) : Math.round(total / values.length * 10) / 10;
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
  return [...byDate.values()].filter((e) => e.sleep_hours || e.bedtime || e.hrv_ms || e.resting_hr_bpm || e.respiratory_rate_bpm || e.active_energy_kcal || e.steps || e.exercise_minutes || e.stand_minutes || e.vo2_max || e.oxygen_saturation_pct || e.wrist_temperature_c);
}
async function importVitalsHae(request, env) {
  if (await rateLimited(request, "vitals-import-hae", 30, 3600, env)) return rateLimitResponse();
  if (!await automationPaired(request, env)) return json({ ok: false, error: "Automation key is incorrect or missing." }, 401);
  if (!env.PUSH_KV) return json({ ok: false, error: "Automated import isn't configured on the server yet. In Cloudflare, create a KV namespace and bind it as PUSH_KV." }, 501);
  if (requestTooLarge(request, 2e6)) return json({ ok: false, error: "Health export is too large." }, 413);
  const raw = await request.text().catch(() => "");
  if (new TextEncoder().encode(raw).byteLength > 2e6) return json({ ok: false, error: "Health export is too large." }, 413);
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: "Invalid JSON body." }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return json({ ok: false, error: "Invalid JSON body." }, 400);
  const metrics = Array.isArray(body?.data?.metrics) ? body.data.metrics : [], sleep = Array.isArray(body?.data?.sleep) ? body.data.sleep : [];
  if (metrics.length > 100 || sleep.length > 1e3 || metrics.some((metric) => Array.isArray(metric?.data) && metric.data.length > 5e3)) return json({ ok: false, error: "Health export contains too many records." }, 413);
  let entries;
  try {
    entries = parseHaeExport(body);
  } catch {
    return json({ ok: false, error: "Could not parse the Health Auto Export payload." }, 400);
  }
  if (!entries.length) return json({ ok: false, error: "No recognizable sleep, recovery, activity, or fitness data found in this export." }, 400);
  if (entries.length > 120) return json({ ok: false, error: "Health export spans too many days; send at most 120 days per request." }, 413);
  let imported = 0;
  for (const entry of entries) {
    const normalized = normalizeVitalsImport(entry);
    if (!normalized.date) continue;
    await storeVitalsImport(env, normalized);
    imported++;
  }
  return json({ ok: true, imported });
}
async function pendingVitals(request, env) {
  if (await rateLimited(request, "vitals-pending", 60, 60, env)) return rateLimitResponse();
  if (!await paired(request, env)) return json({ ok: false, error: "Pairing key is incorrect or missing." }, 401);
  if (!env.PUSH_KV) return json({ ok: true, entries: [] });
  const url = new URL(request.url), sinceParam = url.searchParams.get("since");
  const since = DATE_PATTERN.test(sinceParam || "") ? sinceParam : "2000-01-01";
  const entries = [];
  let cursor;
  for (let page = 0; page < 10; page++) {
    const list = await env.PUSH_KV.list({ prefix: VITALS_IMPORT_PREFIX, cursor });
    const eligible = list.keys.filter((key) => key.name.slice(VITALS_IMPORT_PREFIX.length) >= since).slice(0, 366);
    const values = await Promise.all(eligible.map((key) => env.PUSH_KV.get(key.name, "json").catch(() => null)));
    entries.push(...values.filter(Boolean));
    if (entries.length >= 366 || list.list_complete) break;
    cursor = list.cursor;
  }
  entries.sort((a, b) => a.date.localeCompare(b.date));
  return json({ ok: true, entries });
}
async function notionRequest(env, path, init = {}) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetchWithTimeout(`https://api.notion.com/v1${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${env.NOTION_TOKEN}`,
        "notion-version": NOTION_VERSION,
        "content-type": "application/json",
        ...init.headers || {}
      }
    }, 15e3, "Notion");
    const data = await response.json().catch(() => ({}));
    if (response.ok) return data;
    if (response.status === 429 && attempt < 3) {
      const wait = Math.max(1, Number(response.headers.get("retry-after")) || 1);
      await new Promise((resolve) => setTimeout(resolve, wait * 1e3));
      continue;
    }
    const error = new Error(data.message || `Notion request failed (${response.status})`);
    error.status = response.status;
    error.code = safeText(data.code, 80);
    throw error;
  }
}
function foodDestination(env) {
  return { ...FOOD_DESTINATION, url: safeText(env.NOTION_FOOD_VIEW_URL || FOOD_DESTINATION.url, 700), sourceId: healthSource(env, "food") };
}
function validateFoodSchema(data) {
  const properties = data?.properties || {}, missing = [], incompatible = [];
  for (const [name, expected] of Object.entries(FOOD_REQUIRED_PROPERTIES)) {
    const actual = properties[name]?.type;
    if (!actual) missing.push(name);
    else if (actual !== expected) incompatible.push({ name, expected, actual });
  }
  return { valid: missing.length === 0 && incompatible.length === 0, missing, incompatible };
}
function actionableNotionError(error, destination) {
  const detail = safeText(error?.message || error, 180);
  if (error?.status === 404 || /could not find|not found/i.test(detail)) {
    return `Food Entries is unavailable to Rep Gym Sync. Restore the source if it is in Trash, then connect the integration to Food Entries. Your app destination remains ${destination.name}.`;
  }
  if (error?.status === 401 || error?.status === 403 || /unauthorized|restricted|permission/i.test(detail)) {
    return `Rep Gym Sync cannot access Food Entries. Reconnect the integration to the original Food Entries database; the visible destination remains ${destination.name}.`;
  }
  return detail || "Notion destination validation failed.";
}
function notionPageReceipt(page, expectedSource) {
  const pageId = safeText(page?.id, 100);
  const sourceId = safeText(page?.parent?.data_source_id || page?.parent?.database_id, 100);
  const sameSource = !expectedSource || Boolean(sourceId && sourceId.replace(/-/g, "") === expectedSource.replace(/-/g, ""));
  if (!pageId || page?.archived || page?.in_trash || !sameSource) {
    throw new Error("Notion did not confirm the saved page in the expected database.");
  }
  return {
    verified: true,
    notionPageId: pageId,
    notionUrl: safeText(page?.url || `https://www.notion.so/${pageId.replace(/-/g, "")}`, 600)
  };
}
async function verifyNotionPage(env, pageId, expectedSource) {
  const page = await notionRequest(env, `/pages/${safeText(pageId, 100)}`);
  return notionPageReceipt(page, expectedSource);
}
async function existingEntries(env, workoutId) {
  const source = env.NOTION_DATA_SOURCE_ID || WORKOUT_DATA_SOURCE;
  const titles = /* @__PURE__ */ new Set();
  let cursor;
  for (let page = 0; page < 5; page++) {
    const result = await notionRequest(env, `/data_sources/${source}/query`, {
      method: "POST",
      body: JSON.stringify({
        page_size: 100,
        start_cursor: cursor,
        filter: { property: "Workout ID", rich_text: { equals: safeText(workoutId, 100) } }
      })
    });
    for (const item of result.results || []) titles.add((item.properties?.Entry?.title || []).map((part) => part.plain_text || "").join(""));
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
async function syncWorkoutBody(env, body) {
  if (!env.NOTION_TOKEN || !env.REP_SYNC_KEY) {
    return json({ ok: false, error: "Sync is not configured on the server." }, 503);
  }
  const source = env.NOTION_DATA_SOURCE_ID || WORKOUT_DATA_SOURCE;
  const workout = body?.workout;
  if (!workout || !safeText(workout.id) || !safeText(workout.date) || !Array.isArray(workout.entries)) {
    return json({ ok: false, error: "Invalid workout payload." }, 400);
  }
  if (workout.entries.length > 100) return json({ ok: false, error: "Workout is too large." }, 413);
  let created = 0, skipped = 0;
  const existing = await existingEntries(env, workout.id);
  let receipt = { verified: true };
  for (const row of workout.entries) {
    if (!row?.entry || !row?.exercise) continue;
    if (existing.has(safeText(row.entry, 200))) {
      skipped++;
      continue;
    }
    const page = await notionRequest(env, "/pages", {
      method: "POST",
      body: JSON.stringify({
        parent: { type: "data_source_id", data_source_id: source },
        properties: notionProperties(workout, row)
      })
    });
    receipt = await verifyNotionPage(env, page.id, source);
    created++;
  }
  return json({ ok: true, ...receipt, kind: "workout", created, skipped });
}
function healthSource(env, kind) {
  const names = { recovery: "NOTION_RECOVERY_DATA_SOURCE_ID", sleep: "NOTION_RECOVERY_DATA_SOURCE_ID", nutrition: "NOTION_NUTRITION_DATA_SOURCE_ID", hygiene: "NOTION_HYGIENE_DATA_SOURCE_ID", habit: "NOTION_HABIT_DATA_SOURCE_ID", food: "NOTION_FOOD_DATA_SOURCE_ID" };
  return env[names[kind]] || HEALTH_DATA_SOURCES[kind];
}
async function existingHealthPage(env, dataSourceId, date) {
  const result = await notionRequest(env, `/data_sources/${dataSourceId}/query`, { method: "POST", body: JSON.stringify({ page_size: 1, filter: { property: "Date", date: { equals: safeText(date, 10) } } }) });
  return result.results?.[0]?.id || null;
}
async function existingHabitPage(env, dataSourceId, payload) {
  const entry = `${safeText(payload.date, 10)} \xB7 ${safeText(payload.id, 80)}`;
  const result = await notionRequest(env, `/data_sources/${dataSourceId}/query`, { method: "POST", body: JSON.stringify({ page_size: 1, filter: { property: "Entry", title: { equals: entry } } }) });
  return result.results?.[0]?.id || null;
}
function recoveryProperties(payload) {
  return {
    "Check-in": { title: richText(`Recovery \xB7 ${payload.date}`) },
    "Date": { date: { start: safeText(payload.date, 10) } },
    "Soreness": { number: Number(payload.soreness) || 0 },
    "Energy": { number: Number(payload.energy) || 0 },
    "Sleep Hours": { number: Number(payload.sleep) || 0 },
    "Pain": { checkbox: Boolean(payload.pain) },
    "Red Flags": { number: Number(payload.flags) || 0 },
    "Recommendation": { select: { name: safeText(payload.recommendation || "Hold", 40) } },
    "Notes": { rich_text: richText(payload.notes) }
  };
}
function nutritionProperties(payload) {
  const properties = {
    "Day": { title: richText(`${payload.plan} \xB7 ${payload.date}`) },
    "Date": { date: { start: safeText(payload.date, 10) } },
    "Plan": { select: { name: safeText(payload.plan, 20) } },
    "Calories Target": { number: Number(payload.caloriesTarget) || 0 },
    "Protein Target": { number: Number(payload.proteinTarget) || 0 },
    "Water Target L": { number: Number(payload.waterTarget) || 0 },
    "Meals Complete": { number: Number(payload.mealsComplete) || 0 },
    "Meals Total": { number: Number(payload.mealsTotal) || 0 },
    "Hydration Complete": { checkbox: Boolean(payload.hydrationComplete) },
    "Supplements Complete": { checkbox: Boolean(payload.supplementsComplete) },
    "Completion Percent": { number: Number(payload.completion) || 0 },
    "Notes": { rich_text: richText(payload.notes) }
  };
  const weight = Number(payload.weightKg);
  if (Number.isFinite(weight) && weight >= 30 && weight <= 300) properties["Weight (kg)"] = { number: weight };
  return properties;
}
function sleepProperties(payload) {
  const properties = {
    "Check-in": { title: richText(`Recovery \xB7 ${payload.date}`) },
    "Date": { date: { start: safeText(payload.date, 10) } },
    "Sleep Hours": { number: Number(payload.sleep) || 0 }
  };
  if (payload.notes) properties["Notes"] = { rich_text: richText(payload.notes) };
  return properties;
}
function hygieneProperties(payload) {
  return {
    "Day": { title: richText(`Daily care \xB7 ${payload.date}`) },
    "Date": { date: { start: safeText(payload.date, 10) } },
    "Morning Complete": { checkbox: Boolean(payload.morningComplete) },
    "Evening Complete": { checkbox: Boolean(payload.eveningComplete) },
    "Post-workout Complete": { checkbox: Boolean(payload.postWorkoutComplete) },
    "Hair Routine Complete": { checkbox: Boolean(payload.hairRoutineComplete) },
    "SPF": { checkbox: Boolean(payload.spf) },
    "Floss": { checkbox: Boolean(payload.floss) },
    "Beard Oil": { checkbox: Boolean(payload.beardOil) },
    "Shower Within 30m": { checkbox: Boolean(payload.showerWithin30m) },
    "Completion Percent": { number: Number(payload.completion) || 0 },
    "Notes": { rich_text: richText(payload.notes) }
  };
}
function habitProperties(payload) {
  const allowed = /* @__PURE__ */ new Set(["Sleep", "Night prayer", "Fajr prayer", "Sadqa", "Quran wird", "Quran memorization", "Workout", "Morning & evening adhkar", "Reading", "Water"]), name = safeText(payload.name, 80);
  if (!safeText(payload.id, 80) || !allowed.has(name)) return null;
  return {
    "Entry": { title: richText(`${safeText(payload.date, 10)} \xB7 ${safeText(payload.id, 80)}`) },
    "Date": { date: { start: safeText(payload.date, 10) } },
    "Habit": { select: { name } },
    "Habit ID": { rich_text: richText(payload.id) },
    "Completed": { checkbox: Boolean(payload.completed) },
    "Streak": { number: Math.max(0, Math.min(370, Number(payload.streak) || 0)) },
    "Source": { select: { name: "Rep Gym Companion" } },
    "Updated At": { date: { start: safeText(payload.updatedAt, 40) || (/* @__PURE__ */ new Date()).toISOString() } },
    "Notes": { rich_text: richText([safeText(payload.nameAr, 100), safeText(payload.notes, 500)].filter(Boolean).join(" \xB7 ")) }
  };
}
function foodProperties(payload) {
  const method = ["Photo", "Restaurant", "Ingredients", "Barcode", "Voice", "Re-log", "Template"].includes(payload.logMethod) ? payload.logMethod : "Ingredients";
  const meal = ["Breakfast", "Lunch", "Dinner", "Snack"].includes(payload.mealType) ? payload.mealType : "Snack", marker = `[REP:${safeText(payload.id, 100)}]`;
  return {
    "Name": { title: richText(payload.food_name || payload.rawNote || "Meal note") },
    "Date": { date: { start: safeText(payload.date, 40) } },
    "Meal Type": { select: { name: meal } },
    "Log Method": { select: { name: method } },
    "Calories": { number: Number(payload.calories) || 0 },
    "Protein": { number: Number(payload.protein_g) || 0 },
    "Carbs": { number: Number(payload.carbs_g) || 0 },
    "Fat": { number: Number(payload.fat_g) || 0 },
    "Fiber": { number: Number(payload.fiber_g) || 0 },
    "Sugar": { number: Number(payload.sugar_g) || 0 },
    "Sodium": { number: Number(payload.sodium_mg) || 0 },
    "Portion Size": { rich_text: richText(payload.portion_size) },
    "Confidence": { select: { name: ["High", "Medium", "Low"].includes(payload.confidence) ? payload.confidence : "Low" } },
    "Notes": { rich_text: richText(`${marker} ${safeText(payload.rawNote, 900)}${payload.notes ? ` \xB7 ${safeText(payload.notes, 600)}` : ""}`) }
  };
}
async function syncFood(env, payload, source) {
  if (!payload?.id || !payload?.date) return json({ ok: false, error: "Invalid food entry." }, 400);
  const guard = await ensureFoodDestination(env);
  if (!guard.healthy) throw Error(guard.error || "The Notion food destination is not ready.");
  const marker = `[REP:${safeText(payload.id, 100)}]`, result = await notionRequest(env, `/data_sources/${source}/query`, { method: "POST", body: JSON.stringify({ page_size: 1, filter: { property: "Notes", rich_text: { contains: marker } } }) });
  if (result.results?.length) {
    const pageId = result.results[0].id;
    await notionRequest(env, `/pages/${pageId}`, { method: "PATCH", body: JSON.stringify({ properties: foodProperties(payload) }) });
    const receipt2 = await verifyNotionPage(env, pageId, source);
    return json({ ok: true, ...receipt2, kind: "food", entryId: safeText(payload.id, 100), created: 0, updated: 1 });
  }
  const createdPage = await notionRequest(env, "/pages", { method: "POST", body: JSON.stringify({ parent: { type: "data_source_id", data_source_id: source }, properties: foodProperties(payload) }) });
  const receipt = await verifyNotionPage(env, createdPage.id, source);
  return json({ ok: true, ...receipt, kind: "food", entryId: safeText(payload.id, 100), created: 1, skipped: 0 });
}
async function syncHealthBody(env, body) {
  if (!env.NOTION_TOKEN || !env.REP_SYNC_KEY) return json({ ok: false, error: "Sync is not configured on the server." }, 503);
  const kind = safeText(body?.kind, 20), payload = body?.payload, source = healthSource(env, kind);
  if (!source || !payload || !/^\d{4}-\d{2}-\d{2}$/.test(safeText(payload.date, 10))) return json({ ok: false, error: "Invalid health log payload." }, 400);
  if (kind === "food") return syncFood(env, payload, source);
  const builders = { recovery: recoveryProperties, sleep: sleepProperties, nutrition: nutritionProperties, hygiene: hygieneProperties, habit: habitProperties }, properties = builders[kind]?.(payload);
  if (!properties) return json({ ok: false, error: "Unsupported health log type." }, 400);
  const pageId = kind === "habit" ? await existingHabitPage(env, source, payload) : await existingHealthPage(env, source, payload.date);
  const savedPage = pageId ? await notionRequest(env, `/pages/${pageId}`, { method: "PATCH", body: JSON.stringify({ properties }) }) : await notionRequest(env, "/pages", { method: "POST", body: JSON.stringify({ parent: { type: "data_source_id", data_source_id: source }, properties }) });
  const receipt = await verifyNotionPage(env, savedPage.id || pageId, source);
  return json({ ok: true, ...receipt, kind, date: safeText(payload.date, 10), created: pageId ? 0 : 1, updated: pageId ? 1 : 0 });
}
async function executeSyncBody(env, body) {
  return body?.workout ? syncWorkoutBody(env, body) : syncHealthBody(env, body);
}
async function notionHealth(env) {
  const configured = Boolean(env.NOTION_TOKEN), destination = foodDestination(env), source = destination.sourceId;
  if (!configured) return { configured: false, healthy: false, destination, error: "NOTION_TOKEN is not configured." };
  const started = Date.now();
  try {
    const data = await notionRequest(env, `/data_sources/${source}`);
    const schema = validateFoodSchema(data), trashed = Boolean(data?.in_trash || data?.archived);
    const schemaError = !schema.valid ? `Food Entries schema needs attention. Missing: ${schema.missing.join(", ") || "none"}; incompatible: ${schema.incompatible.map((item) => `${item.name} (${item.actual} \u2192 ${item.expected})`).join(", ") || "none"}.` : null;
    return { configured: true, healthy: Boolean(data?.id) && !trashed && schema.valid, sourceId: source, destination, schema, trashed, latencyMs: Date.now() - started, error: trashed ? "The Food Entries source is in Notion Trash. Restore it; your View of Food Entries link will continue to work." : schemaError };
  } catch (error) {
    return { configured: true, healthy: false, sourceId: source, destination, schema: { valid: false, missing: [], incompatible: [] }, latencyMs: Date.now() - started, error: actionableNotionError(error, destination) };
  }
}
async function ensureFoodDestination(env) {
  const cached = env.PUSH_KV ? await env.PUSH_KV.get(SYSTEM_HEALTH_KEY, "json").catch(() => null) : null, age = cached?.checkedAt ? Date.now() - Date.parse(cached.checkedAt) : Infinity;
  if (age < 12e4 && cached?.notion?.sourceId === healthSource(env, "food")) return cached.notion;
  return notionHealth(env);
}
var b64urlEncode2 = (bytes) => {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
var b64urlDecode2 = (str) => {
  const padding = "=".repeat((4 - str.length % 4) % 4);
  const raw = atob((str + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
};
async function hmacSha2562(keyBytes, dataBytes) {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, dataBytes));
}
var credentialEncoder = new TextEncoder();
var credentialDecoder = new TextDecoder();
var SESSION_COOKIE = "__Host-rep_session";
var SESSION_MAX_AGE = 400 * 86400;
var deviceKey = (id) => `device:${id}`;
function cookieValue(request, name) {
  const prefix = `${name}=`;
  for (const part of String(request.headers.get("cookie") || "").split(";")) {
    const value = part.trim();
    if (value.startsWith(prefix)) return decodeURIComponent(value.slice(prefix.length));
  }
  return "";
}
function sessionCookie(token, maxAge = SESSION_MAX_AGE) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;
}
async function signCredential(env, payload) {
  const encoded = b64urlEncode2(credentialEncoder.encode(JSON.stringify(payload)));
  const signature = await hmacSha2562(credentialEncoder.encode(env.REP_SYNC_KEY || ""), credentialEncoder.encode(encoded));
  return `rep1.${encoded}.${b64urlEncode2(signature)}`;
}
async function verifyCredential(env, token, expectedType = "device") {
  try {
    if (!env.REP_SYNC_KEY || String(token || "").length > 1400) return null;
    const [version, encoded, signature, ...extra] = String(token || "").split(".");
    if (version !== "rep1" || !encoded || !signature || extra.length) return null;
    const expected = b64urlEncode2(await hmacSha2562(credentialEncoder.encode(env.REP_SYNC_KEY), credentialEncoder.encode(encoded)));
    if (!await timingSafeEqual(signature, expected)) return null;
    const payload = JSON.parse(credentialDecoder.decode(b64urlDecode2(encoded))), now = Math.floor(Date.now() / 1e3);
    if (payload.typ !== expectedType || !Number.isFinite(payload.iat) || Number(payload.iat) > now + 60) return null;
    if (expectedType !== "device" && (!Number.isFinite(payload.exp) || payload.exp <= now)) return null;
    if (expectedType === "device" && payload.exp !== void 0 && (!Number.isFinite(payload.exp) || payload.exp <= now)) return null;
    return payload;
  } catch {
    return null;
  }
}
async function registeredDevice(env, payload) {
  if (!payload?.reg) return true;
  const coordinator = deviceCoordinator(env, payload.jti);
  if (coordinator) {
    const status = await coordinator.status();
    if (status) return status.active === true;
    const legacy = await env.PUSH_KV?.get(deviceKey(payload.jti), "json");
    if (legacy && !legacy.revokedAt) {
      const record2 = { id: payload.jti, label: safeText(legacy.label || "Migrated device", 160), createdAt: legacy.createdAt || (/* @__PURE__ */ new Date()).toISOString(), lastSeenAt: legacy.lastSeenAt || (/* @__PURE__ */ new Date()).toISOString() };
      await Promise.all([coordinator.register(record2), registryCoordinator(env)?.register(record2)]);
      await env.PUSH_KV?.delete(deviceKey(payload.jti));
      return true;
    }
    return false;
  }
  const record = await env.PUSH_KV?.get(deviceKey(payload.jti), "json");
  return Boolean(record && !record.revokedAt);
}
async function authInfo(request, env) {
  if (!env.REP_SYNC_KEY || String(env.REP_SYNC_KEY).length < 32) return null;
  const supplied = request.headers.get("x-rep-sync-key") || "";
  if (supplied && await timingSafeEqual(supplied, env.REP_SYNC_KEY)) return { type: "master", token: supplied };
  const candidates = [supplied, cookieValue(request, SESSION_COOKIE)].filter(Boolean);
  for (const token of candidates) {
    const payload = await verifyCredential(env, token, "device");
    if (payload && await registeredDevice(env, payload)) return { type: payload.reg ? "device" : "legacy-device", payload, token };
  }
  return null;
}
function capabilities(env) {
  return {
    foodAi: Boolean(env.GEMINI_API_KEY || env.GOOGLE_API_KEY),
    notion: Boolean(env.NOTION_TOKEN),
    vitalsAi: Boolean(env.GEMINI_API_KEY || env.GOOGLE_API_KEY),
    vitalsImport: Boolean(env.PUSH_KV),
    push: Boolean((env.DEVICE_COORDINATOR || env.PUSH_KV) && env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY_JWK)
  };
}
function namespaceStub(namespace, name) {
  if (!namespace) return null;
  if (typeof namespace.getByName === "function") return namespace.getByName(name);
  if (typeof namespace.idFromName === "function" && typeof namespace.get === "function") return namespace.get(namespace.idFromName(name));
  return null;
}
var deviceCoordinator = (env, id) => id ? namespaceStub(env.DEVICE_COORDINATOR, `device:${id}`) : null;
var registryCoordinator = (env) => namespaceStub(env.DEVICE_REGISTRY, "owner-device-registry");
async function issueDeviceCredential(env, request) {
  if (!env.DEVICE_COORDINATOR && !env.PUSH_KV) throw Error("Device pairing storage is not configured.");
  const now = Math.floor(Date.now() / 1e3), jti = crypto.randomUUID();
  const credential = await signCredential(env, { typ: "device", iat: now, jti, reg: 1 });
  const record = { id: jti, createdAt: new Date(now * 1e3).toISOString(), lastSeenAt: (/* @__PURE__ */ new Date()).toISOString(), label: safeText(request?.headers.get("user-agent") || "Browser", 160) };
  const coordinator = deviceCoordinator(env, jti), registry = registryCoordinator(env);
  if (coordinator) await Promise.all([coordinator.register(record), registry?.register(record)]);
  else await env.PUSH_KV.put(deviceKey(jti), JSON.stringify(record));
  return { credential, deviceId: jti, expiresAt: null, persistent: true };
}
function pairedSessionResponse(body, device, status = 200) {
  return json({ ...body, credential: "cookie", deviceId: device.deviceId, expiresAt: device.expiresAt, persistent: device.persistent === true }, status, { "set-cookie": sessionCookie(device.credential) });
}
async function handoffState(env, jti, action) {
  if (env.PAIRING_COORDINATOR) {
    const id = env.PAIRING_COORDINATOR.idFromName(`handoff:${jti}`), stub = env.PAIRING_COORDINATOR.get(id);
    const response = await stub.fetch(`https://pairing.internal/${action}`, { method: "POST" });
    return response.ok;
  }
  if (!env.PUSH_KV) return false;
  const key = `handoff:${jti}`;
  if (action === "create") {
    await env.PUSH_KV.put(key, "ready", { expirationTtl: 360 });
    return true;
  }
  if (await env.PUSH_KV.get(key) !== "ready") return false;
  await env.PUSH_KV.delete(key);
  return true;
}
async function createPairHandoff(request, env) {
  if (!await paired(request, env)) return json({ ok: false, error: "This device is not paired." }, 401);
  if (await rateLimited(request, "pair-handoff", 20, 60, env)) return rateLimitResponse();
  const now = Math.floor(Date.now() / 1e3), exp = now + 300, jti = crypto.randomUUID(), token = await signCredential(env, { typ: "handoff", iat: now, exp, jti });
  if (!await handoffState(env, jti, "create")) return json({ ok: false, error: "Secure pairing handoff storage is unavailable." }, 503);
  const url = new URL(request.url);
  url.pathname = "/";
  url.search = `?pair=${encodeURIComponent(token)}`;
  return json({ ok: true, url: url.toString(), expiresAt: new Date(exp * 1e3).toISOString() });
}
async function claimPairHandoff(request, env) {
  if (!env.REP_SYNC_KEY) return json({ ok: false, error: "Pairing is not configured." }, 503);
  const body = await request.json().catch(() => null), handoff = await verifyCredential(env, body?.token, "handoff");
  if (!handoff) return json({ ok: false, error: "This pairing link is invalid or expired." }, 401);
  if (!await handoffState(env, handoff.jti, "claim")) return json({ ok: false, error: "This pairing link was already used or expired." }, 401);
  const device = await issueDeviceCredential(env, request);
  return pairedSessionResponse({ ok: true, ...capabilities(env) }, device);
}
var PairingCoordinator = class {
  constructor(state) {
    this.state = state;
  }
  async fetch(request) {
    const action = new URL(request.url).pathname.slice(1);
    if (action === "create") {
      await this.state.storage.put("ready", true, { expiration: Math.floor(Date.now() / 1e3) + 360 });
      return new Response(null, { status: 204 });
    }
    if (action === "claim") {
      const claimed = await this.state.storage.transaction(async (tx) => {
        if (!await tx.get("ready")) return false;
        await tx.delete("ready");
        return true;
      });
      return new Response(null, { status: claimed ? 204 : 409 });
    }
    return new Response(null, { status: 404 });
  }
};
async function pushKvKey(endpoint) {
  const digest = await crypto.subtle.digest("SHA-256", credentialEncoder.encode(endpoint));
  return `sub:${b64urlEncode2(new Uint8Array(digest))}`;
}
async function subscribePush(request, env) {
  if (!env.DEVICE_COORDINATOR && !env.PUSH_KV) return json({ ok: false, error: "Push notifications are not set up on the server yet." }, 503);
  const deviceAuth = await authInfo(request, env);
  if (!deviceAuth?.payload?.jti) return json({ ok: false, error: "A registered device pairing is required." }, 401);
  if (await rateLimited(request, "push-subscribe", 20, 60, env)) return rateLimitResponse();
  if (!requestOriginAllowed(request)) return json({ ok: false, error: "Origin is not allowed." }, 403);
  const input = validatePushSchedule(await request.json().catch(() => null));
  if (!input) return json({ ok: false, error: "Invalid subscription payload." }, 400);
  const { subscription, time, timezoneOffsetMinutes } = input, { endpoint, keys: { p256dh, auth } } = subscription;
  let keyShapeValid = false, endpointValid = false;
  try {
    const publicBytes = b64urlDecode2(p256dh), authBytes = b64urlDecode2(auth);
    keyShapeValid = publicBytes.length === 65 && publicBytes[0] === 4 && authBytes.length >= 16;
    endpointValid = new URL(endpoint).protocol === "https:";
  } catch {
  }
  if (!endpointValid || !keyShapeValid || !TIME_PATTERN.test(time)) {
    return json({ ok: false, error: "Invalid subscription payload." }, 400);
  }
  const coordinator = deviceCoordinator(env, deviceAuth.payload.jti);
  if (coordinator) {
    const scheduled = await coordinator.setPush(input);
    return json({ ok: true, scheduler: "durable-object-alarm", ...scheduled });
  }
  const record = { ...input, updatedAt: (/* @__PURE__ */ new Date()).toISOString(), lastSentDate: null };
  await env.PUSH_KV.put(await pushKvKey(endpoint), JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 400 });
  return json({ ok: true, scheduler: "legacy-kv" });
}
async function unsubscribePush(request, env) {
  const deviceAuth = await authInfo(request, env);
  if (!deviceAuth?.payload?.jti) return json({ ok: false, error: "Pairing is required." }, 401);
  if (await rateLimited(request, "push-unsubscribe", 20, 60, env)) return rateLimitResponse();
  const body = await request.json().catch(() => null);
  const endpoint = safeText(body?.endpoint, 1800);
  const coordinator = deviceCoordinator(env, deviceAuth.payload.jti);
  if (coordinator) await coordinator.clearPush(endpoint || void 0);
  if (endpoint) {
    await env.PUSH_KV?.delete(await pushKvKey(endpoint));
    if (endpoint.length <= 500) await env.PUSH_KV?.delete(`sub:${endpoint}`);
  }
  return json({ ok: true });
}
function infrastructureHealth(env) {
  let publicKeyValid = false, privateKeyValid = false;
  try {
    const bytes = b64urlDecode2(env.VAPID_PUBLIC_KEY || "");
    publicKeyValid = bytes.length === 65 && bytes[0] === 4;
  } catch {
  }
  try {
    const key = JSON.parse(env.VAPID_PRIVATE_KEY_JWK || "{}");
    privateKeyValid = key.kty === "EC" && key.crv === "P-256" && Boolean(key.d);
  } catch {
  }
  return {
    push: { configured: Boolean((env.DEVICE_COORDINATOR || env.PUSH_KV) && publicKeyValid && privateKeyValid), scheduler: env.DEVICE_COORDINATOR ? "durable-object-alarm" : "legacy-kv", publicKeyValid, privateKeyValid, subjectConfigured: /^mailto:|^https:\/\//.test(env.VAPID_SUBJECT || "") },
    backups: { configured: true, mode: "client-aes-256-gcm" },
    healthkit: { configured: Boolean(env.PUSH_KV && (env.VITALS_IMPORT_KEY || env.REP_SYNC_KEY)), endpoint: "/api/vitals/import" }
  };
}
async function sendSystemHealthAlert(env, record) {
  if (!env.VAPID_PRIVATE_KEY_JWK || !env.VAPID_PUBLIC_KEY) return { sent: 0 };
  const message = { title: "Health OS sync needs attention", body: record.notion?.error || "The direct Notion connection needs attention." };
  const registry = registryCoordinator(env);
  if (registry) {
    const devices = await registry.list(100);
    let sent2 = 0;
    for (const device of devices) {
      try {
        const result = await deviceCoordinator(env, device.id)?.sendNow(message);
        if (result?.ok) sent2++;
      } catch {
      }
    }
    return { sent: sent2 };
  }
  if (!env.PUSH_KV) return { sent: 0 };
  const list = await env.PUSH_KV.list({ prefix: "sub:", limit: 1e3 });
  let sent = 0;
  for (const key of list.keys) {
    const subscription = await env.PUSH_KV.get(key.name, "json");
    if (!subscription?.subscription) continue;
    try {
      const response = await sendWebPush(env, subscription.subscription, message);
      if (response.status === 404 || response.status === 410) await env.PUSH_KV.delete(key.name);
      else if (response.ok) sent++;
    } catch {
    }
  }
  return { sent };
}
async function monitorSystemHealth(env) {
  const previous = await env.PUSH_KV?.get(SYSTEM_HEALTH_KEY, "json");
  if (previous?.checkedAt && Date.now() - Date.parse(previous.checkedAt) < 4 * 60 * 1e3) return previous;
  const notion = await notionHealth(env), consecutiveFailures = notion.healthy ? 0 : (Number(previous?.consecutiveFailures) || 0) + 1;
  const issue = consecutiveFailures >= 2;
  const record = { checkedAt: (/* @__PURE__ */ new Date()).toISOString(), notion, sync: { mode: "verified-outbox", queued: true }, consecutiveFailures, issue };
  if (env.PUSH_KV) await env.PUSH_KV.put(SYSTEM_HEALTH_KEY, JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 30 });
  if (issue && env.PUSH_KV) {
    const signature = JSON.stringify([notion.healthy, notion.error]), priorAlert = await env.PUSH_KV.get(SYSTEM_ALERT_KEY, "json"), due = !priorAlert || priorAlert.signature !== signature || Date.now() - Date.parse(priorAlert.sentAt) > 6 * 60 * 60 * 1e3;
    if (due) {
      const result = await sendSystemHealthAlert(env, record);
      await env.PUSH_KV.put(SYSTEM_ALERT_KEY, JSON.stringify({ signature, sentAt: (/* @__PURE__ */ new Date()).toISOString(), sent: result.sent }), { expirationTtl: 60 * 60 * 24 * 30 });
    }
  }
  return record;
}
async function testPush(request, env) {
  const deviceAuth = await authInfo(request, env);
  if (!deviceAuth?.payload?.jti) return json({ ok: false, error: "A registered device pairing is required." }, 401);
  if (await rateLimited(request, "push-test", 20, 60, env)) return rateLimitResponse();
  if (!infrastructureHealth(env).push.configured) return json({ ok: false, error: "Push is not fully configured." }, 503);
  const coordinator = deviceCoordinator(env, deviceAuth.payload.jti);
  if (coordinator) {
    const result = await coordinator.sendNow({ title: "Health OS test", body: "Push notifications are working on this device." });
    return result.ok ? json({ ok: true, status: result.status }) : json({ ok: false, error: result.status === 404 ? "This device does not have an active push subscription." : `Push service rejected the test (${result.status}).` }, result.status === 404 ? 404 : 502);
  }
  const body = await request.json().catch(() => null), endpoint = safeText(body?.endpoint, 1800);
  if (!endpoint || !env.PUSH_KV) return json({ ok: false, error: "A subscribed device endpoint is required." }, 400);
  const key = await pushKvKey(endpoint), record = await env.PUSH_KV.get(key, "json");
  if (!record?.subscription) return json({ ok: false, error: "This device does not have an active push subscription." }, 404);
  const response = await sendWebPush(env, record.subscription, { title: "Health OS test", "body": "Push notifications are working on this device." });
  if (response.status === 404 || response.status === 410) {
    await env.PUSH_KV.delete(key);
    return json({ ok: false, error: "The push subscription expired. Enable reminders again." }, 410);
  }
  return response.ok ? json({ ok: true, status: response.status }) : json({ ok: false, error: `Push service rejected the test (${response.status}).` }, 502);
}
async function route(request, env, ctx) {
  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(request.method) && !requestOriginAllowed(request)) {
    return json({ ok: false, error: "Origin is not allowed." }, 403);
  }
  const canonical = safeText(env.CANONICAL_ORIGIN, 400);
  if (canonical) {
    let expected;
    try {
      expected = new URL(canonical).origin;
    } catch {
      return json({ ok: false, error: "CANONICAL_ORIGIN is invalid." }, 500);
    }
    if (url.origin !== expected) {
      if (url.pathname.startsWith("/api/") || !["GET", "HEAD"].includes(request.method)) return json({ ok: false, error: "Use the canonical application origin." }, 421);
      const target = new URL(`${url.pathname}${url.search}${url.hash}`, expected);
      return Response.redirect(target, 308);
    }
  }
  if (url.pathname === "/api/pair-check") {
    if (request.method === "POST") {
      if (await rateLimited(request, "pair-check", 20, 60, env)) return rateLimitResponse();
      const auth = await authInfo(request, env);
      if (!auth) return json({ ok: false, error: "This device is not paired or was revoked." }, 401);
      if (auth.type === "master" || auth.type === "legacy-device") {
        const device = await issueDeviceCredential(env, request);
        return pairedSessionResponse({ ok: true, ...capabilities(env), deviceCredential: true, migrated: auth.type === "legacy-device" }, device);
      }
      const touchedAt = (/* @__PURE__ */ new Date()).toISOString(), coordinator = deviceCoordinator(env, auth.payload.jti), registry = registryCoordinator(env);
      if (coordinator) await Promise.all([coordinator.touch(touchedAt), registry?.touch(auth.payload.jti, touchedAt)]);
      else {
        const record = await env.PUSH_KV?.get(deviceKey(auth.payload.jti), "json");
        if (record) {
          record.lastSeenAt = touchedAt;
          delete record.expiresAt;
          await env.PUSH_KV.put(deviceKey(auth.payload.jti), JSON.stringify(record));
        }
      }
      if (auth.payload.exp !== void 0) {
        const device = await issueDeviceCredential(env, request);
        return pairedSessionResponse({ ok: true, ...capabilities(env), deviceCredential: true, rotated: true }, device);
      }
      return json({ ok: true, ...capabilities(env), credential: "cookie", deviceId: auth.payload.jti, expiresAt: null, persistent: true, deviceCredential: true }, 200, { "set-cookie": sessionCookie(auth.token) });
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
  if (url.pathname === "/api/pair/disconnect") {
    if (request.method === "POST") {
      const auth = await authInfo(request, env);
      if (auth?.payload?.jti && auth.payload.reg) {
        const revokedAt = (/* @__PURE__ */ new Date()).toISOString();
        await Promise.all([deviceCoordinator(env, auth.payload.jti)?.revoke(revokedAt), registryCoordinator(env)?.revoke(auth.payload.jti, revokedAt), env.PUSH_KV?.delete(deviceKey(auth.payload.jti))]);
      }
      return json({ ok: true }, 200, { "set-cookie": sessionCookie("", 0) });
    }
    return json({ ok: false, error: "Method not allowed." }, 405);
  }
  if (url.pathname === "/api/pair/devices") {
    const auth = await authInfo(request, env);
    if (!auth) return json({ ok: false, error: "Pairing is required." }, 401);
    if (request.method === "GET") {
      const registry = registryCoordinator(env);
      if (registry) {
        const records = await registry.list(100), devices2 = records.map((record) => ({ ...record, current: record.id === auth.payload?.jti }));
        return json({ ok: true, devices: devices2, consistency: "strong" });
      }
      if (!env.PUSH_KV) return json({ ok: true, devices: [] });
      const list = await env.PUSH_KV.list({ prefix: "device:" }), devices = [];
      for (const key of list.keys.slice(0, 100)) {
        const record = await env.PUSH_KV.get(key.name, "json");
        if (record && !record.revokedAt) devices.push({ id: record.id, label: record.label, createdAt: record.createdAt, lastSeenAt: record.lastSeenAt, current: record.id === auth.payload?.jti });
      }
      return json({ ok: true, devices });
    }
    if (request.method === "DELETE") {
      if (await rateLimited(request, "pair-devices-delete", 20, 60, env)) return rateLimitResponse();
      const body = await request.json().catch(() => null), id = validateDeviceId(body?.deviceId);
      if (!id) return json({ ok: false, error: "deviceId is required." }, 400);
      const revokedAt = (/* @__PURE__ */ new Date()).toISOString();
      await Promise.all([deviceCoordinator(env, id)?.revoke(revokedAt), registryCoordinator(env)?.revoke(id, revokedAt), env.PUSH_KV?.delete(deviceKey(id))]);
      const clearingCurrent = id === auth.payload?.jti;
      return json({ ok: true }, 200, clearingCurrent ? { "set-cookie": sessionCookie("", 0) } : {});
    }
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
  if (url.pathname === "/api/automation-health") {
    if (request.method !== "GET") return json({ ok: false, error: "Method not allowed." }, 405);
    if (!await automationPaired(request, env)) return json({ ok: false, error: "Automation key is incorrect or missing." }, 401);
    return json({ ok: true, checkedAt: (/* @__PURE__ */ new Date()).toISOString(), healthkit: infrastructureHealth(env).healthkit, notionDestination: foodDestination(env) });
  }
  if (url.pathname === "/api/system-health") {
    if (request.method !== "GET") return request.method === "OPTIONS" ? new Response(null, { status: 204 }) : json({ ok: false, error: "Method not allowed." }, 405);
    if (!await paired(request, env)) return json({ ok: false, error: "This device is not paired or was revoked." }, 401);
    const [notion, monitor] = await Promise.all([notionHealth(env), env.PUSH_KV?.get(SYSTEM_HEALTH_KEY, "json")]);
    const infrastructure = infrastructureHealth(env);
    return json({ ok: true, version: "69", environment: env.ENVIRONMENT || "production", checkedAt: (/* @__PURE__ */ new Date()).toISOString(), notion, sync: { mode: "verified-outbox", queued: true }, monitor, infrastructure, objectives: SERVICE_LEVEL_OBJECTIVES, services: { foodAi: Boolean(env.GEMINI_API_KEY || env.GOOGLE_API_KEY), vitalsAi: Boolean(env.GEMINI_API_KEY || env.GOOGLE_API_KEY), push: infrastructure.push.configured } });
  }
  if (url.pathname === "/api/telemetry") {
    if (request.method !== "POST") return json({ ok: false, error: "Method not allowed." }, 405);
    if (!await paired(request, env)) return json({ ok: false, error: "This device is not paired or was revoked." }, 401);
    if (await rateLimited(request, "telemetry", 30, 60, env)) return rateLimitResponse();
    if (requestTooLarge(request, 8192)) return json({ ok: false, error: "Telemetry payload is too large." }, 413);
    const sample = validateTelemetry(await request.json().catch(() => null));
    if (!sample) return json({ ok: false, error: "Invalid telemetry sample." }, 400);
    logEvent("info", "client_web_vitals", sample);
    return json({ ok: true }, 202);
  }
  if (url.pathname === "/api/notion-sync") {
    if (request.method === "POST") {
      if (await rateLimited(request, "notion-sync", 600, 60, env)) return rateLimitResponse();
      if (requestTooLarge(request, 2e6)) return json({ ok: false, error: "Sync payload is too large." }, 413);
      const deviceAuth = await authInfo(request, env);
      if (!deviceAuth) return json({ ok: false, error: "This device is not paired or was revoked." }, 401);
      try {
        const idempotency = safeText(request.headers.get("x-rep-idempotency-key"), 180), raw = await request.text();
        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          return json({ ok: false, error: "Invalid JSON format." }, 400);
        }
        const body = validateSyncBody(parsed);
        if (!body) return json({ ok: false, error: "Invalid sync payload." }, 400);
        const digest = idempotency ? b64urlEncode2(new Uint8Array(await crypto.subtle.digest("SHA-256", credentialEncoder.encode(`${idempotency}
${raw}`)))) : "";
        const receiptCoordinator = deviceAuth.payload?.jti ? deviceCoordinator(env, deviceAuth.payload.jti) : null;
        if (digest) {
          const existing = receiptCoordinator ? await receiptCoordinator.getReceipt(digest) : await env.PUSH_KV?.get(`syncreceipt:${digest}`, "json");
          if (existing?.ok && existing?.verified) return json({ ...existing, duplicate: true });
        }
        const startedAt = Date.now(), response = await executeSyncBody(env, body), receipt = await response.clone().json().catch(() => null);
        logEvent(response.ok && receipt?.verified ? "info" : "warn", "notion_sync_completed", { kind: body.workout ? "workout" : body.kind, status: response.status, verified: receipt?.verified === true, durationMs: Date.now() - startedAt });
        if (digest && response.ok && receipt?.ok && receipt?.verified) {
          if (receiptCoordinator) await receiptCoordinator.putReceipt(digest, receipt);
          else await env.PUSH_KV?.put(`syncreceipt:${digest}`, JSON.stringify(receipt), { expirationTtl: 60 * 60 * 24 * 30 });
        }
        return response;
      } catch (error) {
        return json({ ok: false, error: safeText(error?.message || "Sync failed.", 300) }, 502);
      }
    }
    if (request.method === "OPTIONS") return new Response(null, { status: 204 });
    return json({ ok: false, error: "Method not allowed." }, 405);
  }
  if (url.pathname === "/api/sync-status") {
    if (request.method !== "GET") return request.method === "OPTIONS" ? new Response(null, { status: 204 }) : json({ ok: false, error: "Method not allowed." }, 405);
    return json({ ok: false, error: "Sync jobs were removed in v67. Send data directly to /api/notion-sync." }, 410);
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
  if (url.pathname === "/api/push/test") {
    if (request.method === "POST") return testPush(request, env);
    return json({ ok: false, error: "Method not allowed." }, 405);
  }
  if (url.pathname === "/api/push/unsubscribe") {
    if (request.method === "POST") return unsubscribePush(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204 });
    return json({ ok: false, error: "Method not allowed." }, 405);
  }
  if (url.pathname === "/api/security/csp-report") {
    if (request.method !== "POST") return json({ ok: false, error: "Method not allowed." }, 405);
    if (requestTooLarge(request, 16384)) return new Response(null, { status: 413 });
    const report = await request.json().catch(() => null), body = report?.["csp-report"] || report?.body || {};
    const blocked = body["blocked-uri"] || body.blockedURL || "", source = body["source-file"] || body.sourceFile || "";
    const originOnly = (value) => {
      try {
        return new URL(value).origin;
      } catch {
        return safeText(value, 120);
      }
    };
    logEvent("warn", "csp_violation", { directive: safeText(body["violated-directive"] || body.effectiveDirective, 100), blockedOrigin: originOnly(blocked), sourceOrigin: originOnly(source), disposition: safeText(body.disposition, 20) });
    return new Response(null, { status: 204 });
  }
  if (env.ASSETS && typeof env.ASSETS.fetch === "function") return env.ASSETS.fetch(request);
  return new Response("Rep Gym Companion", { headers: { "content-type": "text/plain; charset=utf-8" } });
}
var index_default = {
  async fetch(request, env, ctx) {
    const requestId = crypto.randomUUID(), startedAt = Date.now(), path = new URL(request.url).pathname;
    try {
      const response = withSecurityHeaders(await route(request, env, ctx), requestId);
      console.log(JSON.stringify({ event: "request_completed", requestId, method: request.method, path, status: response.status, durationMs: Date.now() - startedAt }));
      return response;
    } catch (error) {
      console.error(JSON.stringify({ event: "request_failed", requestId, method: request.method, path, durationMs: Date.now() - startedAt, error: safeText(error?.message || "Unknown error", 240) }));
      return withSecurityHeaders(json({ ok: false, error: "Request failed.", requestId }, 500), requestId);
    }
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(monitorSystemHealth(env));
  }
};
export {
  DeviceCoordinator,
  DeviceRegistry,
  PairingCoordinator,
  index_default as default
};
