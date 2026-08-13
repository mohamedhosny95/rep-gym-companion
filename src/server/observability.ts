export const SERVICE_LEVEL_OBJECTIVES = Object.freeze({
  availability: 0.999,
  internalErrorRate: 0.001,
  verifiedSyncWithinMinutes: 5,
  verifiedSyncRate: 0.995,
  pairingSuccessRate: 0.995
});

type LogFields = Record<string, string | number | boolean | null | undefined>;

export function logEvent(level: "info" | "warn" | "error", event: string, fields: LogFields = {}): void {
  const payload = JSON.stringify({ event, timestamp: new Date().toISOString(), ...fields });
  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.log(payload);
}

export function publicError(error: unknown, fallback = "Request failed."): string {
  if (!(error instanceof Error)) return fallback;
  return error.name === "TimeoutError" || error.name === "AbortError" ? "An upstream service timed out. Try again." : fallback;
}
