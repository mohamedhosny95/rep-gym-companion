# Health OS

Version 71 completes the post-launch product suite:

- Missed training automatically moves to the next available recovery day in the current week while Friday remains protected rest; the saved workout player now restores the exact exercise, completed sets, entered loads, and running or paused rest timer.
- Equipment-aware substitutions use the equipment selected during setup and persist without mutating the original program.
- Smart reminders separately schedule training, bedtime wind-down, unfinished-workout, and weekly-review prompts with per-device Durable Object alarms. Every reminder is off until the user opts in.
- Personal Outcome Lab supports caffeine, late meals, supplements, stretching, or any custom behavior over a rolling 90-day window. Results require five yes and five no next-day readiness observations and always state association, not causation.
- The weekly coaching report includes completed workouts, PRs, adherence, recovery, reschedules, and one next action. It can be saved as a local PDF or shared through a seven-day AES-GCM capability link whose key remains in the URL fragment.
- Optional progress photos are resized and AES-GCM encrypted in the device vault, support side-by-side comparison with weight/waist context, never upload, and can be included in the passphrase-encrypted backup.
- The iOS 17 companion includes ActivityKit Lock Screen and Dynamic Island workout status plus App Intent controls for rest, set completion, and workout end. The PWA keeps its Media Session lock-screen fallback.
- A local-only first-week pulse counts setup, Today Plan use, workout completion, progression acceptance, abandonment, and errors without collecting personal values.

Version 70 turns readiness and workout history into actions:

- Guided first-run setup captures the goal, experience, weekly availability, session length, equipment, units, and sleep timing, while keeping pairing and Apple Health optional.
- Adaptive Today Plan converts readiness into a normal, reduced, recovery, or rest plan and applies the matching exercise selection, set count, and load policy with one tap.
- Workout completion creates exact per-lift next-session weights and rep ranges. Accepted targets are prefilled automatically, including conservative 15% deload recommendations when repeated high fatigue and a plateau coincide.
- Existing users migrate without an interruption; they can reopen guided setup from Settings → General.

Version 69 adds a local-first Performance Intelligence layer:

- Strength Intelligence calculates per-lift estimated 1RM trends, seven-day volume load, hard sets by muscle, recent PRs, and conservative plateau/progression signals from completed weighted sets.
- Nutrition analytics keep adherence separate from logging coverage, use a robust multi-week body-weight slope, and expose estimated maintenance calories only as a confidence-bounded range when enough intake and weigh-in data exists.
- Strength, fat-loss, muscle-gain, and recovery goals produce forecast ranges instead of promised dates, plus one evidence-backed next action.
- The Insight Inbox surfaces only material changes and supports seven-day snooze, dismissal, and restoration.
- The Personal Outcome Lab compares sleep, protein adherence, and training time with normalized workout performance, requiring at least four sessions in both groups and labeling every result as an association.
- Whole-app data quality reports coverage, freshness, duplicate keys, and Health source provenance across training, nutrition, body weight, and health data.
- Ask Your Data runs entirely on-device through deterministic question routing and shows the records, dates, sample size, confidence, and analytical boundary behind every answer.

Version 68 added a verified, durable synchronization and device-coordination architecture:

- Every local change enters an IndexedDB outbox and survives offline use, refreshes, and transient Notion failures.
- A record leaves the outbox only after the Worker writes it, reads the Notion page back, and returns a matching verified receipt.
- Device authorization, sync receipts, and reminders live in per-device SQLite Durable Objects; reminder delivery uses per-device alarms instead of a global KV scan.
- Strict TypeScript domain contracts, Workers-runtime tests, type-aware linting, isolated staging, structured SLO signals, anonymous web-vital telemetry, and operational/security runbooks are included.
- The pairing key is entered once per device. It is exchanged for a revocable HttpOnly device session and is never stored in browser data.

