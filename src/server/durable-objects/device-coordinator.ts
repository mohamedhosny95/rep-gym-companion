import { DurableObject } from "cloudflare:workers";
import type { PushScheduleInput } from "../contracts";
import { sendWebPush, type StoredPushSubscription } from "../integrations/web-push";
import { logEvent } from "../observability";

export type DeviceRegistration = {
  id: string;
  label: string;
  createdAt: string;
  lastSeenAt: string;
};

type DeviceRow = { device_id: string; label: string; created_at: string; last_seen_at: string; revoked_at: string | null };
type PushRow = {
  endpoint: string; p256dh: string; auth: string; expiration_time: number | null;
  reminder_time: string; timezone_offset: number; timezone: string | null; lang: "ar" | "en";
  last_sent_date: string | null; updated_at: string; last_status: number | null; last_error: string | null;
};
type ReceiptRow = { receipt_json: string; expires_at: number };

function zoneParts(timestamp: number, timezone: string): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(timestamp));
  const number = (type: string) => Number(parts.find(part => part.type === type)?.value);
  return { year: number("year"), month: number("month"), day: number("day"), hour: number("hour"), minute: number("minute"), second: number("second") };
}

export function localDateAt(timestamp: number, timezone: string | number): string {
  if (typeof timezone === "number") return new Date(timestamp - timezone * 60_000).toISOString().slice(0, 10);
  const parts = zoneParts(timestamp, timezone);
  return `${parts.year}-${String(parts.month).padStart(2,"0")}-${String(parts.day).padStart(2,"0")}`;
}

export function nextReminderAt(time: string, timezone: string | number, from = Date.now()): number {
  const [hourText, minuteText] = time.split(":");
  const hour = Number(hourText), minute = Number(minuteText);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) throw new Error("Invalid reminder time.");
  if (typeof timezone === "number") {
    const localNow = new Date(from - timezone * 60_000);
    let scheduled = Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate(), hour, minute) + timezone * 60_000;
    if (scheduled <= from + 1_000) scheduled += 86_400_000;
    return scheduled;
  }
  const localNow = zoneParts(from, timezone), todayWall = Date.UTC(localNow.year, localNow.month-1, localNow.day, hour, minute);
  const resolveWall=(localWall:number)=>{let result=localWall;for(let iteration=0;iteration<3;iteration++){const atCandidate=zoneParts(result,timezone),offset=Date.UTC(atCandidate.year,atCandidate.month-1,atCandidate.day,atCandidate.hour,atCandidate.minute,atCandidate.second)-result;result=localWall-offset;}return result;};
  let scheduled = resolveWall(todayWall);
  if (scheduled <= from + 1_000) { const tomorrow=new Date(Date.UTC(localNow.year,localNow.month-1,localNow.day)+86_400_000);scheduled=resolveWall(Date.UTC(tomorrow.getUTCFullYear(),tomorrow.getUTCMonth(),tomorrow.getUTCDate(),hour,minute)); }
  return scheduled;
}

