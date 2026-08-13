import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("DeviceRegistry", () => {
  it("lists active devices by recent activity and hides revoked entries", async () => {
    const registry = env.DEVICE_REGISTRY.getByName(`registry-${crypto.randomUUID()}`);
    const first = { id: crypto.randomUUID(), label: "Phone", createdAt: "2026-08-13T08:00:00.000Z", lastSeenAt: "2026-08-13T08:00:00.000Z" };
    const second = { id: crypto.randomUUID(), label: "Tablet", createdAt: "2026-08-13T08:00:00.000Z", lastSeenAt: "2026-08-13T09:00:00.000Z" };
    await registry.register(first);await registry.register(second);
    expect((await registry.list()).map(device => device.id)).toEqual([second.id, first.id]);
    await registry.revoke(second.id);
    expect((await registry.list()).map(device => device.id)).toEqual([first.id]);
  });
});
