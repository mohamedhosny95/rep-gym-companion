export const SYNC_KINDS = ["food", "nutrition", "recovery", "sleep", "hygiene", "habit"] as const;
export type SyncKind = typeof SYNC_KINDS[number];

export type SyncBody =
  | { workout: Record<string, unknown> }
  | { kind: SyncKind; payload: Record<string, unknown> };

export type PushSubscriptionInput = {
  endpoint: string;
  expirationTime: number | null;
  keys: { p256dh: string; auth: string };
};

export type PushScheduleInput = {
  subscription: PushSubscriptionInput;
  time: string;
  reminders?: PushReminderInput[];
  timezoneOffsetMinutes: number;
  timezone: string | null;
  lang: "ar" | "en";
};

export const PUSH_REMINDER_IDS = ["workout", "bedtime", "unfinished", "weekly"] as const;
export type PushReminderId = typeof PUSH_REMINDER_IDS[number];
export type PushReminderInput = { id: PushReminderId; time: string; days: number[]; enabled: true };

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function validateSyncBody(value: unknown): SyncBody | null {
  if (!isRecord(value)) return null;
  if (isRecord(value.workout)) {
    const entries = value.workout.entries;
    if (!Array.isArray(entries) || entries.length === 0 || entries.length > 500) return null;
    return { workout: value.workout };
  }
  if (!SYNC_KINDS.includes(value.kind as SyncKind) || !isRecord(value.payload)) return null;
  return { kind: value.kind as SyncKind, payload: value.payload };
}

export function validatePushSchedule(value: unknown): PushScheduleInput | null {
  if (!isRecord(value) || !isRecord(value.subscription) || !isRecord(value.subscription.keys)) return null;
  const endpoint = String(value.subscription.endpoint ?? "").trim();
  const p256dh = String(value.subscription.keys.p256dh ?? "").trim();
  const auth = String(value.subscription.keys.auth ?? "").trim();
  const time = String(value.time ?? "").trim();
  const timezoneOffsetMinutes = Number(value.timezoneOffsetMinutes);
  const timezone = value.timezone ? String(value.timezone).trim() : null;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || !Number.isFinite(timezoneOffsetMinutes) || timezoneOffsetMinutes < -840 || timezoneOffsetMinutes > 840) return null;
  if (timezone && (timezone.length > 64 || !/^[A-Za-z0-9_+\/-]+$/.test(timezone))) return null;
  if (timezone) { try { new Intl.DateTimeFormat("en", { timeZone: timezone }).format(); } catch { return null; } }
  try { if (new URL(endpoint).protocol !== "https:") return null; } catch { return null; }
  if (!endpoint || endpoint.length > 1800 || !p256dh || p256dh.length > 300 || !auth || auth.length > 200) return null;
  const remindersRaw = Array.isArray(value.reminders) ? value.reminders : [];
  if (remindersRaw.length > 4) return null;
  const reminders: PushReminderInput[] = [];
  for (const item of remindersRaw) {
    if (!isRecord(item) || !PUSH_REMINDER_IDS.includes(item.id as PushReminderId) || item.enabled === false) return null;
    const reminderTime=String(item.time??"").trim(),days=Array.isArray(item.days)?[...new Set(item.days.map(Number))]:[];
    if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(reminderTime)||!days.length||days.length>7||days.some(day=>!Number.isInteger(day)||day<0||day>6))return null;
    reminders.push({id:item.id as PushReminderId,time:reminderTime,days,enabled:true});
  }
  if(new Set(reminders.map(item=>item.id)).size!==reminders.length)return null;
  return {
    subscription: { endpoint, expirationTime: Number.isFinite(Number(value.subscription.expirationTime)) ? Number(value.subscription.expirationTime) : null, keys: { p256dh, auth } },
    time,
    reminders: reminders.length?reminders:[{id:"workout",time,days:[0,1,2,3,4,5,6],enabled:true}],
    timezoneOffsetMinutes,
    timezone,
    lang: value.lang === "ar" ? "ar" : "en"
  };
}

export function validateDeviceId(value: unknown): string | null {
  const id = String(value ?? "").trim();
  return /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}

export type TelemetrySample = {
  build: string;
  lcpMs: number;
  cls: number;
  interactionMs: number;
  longTaskMs: number;
  loadMs: number;
};

export function validateTelemetry(value: unknown): TelemetrySample | null {
  if (!isRecord(value)) return null;
  const number = (field: string, maximum: number) => {
    const result = Number(value[field]);
    return Number.isFinite(result) && result >= 0 && result <= maximum ? result : null;
  };
  const build = String(value.build ?? "").slice(0, 16);
  const lcpMs = number("lcpMs", 120_000), cls = number("cls", 100), interactionMs = number("interactionMs", 120_000), longTaskMs = number("longTaskMs", 120_000), loadMs = number("loadMs", 120_000);
  if (!/^[a-z0-9._-]{1,16}$/i.test(build) || [lcpMs, cls, interactionMs, longTaskMs, loadMs].some(metric => metric === null)) return null;
  return { build, lcpMs: lcpMs!, cls: cls!, interactionMs: interactionMs!, longTaskMs: longTaskMs!, loadMs: loadMs! };
}