The Today screen also includes a bilingual daily habit tracker for sleep,
night prayer, Fajr prayer, Sadqa, Quran wird (reading Quran pages), Quran
memorization, training, morning/evening adhkar, reading, hydration, and a daily
dua for Baba. Surat Al-Kahf only appears as a habit card on Fridays. Check-ins
are available offline, included in encrypted backups, show seven-day progress
and per-habit streaks, and merge into the verified Notion Daily Care record
during synchronization.

Version 66 added a coverage-aware Apple Watch health system:

- A data-confidence score that never disguises missing measurements as poor readiness.
- Daily energy, soreness, stress, pain, and illness check-ins.
- Personalized 7-, 28-, and 90-day sleep, HRV, resting-heart-rate, respiratory-rate, VO₂ max, weight, waist, and blood-pressure trends.
- A repeatable Apple Watch charging window and workout-recording preflight.
- A privacy-preserving JSON health report export.
- An iOS HealthKit companion foundation in `ios/RepHealthCompanion` using authorization, observer queries, background delivery, local aggregation, and Keychain-protected configuration.

The native companion and existing Shortcut/Health Auto Export routes share the same bounded `/api/vitals/import` pipeline. Raw heart-rate samples remain in Apple Health; Rep receives only daily aggregates and coverage counts.

A mobile-first, offline-ready Health OS built with plain HTML, CSS, JavaScript, and strict TypeScript server domains. Local data saves immediately while offline. Delivery state remains visible as pending, transmitting, retry scheduled, needs attention, or confirmed.

Food entries are never labelled as synced from a generic network success. The
Worker returns a receipt only after re-reading the saved Notion page, and each
meal displays its own pending, failed, or confirmed status plus a direct link to
the confirmed page. Version 57 also keeps the Vitals / Wellness / Insights
selector in normal document flow so it cannot cover Health content while
scrolling. Raw imported details remain on the device while an idempotent daily
summary can update the existing Notion Recovery record.

## Version 68 reliability architecture

- The visible Notion destination is permanently named **View of Food Entries**
  and links to database `6433f54c…` / view `bde632d4…`. The Worker validates
  the original `Food Entries` data source, Trash state, integration access, and
  every required property type before a food write can enter the normal flow.
- The five-minute Worker schedule records Notion health. Two consecutive
  destination failures become an actionable incident and can trigger one
  deduplicated push alert every six hours.
- Settings → Sync is the single activity center for Training, Nutrition, and
  Health writes. One action enqueues every supported local record and
  shows verified links, pending/retry state, infrastructure readiness, and the last
  successful sync.
- `scripts/live-notion-check.mjs` validates a private test data source directly.
  `scripts/staging-contract.mjs` goes through the isolated staging Worker, requires
  a verified receipt, reads the created page, and archives it in `finally`.
- Push configuration, local encrypted-backup round trips, and the HealthKit
  import endpoint now have runnable checks. The iPhone bridge also provides a
  **Test connection** button before HealthKit authorization.

The retained reliability foundations are:

- Every Notion delivery is completed inside its request and is considered successful
  only after the Worker re-reads the saved page. Content-aware idempotency receipts
  prevent duplicate retries without turning work into a job queue.
- Source records and the durable delivery outbox remain in IndexedDB. Exponential
  retry is capped at 12 attempts and never hides permanently failed work.
- Today contains the next actions; Training separates Today, Program, and
  History; Nutrition separates Log, Today, and Plan; Health keeps Vitals,
  Wellness, and Insights. Settings owns language, units, schedule, targets,
  coaching, connections, devices, and backups.
- Settings → Connections & security includes Notion health, queue counts, recovery
  controls, encrypted backup diagnostics, and per-device revocation.
- QR support loads only when creating a pairing handoff, navigation uses a
  network-first service-worker strategy, and the social preview is about 216 KB
  instead of roughly 2 MB.

Architecture, staging, SLO, threat-model/data-lifecycle, incident/recovery, and
real-device certification details are in `docs/`.

## Health intelligence and Apple Health

