# Reliability architecture

## Boundaries

`src/client` is an offline-first browser application. IndexedDB is the durable source for user-entered records. `sync-outbox.js` stores delivery intent separately and keeps each item in `pending`, `transmitting`, `retryable_failed`, `permanently_failed`, or confirmed/removed state. A record is removed only after the Worker returns a receipt that was verified by reading the Notion page after its write.

`src/server/index.js` is the HTTP adapter. New domain boundaries under `src/server/**/*.ts` are strict TypeScript and own request contracts, structured observability, Web Push, device authorization state, reminders, and sync receipts. `npm run typecheck` and the type-aware ESLint rules reject unsafe boundary changes and floating promises. `scripts/sync-static.mjs` bundles the Worker with esbuild, so `dist/server` is generated rather than a second source tree.

## Stateful runtime

- `PairingCoordinator`: atomic five-minute QR handoff claims.
- `DeviceCoordinator`: one SQLite Durable Object per device. It is the strongly consistent authority for authorization, idempotency receipts, a push subscription, and its per-device alarm.
- `DeviceRegistry`: the strongly consistent active-device index used by revocation, diagnostics, and incident notifications.
- KV: retained for Apple import aggregates, health-monitor snapshots, and compatibility migration. It is not the authority for new device credentials or reminder scheduling.

The per-device alarm removes the global subscription scan. It stores the browser's IANA time zone (with the numeric offset as a legacy fallback), so the next local reminder is recalculated across daylight-saving changes. A successful reminder schedules the next local day; expired subscriptions are deleted; transient provider failures use the runtime retry counter and fall back to a delayed retry after five attempts.

## Decisions

1. Durable Objects were selected instead of D1 because the hard problem is per-device serialization and alarms, not relational analytics.
2. Cloudflare Queues were not added. The browser already provides a durable user-visible outbox, and the Notion write must return a verified receipt to that user-owned queue.
3. Staging is a separate Worker environment with distinct KV, rate-limit namespaces, Durable Object namespace, secrets, and a dedicated Notion test source.
4. No medical conclusion is computed by the server. Raw samples stay in Apple Health; only daily aggregates and coverage metadata enter Rep.

## Compatibility and migration

Device credentials in legacy KV are copied into the relevant Durable Object on a successful authenticated request and then removed from KV. Users with a reminder created before version 68 should open reminder settings and save once to create the per-device alarm; legacy subscription records are not globally scanned because their old schema has no trustworthy device owner.