export class DeviceCoordinator extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
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
      const columns=this.ctx.storage.sql.exec<{name:string}>("PRAGMA table_info(push_subscription)").toArray();
      if(!columns.some(column=>column.name==="timezone"))this.ctx.storage.sql.exec("ALTER TABLE push_subscription ADD COLUMN timezone TEXT");
    });
  }

  async register(record: DeviceRegistration): Promise<void> {
    this.ctx.storage.sql.exec(
      `INSERT INTO device (singleton, device_id, label, created_at, last_seen_at, revoked_at)
       VALUES (1, ?, ?, ?, ?, NULL)
       ON CONFLICT(singleton) DO UPDATE SET label=excluded.label, last_seen_at=excluded.last_seen_at, revoked_at=NULL`,
      record.id, record.label, record.createdAt, record.lastSeenAt
    );
  }

  async status(): Promise<DeviceRegistration & { active: boolean; revokedAt: string | null } | null> {
    const rows = this.ctx.storage.sql.exec<DeviceRow>("SELECT device_id, label, created_at, last_seen_at, revoked_at FROM device WHERE singleton=1").toArray();
    const row = rows[0];
    return row ? { id: row.device_id, label: row.label, createdAt: row.created_at, lastSeenAt: row.last_seen_at, active: !row.revoked_at, revokedAt: row.revoked_at } : null;
  }

  async validate(): Promise<boolean> { return Boolean((await this.status())?.active); }

  async touch(at = new Date().toISOString()): Promise<void> {
    this.ctx.storage.sql.exec("UPDATE device SET last_seen_at=? WHERE singleton=1 AND revoked_at IS NULL", at);
  }

  async revoke(at = new Date().toISOString()): Promise<void> {
    this.ctx.storage.sql.exec("UPDATE device SET revoked_at=? WHERE singleton=1", at);
    this.ctx.storage.sql.exec("DELETE FROM push_subscription");
    this.ctx.storage.sql.exec("DELETE FROM sync_receipts");
    await this.ctx.storage.deleteAlarm();
  }

  async setPush(input: PushScheduleInput): Promise<{ nextReminderAt: string }> {
    if (!(await this.validate())) throw new Error("Device is revoked.");
    const now = new Date().toISOString();
    this.ctx.storage.sql.exec(
      `INSERT INTO push_subscription (singleton, endpoint, p256dh, auth, expiration_time, reminder_time, timezone_offset, timezone, lang, last_sent_date, updated_at, last_status, last_error)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL, NULL)
       ON CONFLICT(singleton) DO UPDATE SET endpoint=excluded.endpoint, p256dh=excluded.p256dh, auth=excluded.auth,
       expiration_time=excluded.expiration_time, reminder_time=excluded.reminder_time, timezone_offset=excluded.timezone_offset,
       timezone=excluded.timezone, lang=excluded.lang, updated_at=excluded.updated_at, last_error=NULL`,
      input.subscription.endpoint, input.subscription.keys.p256dh, input.subscription.keys.auth, input.subscription.expirationTime,
      input.time, input.timezoneOffsetMinutes, input.timezone, input.lang, now
    );
    const next = nextReminderAt(input.time, input.timezone||input.timezoneOffsetMinutes);
    await this.ctx.storage.setAlarm(next);
    return { nextReminderAt: new Date(next).toISOString() };
  }

  async clearPush(endpoint?: string): Promise<void> {
    if (endpoint) this.ctx.storage.sql.exec("DELETE FROM push_subscription WHERE singleton=1 AND endpoint=?", endpoint);
    else this.ctx.storage.sql.exec("DELETE FROM push_subscription");
    const remaining = this.ctx.storage.sql.exec<{ count: number }>("SELECT COUNT(*) AS count FROM push_subscription").one().count;
    if (!remaining) await this.ctx.storage.deleteAlarm();
  }

  private pushRow(): PushRow | null {
    return this.ctx.storage.sql.exec<PushRow>(
      "SELECT endpoint, p256dh, auth, expiration_time, reminder_time, timezone_offset, timezone, lang, last_sent_date, updated_at, last_status, last_error FROM push_subscription WHERE singleton=1"
    ).toArray()[0] ?? null;
  }

  private subscription(row: PushRow): StoredPushSubscription {
    return { endpoint: row.endpoint, expirationTime: row.expiration_time, keys: { p256dh: row.p256dh, auth: row.auth } };
  }

  async sendNow(payload: Record<string, unknown>): Promise<{ ok: boolean; status: number }> {
    const row = this.pushRow();
    if (!row || !(await this.validate())) return { ok: false, status: 404 };
    const response = await sendWebPush(this.env, this.subscription(row), payload);
    if (response.status === 404 || response.status === 410) await this.clearPush();
    else this.ctx.storage.sql.exec("UPDATE push_subscription SET last_status=?, last_error=NULL WHERE singleton=1", response.status);
    return { ok: response.ok, status: response.status };
  }

  async getReceipt(digest: string): Promise<Record<string, unknown> | null> {
    this.ctx.storage.sql.exec("DELETE FROM sync_receipts WHERE expires_at <= ?", Date.now());
    const row = this.ctx.storage.sql.exec<ReceiptRow>("SELECT receipt_json, expires_at FROM sync_receipts WHERE digest=?", digest).toArray()[0];
    if (!row || row.expires_at <= Date.now()) return null;
    try { return JSON.parse(row.receipt_json) as Record<string, unknown>; } catch { return null; }
  }

  async putReceipt(digest: string, receipt: Record<string, unknown>, ttlMs = 30 * 86_400_000): Promise<void> {
    this.ctx.storage.sql.exec(
      "INSERT INTO sync_receipts (digest, receipt_json, expires_at) VALUES (?, ?, ?) ON CONFLICT(digest) DO UPDATE SET receipt_json=excluded.receipt_json, expires_at=excluded.expires_at",
      digest, JSON.stringify(receipt), Date.now() + ttlMs
    );
  }

  async clearAll(): Promise<void> {
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();
  }

  async alarm(alarmInfo?: { retryCount?: number; isRetry?: boolean }): Promise<void> {
    const row = this.pushRow();
    if (!row || !(await this.validate())) { await this.ctx.storage.deleteAlarm(); return; }
    const zone=row.timezone||row.timezone_offset,today = localDateAt(Date.now(), zone);
    if (row.last_sent_date === today) { await this.ctx.storage.setAlarm(nextReminderAt(row.reminder_time, zone)); return; }
    const message = row.lang === "ar"
      ? {
          title: "Health OS",
          body: "حان وقت تسجيل يومك — تمرين، طعام، أو نوم.",
          data: { url: "/?quick=home" },
          actions: [
            { action: "open-habits", title: "العادات" },
            { action: "log-meal", title: "وجبة" },
            { action: "log-sleep", title: "نوم" }
          ]
        }
      : {
          title: "Health OS",
          body: "Time to log your day — a workout, a meal, or your sleep.",
          data: { url: "/?quick=home" },
          actions: [
            { action: "open-habits", title: "Habits" },
            { action: "log-meal", title: "Meal" },
            { action: "log-sleep", title: "Sleep" }
          ]
        };
    try {
      const response = await sendWebPush(this.env, this.subscription(row), message);
      if (response.status === 404 || response.status === 410) { await this.clearPush(); return; }
      if (!response.ok) throw new Error(`Push provider returned ${response.status}.`);
      // Commit last_sent_date the instant the send succeeds, before anything else that
      // could throw. A native alarm retry re-enters this function and, because the guard
      // above already sees today's date, reschedules without resending the notification.
      this.ctx.storage.sql.exec("UPDATE push_subscription SET last_sent_date=?, last_status=?, last_error=NULL WHERE singleton=1", today, response.status);
    } catch (error) {
      const messageText = error instanceof Error ? error.message.slice(0, 180) : "Unknown push failure";
      this.ctx.storage.sql.exec("UPDATE push_subscription SET last_error=? WHERE singleton=1", messageText);
      logEvent("error", "device_alarm_failed", { retryCount: alarmInfo?.retryCount ?? 0, error: messageText });
      if ((alarmInfo?.retryCount ?? 0) >= 5) { await this.ctx.storage.setAlarm(Date.now() + 30 * 60_000); return; }
      throw error;
    }
    await this.ctx.storage.setAlarm(nextReminderAt(row.reminder_time, zone));
  }
}
