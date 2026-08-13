import { describe, expect, it } from "vitest";
import { validateDeviceId, validatePushSchedule, validateSyncBody, validateTelemetry } from "../../src/server/contracts";
import { localDateAt, nextReminderAt } from "../../src/server/durable-objects/device-coordinator";

describe("runtime contracts", () => {
  it("accepts bounded sync payloads and rejects unknown kinds", () => {
    expect(validateSyncBody({ kind: "sleep", payload: { date: "2026-08-13", hours: 7 } })).toEqual({ kind: "sleep", payload: { date: "2026-08-13", hours: 7 } });
    expect(validateSyncBody({ kind: "unknown", payload: {} })).toBeNull();
    expect(validateSyncBody({ workout: { entries: [] } })).toBeNull();
  });

  it("validates push schedules before they cross a storage boundary", () => {
    const value = { subscription: { endpoint: "https://push.example/subscription", expirationTime: null, keys: { p256dh: "key", auth: "secret" } }, time: "07:30", timezoneOffsetMinutes: -180, timezone:"Africa/Cairo", lang: "ar" };
    expect(validatePushSchedule(value)?.lang).toBe("ar");
    expect(validatePushSchedule({ ...value, time: "25:30" })).toBeNull();
    expect(validatePushSchedule({ ...value, subscription: { ...value.subscription, endpoint: "http://push.example" } })).toBeNull();
  });

  it("only accepts canonical UUID device identifiers", () => {
    expect(validateDeviceId("06f054f4-3f5c-42e2-81a2-1f1e188c2780")).toBeTruthy();
    expect(validateDeviceId("../../other-device")).toBeNull();
  });

  it("computes per-device alarm schedules across timezone offsets", () => {
    const from = Date.parse("2026-08-13T08:00:00.000Z");
    expect(new Date(nextReminderAt("12:00", -180, from)).toISOString()).toBe("2026-08-13T09:00:00.000Z");
    expect(localDateAt(Date.parse("2026-08-13T22:30:00.000Z"), -180)).toBe("2026-08-14");
    expect(new Date(nextReminderAt("12:00","America/New_York",Date.parse("2026-01-01T08:00:00Z"))).toISOString()).toBe("2026-01-01T17:00:00.000Z");
    expect(new Date(nextReminderAt("12:00","America/New_York",Date.parse("2026-07-01T08:00:00Z"))).toISOString()).toBe("2026-07-01T16:00:00.000Z");
  });

  it("accepts only anonymous bounded web-vital samples", () => {
    expect(validateTelemetry({ build: "abc123", lcpMs: 1200, cls: 0.02, interactionMs: 80, longTaskMs: 55, loadMs: 900 })).toMatchObject({ build: "abc123", cls: 0.02 });
    expect(validateTelemetry({ build: "abc123", lcpMs: -1, cls: 0, interactionMs: 0, longTaskMs: 0, loadMs: 0 })).toBeNull();
    expect(validateTelemetry({ build: "health data here!", lcpMs: 1, cls: 0, interactionMs: 0, longTaskMs: 0, loadMs: 1 })).toBeNull();
  });
});