- Personal baselines use robust medians over a configurable 21, 28, or 42-day
  window. Wearable signals need seven prior nights to enter Readiness and 14
  nights to support high confidence.
- Training guidance chooses normal, reduced, recovery, or pause mode. A pain
  report always overrides the score.
- Behavior experiments compare the following day's reliable Readiness and wait
  for at least four days in each group. The UI calls these associations, never
  causes.
- The Worker accepts sleep, HRV, resting heart rate, respiratory rate, active
  energy, steps, exercise/stand minutes, VO₂ max, oxygen saturation, wrist
  temperature, and deep/REM sleep from the existing import endpoints.
- `ios/RepHealthCompanion/` contains the SwiftUI HealthKit companion starter. It
  requires Xcode signing because browsers cannot access HealthKit directly.

## Performance Intelligence calculations

- Estimated 1RM uses the Epley formula (`weight × (1 + reps / 30)`) with repetitions capped at 15. It is a progress estimate and never an instruction to test a maximal lift.
- Plateau flags require at least three sessions across at least 14 days with no material estimated-1RM improvement. A flag recommends holding, adding a clean repetition, or considering a lighter week; pain and symptoms still override it.
- Nutrition adherence is calculated among logged days while 7- and 28-day coverage remains visible separately. Missing days are never silently treated as failed adherence.
- Body-weight velocity uses a Theil–Sen median slope to reduce the effect of individual noisy weigh-ins.
- Estimated maintenance calories require at least four weigh-ins, 14 food-log days, and 50% 28-day coverage. The displayed uncertainty widens as coverage falls.
- Goal dates are ranges whose width depends on sample size and coverage. A target without a stable trend is labeled calibrating or off-track rather than assigned a fabricated date.
- Personal experiments require four comparable sessions in both groups. They are exploratory personal associations, not causal or medical claims.
- Ask Your Data does not call an external AI service. It selects a deterministic analysis, cites local record counts and date ranges, and declines conclusions when evidence is insufficient.

## Open locally

Open `dist/client/index.html` in a browser. For reliable service-worker and offline testing, serve `dist/client/` with any local static web server.

## Project folders

- `src/client/` — the only editable browser application source
- `src/server/` — the editable Cloudflare Worker source
- `dist/client/` — generated deployment files served by Cloudflare
- `dist/server/` — generated Worker deployment artifact
- `ios/RepHealthCompanion/` — the optional native HealthKit companion starter

`src/` is the only application source of truth. `dist/` is generated
and must not be hand-edited. Downloadable client builds are produced as CI artifacts
instead of being committed as a second application copy and ZIP. **After editing anything under
`src/`, run:**

```sh
node scripts/sync-static.mjs
```

This rebuilds `dist/client/` and `dist/server/`. A GitHub Actions workflow
(`.github/workflows/verify.yml`) checks on every push that source and deployment
files match, uploads the deployable client from `main` as a short-lived artifact,
syntax-checks all JS, and runs a headless end-to-end
smoke test — it does not deploy anything; Cloudflare's own GitHub
integration still owns deployment (see below).

## Testing

`scripts/e2e-smoke.mjs` is a headless Playwright certification test that serves
`dist/client/` locally and drives a real browser through the core flows:
loading Home, previewing and starting a training session, completing it,
logging an activity, saving a sleep log, logging food, and toggling
language, offline recovery, WCAG A/AA axe checks, reduced motion, six mobile
widths, and web-performance budgets—failing on any assertion or console/page error. Run it
locally with:

```sh
npm install
npx playwright install chromium
npm run test:e2e
```

Fast syntax, strict types, type-aware linting, Node Worker contracts, real
Workers-runtime Durable Object tests, state migrations, and source-sync checks are also
available without launching a browser:

```sh
npm run verify
```

The production release gate, including Worker bundling and a production Wrangler dry run, is:

```sh
npm run verify:production
```

GitHub Actions configuration is intentionally unchanged while the account's
monthly Actions quota is exhausted. Use the production gate in
`docs/OPERATIONS.md` until the quota is available again.

