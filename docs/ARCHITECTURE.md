# Reliability architecture

## Boundaries

`src/client` is an offline-first browser application. IndexedDB is the durable source for user-entered records. `sync-outbox.js` stores delivery intent separately and keeps each item in `pending`, `transmitting`, `retryable_failed`, `permanently_failed`, or confirmed/removed state. A record is removed only after the Worker returns a receipt that was verified by reading the Notion page after its write.

`src/server/index.js` is the HTTP adapter. New domain boundaries under `src/server/**/*.ts` are strict TypeScript and own request contracts, structured observability, Web Push, device authorization state, reminders, and sync receipts. `npm run typecheck` and the type-aware ESLint rules reject unsafe boundary changes and floating promises. `scripts/sync-static.mjs` bundles the Worker with esbuild, so `dist/server` is generated rather than a second source tree.

### Client override registry

`bootstrap.js` loads `app.js`, then `enhancements.js`, `habits.js`, `health-ui.js`, and `performance-ui.js` as plain sequential `<script>` tags with no bundler or module boundary; later files override earlier global functions (sometimes two or three layers deep, e.g. `renderHome` is reassigned by both `enhancements.js` and `health-ui.js`) by reassigning the same identifier. That load-order dependency is a real constraint of this codebase, not something addressed here by moving to ES modules - doing so would mean rewriting `index.html`'s script tags, `sw.js`'s precache list, and every cross-file global reference in one pass, which is a materially larger and riskier change than the reliability and correctness work this refactor pass otherwise covers.

Instead, every override site is now a call to `REP_OVERRIDE(name, implementation)` (defined at the top of `app.js`, so it is available before any override file loads). It is a pure pass-through: it returns `implementation` unchanged, so it does not alter behavior. What it adds is `window.REP_OVERRIDES`, an ordered log of every `{name, hadPrevious, source}` reassignment, and `window.REP_OVERRIDE_CHAIN(name)` to inspect which files touched a given global and in what order - inspectable from a live console instead of requiring a reader to trace `bootstrap.js`'s load order across four files by hand. `hadPrevious: false` combined with a `console.warn` at load time flags a reassignment with no prior function to override, the signature of a load-order mistake (e.g. a new file inserted before its dependency). All 42 override sites across `enhancements.js`, `habits.js`, `health-ui.js`, and `performance-ui.js` were converted mechanically with an AST-based codemod (matching `Identifier = FunctionExpression` assignment statements via the `typescript` package's parser), not by hand-editing, to avoid transcription errors across files with very dense, long lines.

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
5. This is a deliberately single-tenant architecture, not a scaling constraint that snuck in
   unnoticed: Notion data-source ids are module-level constants with single-workspace env-var
   overrides, `DEVICE_REGISTRY` is one global Durable Object addressed by a fixed name, and
   `REP_SYNC_KEY`/`VITALS_IMPORT_KEY` are single shared secrets. `DeviceCoordinator`'s one-DO-
   per-device design already generalizes to multi-user without changes; the pieces above would
   need an owner/account dimension added before this could safely serve more than one person.

## Performance analytics boundary

`performance-insights.js` is a pure, deterministic browser engine. It reads the same local workout, meal, hydration, body-weight, sleep, recovery, and daily Health aggregates already owned by the app. It does not call the Worker, an AI model, or any third-party analytics service. `performance-ui.js` is the presentation and interaction adapter; it owns goal editing, inbox controls, and grounded question routing without duplicating calculations.

The engine deliberately separates outcome, driver, and guardrail metrics:

- Outcomes: per-lift estimated 1RM, robust body-weight velocity, and readiness trend.
- Drivers: volume load, hard sets by muscle, calorie/protein/hydration adherence, sleep, and training time.
- Guardrails: pain remains owned by the Health Coach, logging coverage is separate from adherence, forecasts are ranges, experiments require both comparison groups, and all behavior results are labeled associations.

Every surfaced answer includes a sample size or record count, a date range, and low/medium/high confidence. Duplicate record identifiers are excluded from calculation while remaining visible in the data-quality report. Insight Inbox identifiers are stable so snooze and dismissal state survives reloads and encrypted backup round trips.

## Backups

Notion is the only durable copy of synced history; nothing else in this architecture keeps an independent one. A daily cron (`17 3 * * *`, separate from the five-minute health-check cron) exports every configured data source's page ids/properties to R2 (`BACKUP_BUCKET`) with 30-day retention, reported via `infrastructure.notionBackup` on `/api/system-health`. It is export-only by design — restoring from a real loss is a manual, human-reviewed process (see Operations), not an automated write-back, since a Worker silently overwriting a live workspace on a bad assumption would be worse than the outage it's recovering from.

## Compatibility and migration

Device credentials in legacy KV are copied into the relevant Durable Object on a successful authenticated request and then removed from KV. Users with a reminder created before version 68 should open reminder settings and save once to create the per-device alarm; legacy subscription records are not globally scanned because their old schema has no trustworthy device owner.
