import { env, runDurableObjectAlarm, runInDurableObject } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { DeviceCoordinator } from "../../src/server/durable-objects/device-coordinator";

const record = { id: "06f054f4-3f5c-42e2-81a2-1f1e188c2780", label: "Runtime Test", createdAt: "2026-08-13T08:00:00.000Z", lastSeenAt: "2026-08-13T08:00:00.000Z" };

describe("DeviceCoordinator", () => {
  it("persists device authorization and revokes strongly consistently", async () => {
    const stub = env.DEVICE_COORDINATOR.getByName(`device:${record.id}`);
    await stub.register(record);
    expect(await stub.validate()).toBe(true);
    await stub.touch("2026-08-13T09:00:00.000Z");
    expect((await stub.status())?.lastSeenAt).toBe("2026-08-13T09:00:00.000Z");
    await stub.revoke("2026-08-13T10:00:00.000Z");
    expect(await stub.validate()).toBe(false);
  });

  it("stores and expires verified receipts without KV assumptions", async () => {
    const stub = env.DEVICE_COORDINATOR.getByName(`device:receipt-${crypto.randomUUID()}`);
    await stub.register({ ...record, id: crypto.randomUUID() });
    await stub.putReceipt("digest", { ok: true, verified: true }, 60_000);
    expect(await stub.getReceipt("digest")).toEqual({ ok: true, verified: true });
    await stub.putReceipt("expired", { ok: true }, -1);
    expect(await stub.getReceipt("expired")).toBeNull();
  });

  it("schedules and removes per-device alarms", async () => {
    const stub = env.DEVICE_COORDINATOR.getByName(`device:alarm-${crypto.randomUUID()}`);
    await stub.register({ ...record, id: crypto.randomUUID() });
    await stub.setPush({ subscription: { endpoint: "https://push.example/subscription", expirationTime: null, keys: { p256dh: "not-used-by-this-test", auth: "not-used" } }, time: "23:59", timezoneOffsetMinutes: 0, timezone:"UTC", lang: "en" });
    await runInDurableObject(stub, async (instance, state) => {
      expect(instance).toBeInstanceOf(DeviceCoordinator);
      expect(await state.storage.getAlarm()).not.toBeNull();
    });
    await stub.clearPush();
    expect(await runDurableObjectAlarm(stub)).toBe(false);
  });
});