To run the optional real Notion contract check against a dedicated test copy of
the Food Entries schema:

```sh
NOTION_TEST_TOKEN=... NOTION_TEST_DATA_SOURCE_ID=... npm run test:notion-live
```

The script creates one clearly labelled test row, verifies its receipt and
parent data source, then archives it in `finally`, including when validation
fails after creation. Never point this test at a production log database.

`npm run sync` derives a deterministic 12-character build version from the
contents of `src/client/`, injects it into the deployable HTML, bootstrap, and
service worker, and rebuilds `dist/client/`. Cache names and asset query strings
must not be edited manually.

## Notion sync configuration

The deployed server expects these environment variables (see `.env.example`):

- `NOTION_TOKEN` — secret Notion integration token
- `NOTION_DATA_SOURCE_ID` — workout database data-source ID
- `REP_SYNC_KEY` — random 32-byte-or-longer master pairing key entered once
- `VITALS_IMPORT_KEY` — separate random key for Health Auto Export/Shortcuts
- `CANONICAL_ORIGIN` — the one production origin all browser tabs must use
- `GEMINI_API_KEY` — Google Gemini API key, required for AI food analysis and the Vitals tab's Apple Health screenshot import (same key powers both)

Recovery, nutrition, hygiene, habit, and food databases use their checked-in public
data-source IDs by default. They can be overridden with
`NOTION_RECOVERY_DATA_SOURCE_ID`, `NOTION_NUTRITION_DATA_SOURCE_ID`,
`NOTION_HYGIENE_DATA_SOURCE_ID`, `NOTION_HABIT_DATA_SOURCE_ID`, and `NOTION_FOOD_DATA_SOURCE_ID`.
`NOTION_FOOD_VIEW_URL` optionally overrides the visible link only; its default
is the canonical `View of Food Entries` URL supplied by the owner.

Set these as secrets/variables in the Cloudflare dashboard (Settings →
Variables and secrets) or via `wrangler secret put <NAME>` — never in a
committed file. `.env.example` documents the names only, for reference.

The app exchanges the master key for a signed, server-registered device session,
stores it only in a Secure/HttpOnly/SameSite cookie, and keeps only a non-secret
"paired" marker in browser storage. The cookie is shared by every normal tab on
the canonical origin and renews whenever the application reconnects. Devices
remain paired while active until the user disconnects, clears site data, or
revokes them from Settings → Security. Legacy 90-day credentials migrate on the
next successful connection without requiring the master key again.
Settings → Security can create a single-use QR pairing link for another phone;
the link expires after five minutes and is consumed atomically by a Durable
Object. Food AI, Notion, Vitals AI, automated
imports, and push availability are reported separately so one missing service
does not make the whole connection look broken.

## Flexible tracking and private backups

- Settings → Units switches kilograms/pounds and millilitres/fluid ounces
  without changing the canonical values stored in history.
- Settings → Schedule and Targets customizes each day's focus, activation, and
  nutrition/hydration goals.
- Nutrition supports custom water add/set/reset, weekly weight, favourite and
  recent meals, portion scaling, and undo for destructive daily actions.
- Automatic restore points are encrypted with a device-only key. Downloadable
  schema-5 backups use AES-256-GCM with a passphrase-derived key and authenticate
  their format/algorithm header to prevent unnoticed downgrade or header tampering. Local deletion requires
  two confirmations and never removes Notion pages.

## Push notifications (daily reminder)

The "Daily reminder" card on the History screen sends one push notification a
day at a time you choose, even when the app/tab is fully closed. Unlike every
other feature in this app, this **requires infrastructure that can't be set
up from this repo alone** — a few one-time manual steps in the Cloudflare
dashboard:

1. **Confirm the KV binding.** `PUSH_KV` is already bound in `wrangler.jsonc`
   and is shared by reminders, Apple imports, idempotency markers, and
   single-use pairing handoffs.

