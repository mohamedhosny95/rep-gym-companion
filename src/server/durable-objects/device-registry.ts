import { DurableObject } from "cloudflare:workers";
import type { DeviceRegistration } from "./device-coordinator";

type RegistryRow = { device_id: string; label: string; created_at: string; last_seen_at: string; revoked_at: string | null };

export class DeviceRegistry extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
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

  async register(record: DeviceRegistration): Promise<void> {
    this.ctx.storage.sql.exec(
      `INSERT INTO devices (device_id, label, created_at, last_seen_at, revoked_at) VALUES (?, ?, ?, ?, NULL)
       ON CONFLICT(device_id) DO UPDATE SET label=excluded.label, last_seen_at=excluded.last_seen_at, revoked_at=NULL`,
      record.id, record.label, record.createdAt, record.lastSeenAt
    );
  }

  async touch(deviceId: string, at = new Date().toISOString()): Promise<void> {
    this.ctx.storage.sql.exec("UPDATE devices SET last_seen_at=? WHERE device_id=? AND revoked_at IS NULL", at, deviceId);
  }

  async revoke(deviceId: string, at = new Date().toISOString()): Promise<void> {
    this.ctx.storage.sql.exec("UPDATE devices SET revoked_at=? WHERE device_id=?", at, deviceId);
  }

  async list(limit = 100): Promise<Array<DeviceRegistration & { revokedAt: string | null }>> {
    const safeLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
    return this.ctx.storage.sql.exec<RegistryRow>(
      "SELECT device_id, label, created_at, last_seen_at, revoked_at FROM devices WHERE revoked_at IS NULL ORDER BY last_seen_at DESC LIMIT ?", safeLimit
    ).toArray().map(row => ({ id: row.device_id, label: row.label, createdAt: row.created_at, lastSeenAt: row.last_seen_at, revokedAt: row.revoked_at }));
  }
}
