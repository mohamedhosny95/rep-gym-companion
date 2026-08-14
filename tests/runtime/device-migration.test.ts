import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import worker from "../../src/server/index.js";

function stubContext() {
  return { waitUntil(_promise: Promise<unknown>) {}, passThroughOnException() {} } as ExecutionContext;
}

function cookieFrom(response: Response): string {
  return (response.headers.get("set-cookie") || "").split(";", 1)[0] ?? "";
}

// Matches the REP_SYNC_KEY binding configured in vitest.config.ts's miniflare bindings.
const SYNC_KEY = "runtime-test-pairing-key-with-at-least-32-characters";

describe("legacy KV device credential migration", () => {
  it("copies a legacy KV-registered device into its Durable Object on the first authenticated request after upgrade, then removes the KV record", async () => {
    // Simulates pairing against a pre-v68 deployment (no DEVICE_COORDINATOR bound yet), then
    // that same device's cookie being used once the Worker is redeployed with the Durable
    // Object bound - the exact path ARCHITECTURE.md describes but nothing exercised until now.
    const legacyEnv = { ...env, DEVICE_COORDINATOR: undefined } as unknown as Env;
    const pairResponse = await worker.fetch(
      new Request("https://rep.example/api/pair-check", { method: "POST", headers: { "x-rep-sync-key": SYNC_KEY } }),
      legacyEnv,
      stubContext()
    );
    expect(pairResponse.status).toBe(200);
    const body = (await pairResponse.json()) as { deviceId: string };
    const cookie = cookieFrom(pairResponse);

    const legacyRecord = await env.PUSH_KV.get(`device:${body.deviceId}`, "json");
    expect(legacyRecord).not.toBeNull();
    const preMigrationStatus = await env.DEVICE_COORDINATOR.getByName(`device:${body.deviceId}`).status();
    expect(preMigrationStatus).toBeNull();

    const upgradedResponse = await worker.fetch(
      new Request("https://rep.example/api/pair-check", { method: "POST", headers: { cookie } }),
      env,
      stubContext()
    );
    expect(upgradedResponse.status).toBe(200);

    const migratedStatus = await env.DEVICE_COORDINATOR.getByName(`device:${body.deviceId}`).status();
    expect(migratedStatus?.active).toBe(true);
    expect(migratedStatus?.id).toBe(body.deviceId);
    expect(await env.PUSH_KV.get(`device:${body.deviceId}`, "json")).toBeNull();

    // The migrated device must keep working exactly as before on subsequent requests.
    const followUp = await worker.fetch(new Request("https://rep.example/api/pair-check", { method: "POST", headers: { cookie } }), env, stubContext());
    expect(followUp.status).toBe(200);
  });
});