2. **Generate a VAPID keypair** (proves this server's identity to push
   services like Chrome's/Firefox's; not sensitive to anyone but you, but
   still a secret — never commit it):
   The simplest path is `npm run generate:vapid`; the equivalent low-level
   Node example is kept below for reference.
   ```js
   // node -e "..." or save as a script and run once
   const crypto = require("crypto");
   const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
   const b64url = buf => buf.toString("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
   const fromB64url = s => Buffer.from(s.replace(/-/g,"+").replace(/_/g,"/"), "base64");
   const pubJwk = publicKey.export({ format: "jwk" });
   const rawPublic = Buffer.concat([Buffer.from([0x04]), fromB64url(pubJwk.x), fromB64url(pubJwk.y)]);
   console.log("VAPID_PUBLIC_KEY:", b64url(rawPublic));
   console.log("VAPID_PRIVATE_KEY_JWK:", JSON.stringify(privateKey.export({ format: "jwk" })));
   ```

3. **Set three secrets** in the Cloudflare dashboard (Settings → Variables and
   secrets) or via `wrangler secret put <NAME>`:
   - `VAPID_PUBLIC_KEY` — the value printed above
   - `VAPID_PRIVATE_KEY_JWK` — the JSON string printed above
   - `VAPID_SUBJECT` — `mailto:you@example.com` (a contact address push
     services may use if something's wrong with your server)

4. **Redeploy.** The five-minute cron in `wrangler.jsonc` monitors upstream
   health only. Daily reminders are scheduled independently by the paired
   device's Durable Object alarm and no-op until both VAPID secrets exist.

Once set up, tapping "Enable" in the app requests notification permission,
subscribes via the browser's Push API, and sends the subscription + your
chosen time to `/api/push/subscribe`. The per-device alarm records the last local
day sent, so it honors the selected minute and cannot send the same daily reminder twice.

The RFC 8291 payload encryption and RFC 8292 VAPID signing are isolated in a
strict TypeScript integration. Final delivery still depends on a real browser
push provider, so complete the hardware push row in `docs/DEVICE_CERTIFICATION.md`.

## Automated Health data import (no screenshots, no app-opening)

The Vitals tab's screenshot importer is manual — you take a screenshot, pick
it, review the numbers. This section sets up a fully automatic path instead:
your sleep, HRV, resting heart rate, respiratory rate, active energy, steps,
exercise/stand minutes, VO₂ max, oxygen saturation, wrist temperature, and sleep stages get
read from the Health app every day and sent to the server, which the app
then picks up the next time you open it. No screenshot, no manual save, no
app-opening required for the export step itself.

Because a Cloudflare Worker has no memory between requests, the export
writes into KV storage and the app reads from it — it does **not** push
data into the app directly.

Two ways to do the export side — pick one:

- **Option A — [Health Auto Export](https://apps.apple.com/us/app/health-auto-export-json-csv/id1115567069)**
  (App Store, one-time purchase, roughly $15-20): a mature app built
  specifically for this. Pick your metrics, point its REST API automation
  at our server, done — no Shortcut-building, and its own background
  scheduling is more reliable than a hand-built Personal Automation.
  **Recommended.**
- **Option B — a free DIY Apple Shortcuts automation**: no cost, but you
  build and maintain the Shortcut yourself.

Both write to the same server-side queue, so the rest of the app (the
Vitals tab, "Check now", the background pull on open) works identically
either way. Repeated imports retain arrival timestamps for schedule health
while keeping one authoritative value per metric and calendar day.

### 1. Server setup (reuses the push-notification KV, if you already have it)

`PUSH_KV` is already bound in `wrangler.jsonc`; no additional storage setup is
required. Imported readings are retained for 180 days and validated against
plausible ranges before the client uses them.

### 2. Option A — Health Auto Export (recommended)

1. Install [Health Auto Export - JSON+CSV](https://apps.apple.com/us/app/health-auto-export-json-csv/id1115567069)
   from the App Store.
2. In the app, create a new **Automation** → **REST API** export.
3. Select these metrics (leave anything else off — extra metrics are
   ignored, not rejected): **Heart Rate Variability**, **Resting Heart
   Rate**, **Respiratory Rate**, **Active Energy**, and enable **Sleep**
   data.
4. Set the destination:
   - URL: `https://<your-worker-domain>/api/vitals/import-hae`
   - Method: `POST`
   - Header: `x-rep-sync-key` → your `VITALS_IMPORT_KEY` value
5. Set it to run automatically (the app has its own daily/periodic
   scheduling — no separate Shortcuts automation needed for this path).

The server expects Health Auto Export's own documented JSON export shape
(`{"data":{"metrics":[...],"sleep":[...]}}`) directly — parses per-metric
data points, averages HRV/resting-HR/respiratory-rate per calendar day,
sums Active Energy per day, and pulls bedtime/wake from the sleep records.
Nothing needs to match our schema on your end; that's the point of this
option.

**Skip to step 4 ("Notes") if you're using this option** — step 3 below is
only for the free DIY route.

### 3. Option B — free DIY Shortcut (Shortcuts app, on your iPhone)

Create a new Shortcut and add these actions in order. Exact action names can
shift slightly between iOS versions — search the action library for the
bolded name if it's not an exact match.

1. **Health Sample** — Sample Type: `Sleep Analysis`, Within: `Last 24 Hours`.
2. **Sort** the result by `Start Date`, ascending.
3. Take the **first** item's `Start Date` → **Format Date** as `HH:mm` →
   name this variable `bedtime`.
4. Take the **last** item's `End Date` → **Format Date** as `HH:mm` → name it
   `wake_time`. (The app derives sleep duration from these two, the same way
   manual entry does — you don't need to compute hours separately.)
5. **Health Sample** — Sample Type: `Heart Rate Variability`, Within:
   `Last 24 Hours` → **Calculate Statistics**: Average → name it `hrv_ms`.
6. **Health Sample** — Sample Type: `Resting Heart Rate`, Within: `Today` →
   **Calculate Statistics**: Average → name it `resting_hr_bpm`.
7. **Health Sample** — Sample Type: `Respiratory Rate`, Within:
   `Last 24 Hours` → **Calculate Statistics**: Average → name it
   `respiratory_rate_bpm`.
8. **Health Sample** — Sample Type: `Active Energy`, Within: `Today` →
   **Calculate Statistics**: **Sum** (not average — Active Energy is many
   small increments through the day) → name it `active_energy_kcal`.
9. **Current Date** → **Format Date** as `yyyy-MM-dd` → name it `date`.
10. **Dictionary** — build one with keys `date`, `bedtime`, `wake_time`,
    `hrv_ms`, `resting_hr_bpm`, `respiratory_rate_bpm`, `active_energy_kcal`,
    each set to its matching variable from above. Leave a key out entirely
    if you don't want to send it — every field is optional.
11. **Get Contents of URL**:
    - URL: `https://<your-worker-domain>/api/vitals/import`
    - Method: `POST`
    - Headers: `x-rep-sync-key` → your `VITALS_IMPORT_KEY` value,
      `Content-Type` → `application/json`
    - Request Body: `JSON`, set to the Dictionary from step 10

### 4. Automate it

Shortcuts app → **Automation** tab → **+** → **Create Personal Automation**
→ **Time of Day** → create four daily automations at **06:00, 12:00, 18:00,
and 23:45** → next → **Add Action** → choose the same Shortcut for every
automation → **turn off "Ask Before Running"**. The morning run captures
recovery data, while later runs refresh cumulative Active Energy. Every run
updates the same calendar-day record, so the schedule does not create duplicates.

### Notes

- Both options write data directly with no review step, unlike the
  screenshot importer — it's real sensor data, not an AI guess off an
  image, so no review is needed. The screenshot importer stays available
  too; use whichever combination you prefer, including neither.
- **Server side verified, on-device side not.** `/api/vitals/import`,
  `/api/vitals/import-hae`, and `/api/vitals/pending` were all verified
  against a real Cloudflare Workers runtime — for the Health Auto Export
  adapter specifically, with a hand-crafted payload matching that app's
  own [publicly documented JSON export format](https://github.com/Lybron/health-auto-export/wiki/API-Export---JSON-Format)
  (multi-day, multi-metric, including an unrecognized metric to confirm
  it's safely ignored rather than rejected) — the math (HRV/RHR/respiratory
  rate averaged per day, Active Energy summed per day, sleep bucketed by
  wake date) checked out exactly. What's **not** verified is either app
  actually running on a real iPhone and sending its real payload, since I
  don't have a device to test on — the DIY Shortcut in particular was
  written from Apple's documented action set, not click-tested. If Health
  Auto Export's real export ever drifts from its documented format, or a
  Shortcut step doesn't match what you see, use the **"Check now"** button
  on the Vitals tab to test the pull
  side independently, and check the Shortcut's run log (tap the Shortcut →
  the "i" info button → recent runs) for the actual error.

## Server hardening

`src/server/index.js` applies a few defenses beyond basic pairing-key auth:

- **Rate limiting** — Cloudflare Rate Limit bindings protect AI analysis and
  pairing at the edge using network identity, so rotating guessed secrets does
  not bypass a limit. The per-colo Cache API limiter remains a fallback.
- **Timing-safe key comparison** — `REP_SYNC_KEY` is compared via a hashed,
  constant-time check rather than `===`.
- **Revocable client sessions** — phones receive signed, HttpOnly device
  sessions backed by a KV device registry. A lost device can be revoked without
  disconnecting every other device. External Health automations use a separate,
  restricted secret.
- **Atomic QR claims** — five-minute pairing handoffs are consumed by a Durable
  Object transaction so simultaneous claims cannot both succeed.
- **Authenticated push management** — subscriptions cannot be added or removed
  without a valid device session, and provider endpoints are hashed before they
  become KV keys.
- **Bounded provider calls** — Notion, Gemini, Open Food Facts, and Web Push
  requests have explicit timeouts so a provider outage cannot hang a Worker request.
- **Browser mutation origin checks** — cross-origin browser writes are rejected;
  native automations remain supported through their restricted secret.
- **Idempotent offline sync** — repeated queued writes carry stable keys, and
  the Worker stores completion markers so retries cannot create duplicates.
- **Security headers** — every response (API and static assets) gets a
  restrictive `Content-Security-Policy`, `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy`. The same
  CSP is duplicated as a `<meta>` tag in `index.html` for when the app is
  opened directly (`outputs/`) without the Worker in front of it.

## Deployment

**Production:** [rep-gym-companion.mohamedahmedhosny95.workers.dev](https://rep-gym-companion.mohamedahmedhosny95.workers.dev)

GitHub `main` is the source of truth, and the `rep-gym-companion` Cloudflare Worker is the sole production runtime. The application has no runtime dependency on ChatGPT Sites or OpenAI Apps hosting.

The normal production path is the gated `deploy-production` GitHub Actions
job after `verify` and `e2e` pass on `main`. While the monthly Actions quota is
exhausted, follow the manual local + isolated-staging gate in
`docs/OPERATIONS.md`; do not edit the workflow to work around the quota.
Keep the protected GitHub `production` environment configured and Cloudflare's direct branch deployment disabled.
See [`docs/RELEASE_SAFETY.md`](docs/RELEASE_SAFETY.md).

Before the first v60 deployment, set `CANONICAL_ORIGIN`, create
`VITALS_IMPORT_KEY`, and deploy once with the Durable Object migration in
`wrangler.jsonc`. In GitHub, protect `main` and require both `verify` and `e2e`.

The earlier direct Cloudflare Git integration must remain disabled: it was
observed deploying a feature-branch commit to the production environment.
When Actions capacity is available, pull requests produce a per-commit deployable
artifact and production waits for the gated `main` workflow.

Never commit secret values. Environment files are ignored by Git.
