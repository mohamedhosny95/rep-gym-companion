# Health OS

A mobile-first, offline-ready Health OS built with plain HTML, CSS, and JavaScript. It includes guided exercise movement animations, workout logging, recovery and progression gates, Bad Day fallbacks, nutrition/supplement/weight tracking, hygiene checklists, cross-module reminders and insights, bilingual English/Arabic navigation, and secure Notion synchronization.

## Open locally

Open `outputs/index.html` in a browser. For reliable service-worker and offline testing, serve `outputs/` with any local static web server.

## Project folders

- `outputs/` — ready-to-open static app and downloadable ZIP
- `dist/client/` — deployment-ready client files (this is what Cloudflare deploys)
- `dist/server/` — server-side Notion/Gemini sync endpoint

There is no separate source tree: `dist/client/` is edited directly and is
the source of truth. `outputs/` is a convenience copy for opening the app
without deploying it, and must stay byte-identical to `dist/client/` (minus
the bundled zip). **After editing anything under `dist/client/`, run:**

```sh
node scripts/sync-static.mjs
```

This copies your changes into `outputs/` and rebuilds
`outputs/rep-gym-companion.zip`. A GitHub Actions workflow
(`.github/workflows/verify.yml`) checks on every push that the two folders
match, along with a syntax check on all JS, and runs a headless end-to-end
smoke test — it does not deploy anything; Cloudflare's own GitHub
integration still owns deployment (see below).

## Testing

`scripts/e2e-smoke.mjs` is a headless Playwright test that serves
`dist/client/` locally and drives a real browser through the core flows:
loading Home, previewing and starting a training session, completing it,
logging an activity, saving a sleep log, logging food, and toggling
language — failing on any assertion or any console/page error. Run it
locally with:

```sh
npm install
npx playwright install chromium
npm run test:e2e
```

It runs automatically in CI (the `e2e` job in `verify.yml`) on every push.

If you change any file referenced by the service worker's asset list
(`dist/client/sw.js`), bump the `CACHE` name and the `?v=` query strings in
that file and in `dist/client/index.html` together, so installed clients
pick up the new version instead of serving a stale cached copy.

## Notion sync configuration

The deployed server expects these environment variables (see `.env.example`):

- `NOTION_TOKEN` — secret Notion integration token
- `NOTION_DATA_SOURCE_ID` — workout database data-source ID
- `REP_SYNC_KEY` — private pairing key entered in the app
- `GEMINI_API_KEY` — Google Gemini API key, required for AI food analysis and the Vitals tab's Apple Health screenshot import (same key powers both)

Recovery, nutrition, hygiene, and food databases use their checked-in public
data-source IDs by default. They can be overridden with
`NOTION_RECOVERY_DATA_SOURCE_ID`, `NOTION_NUTRITION_DATA_SOURCE_ID`,
`NOTION_HYGIENE_DATA_SOURCE_ID`, and `NOTION_FOOD_DATA_SOURCE_ID`.

Set these as secrets/variables in the Cloudflare dashboard (Settings →
Variables and secrets) or via `wrangler secret put <NAME>` — never in a
committed file. `.env.example` documents the names only, for reference.

## Push notifications (daily reminder)

The "Daily reminder" card on the History screen sends one push notification a
day at a time you choose, even when the app/tab is fully closed. Unlike every
other feature in this app, this **requires infrastructure that can't be set
up from this repo alone** — a few one-time manual steps in the Cloudflare
dashboard:

1. **Create a KV namespace** for subscription storage:
   ```sh
   npx wrangler kv namespace create PUSH_KV
   ```
   This prints an `id`. Add it to `wrangler.jsonc`:
   ```json
   "kv_namespaces": [{ "binding": "PUSH_KV", "id": "<the id from the command above>" }]
   ```
   (Deliberately not committed with a placeholder id — a fake id here would
   break every future deploy, not just push notifications.)

2. **Generate a VAPID keypair** (proves this server's identity to push
   services like Chrome's/Firefox's; not sensitive to anyone but you, but
   still a secret — never commit it):
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

4. **Redeploy.** The hourly cron trigger in `wrangler.jsonc` is already
   committed and safe to deploy before this setup is done — the send
   function no-ops until `PUSH_KV` and both VAPID secrets exist.

Once set up, tapping "Enable" in the app requests notification permission,
subscribes via the browser's Push API, and sends the subscription + your
chosen time to `/api/push/subscribe`. The reminder time is converted to UTC
at subscribe time using your browser's timezone offset, so it can drift by an
hour across a DST transition until you re-save it — a known, accepted
simplification for now.

**This is the one feature in this app whose crypto (RFC 8291 payload
encryption + RFC 8292 VAPID signing, hand-rolled against the Workers
runtime's Web Crypto API since there's no build step here) could not be
verified end-to-end** — it was checked by round-tripping the same
encrypt/decrypt derivation locally, but never against a real deployed push
service. Test it on your own phone after setup and report back if a
notification doesn't arrive.

## Automated Health data import (no screenshots, no app-opening)

The Vitals tab's screenshot importer is manual — you take a screenshot, pick
it, review the numbers. This section sets up a fully automatic path instead:
your sleep, HRV, resting heart rate, respiratory rate, and active energy get
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
either way.

### 1. Server setup (reuses the push-notification KV, if you already have it)

If you already completed the **Push notifications** setup above, you already
have a `PUSH_KV` namespace bound in `wrangler.jsonc` — nothing more to do
here, skip to step 2.

Otherwise:
```sh
npx wrangler kv namespace create PUSH_KV
```
and add the printed id to `wrangler.jsonc`:
```json
"kv_namespaces": [{ "binding": "PUSH_KV", "id": "<the id from the command above>" }]
```
Then redeploy. `/api/vitals/import`, `/api/vitals/import-hae`, and
`/api/vitals/pending` return a clear "not configured" error until this
binding exists — safe to have shipped before you set this up.

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
   - Header: `x-rep-sync-key` → your `REP_SYNC_KEY` value (the same one
     you paired the app with)
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
    - Headers: `x-rep-sync-key` → your `REP_SYNC_KEY` value (the same one
      you paired the app with), `Content-Type` → `application/json`
    - Request Body: `JSON`, set to the Dictionary from step 10

### 4. Automate it

Shortcuts app → **Automation** tab → **+** → **Create Personal Automation**
→ **Time of Day** → pick a morning time after you're normally awake → next →
**Add Action** → choose the Shortcut you just built → **turn off "Ask Before
Running"**. That last toggle is the one that actually makes it silent — with
it on, iOS prompts you to confirm every single morning, which defeats the
point.

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

`dist/server/index.js` applies a few defenses beyond basic pairing-key auth:

- **Rate limiting** — a best-effort, per-colo limiter (Cloudflare's edge
  Cache API) throttles `/api/pair-check`, `/api/food/analyze`, and
  `/api/notion-sync` per client IP. This raises the cost of brute-forcing
  `REP_SYNC_KEY` or running up your Gemini bill, but it is not a hard
  guarantee across Cloudflare's network — a distributed attacker can land
  requests on different colos that don't share the same edge cache yet.
  **For a guaranteed limit, add a Cloudflare Rate Limiting Rule** (this
  requires dashboard access, so it isn't something that can be set from the
  code in this repo):
  1. Cloudflare dashboard → your zone → **Security → WAF → Rate limiting rules**
  2. Create rule → match path `/api/*`
  3. Set a threshold, e.g. 60 requests / 60 seconds per IP
  4. Action: **Block** (or **Managed Challenge** if you'd rather challenge
     than hard-block)
  This is free on all plans for a small number of rules and closes the gap
  the in-code limiter can't guarantee on its own.
- **Timing-safe key comparison** — `REP_SYNC_KEY` is compared via a hashed,
  constant-time check rather than `===`.
- **Security headers** — every response (API and static assets) gets a
  restrictive `Content-Security-Policy`, `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy`. The same
  CSP is duplicated as a `<meta>` tag in `index.html` for when the app is
  opened directly (`outputs/`) without the Worker in front of it.

## Deployment

Production is deployed by Cloudflare's direct GitHub integration, which
should trigger `npx wrangler deploy` only on push to `main`. GitHub Actions
is used only for the non-deploying verification workflow described above.

**Verify this is actually scoped to `main`.** On PR #7, Cloudflare posted a
"Deployment successful" comment for the *feature branch's* commit, and the
link it gave pointed at the Worker's `production` environment — with no
separate Preview URL. `wrangler.jsonc` defines no `env` blocks, so there is
only one environment for Cloudflare to deploy into. Taken together, this
suggests the git integration may be deploying **every push, on every
branch, straight to production** — not just merges to `main` — which means
in-progress branch work can go live, and there's no isolated environment to
test changes against before they're user-facing.

To confirm and fix, in the Cloudflare dashboard: **Workers & Pages →
rep-gym-companion → Settings → Build** — check the configured production
branch and whether non-production branches are set to deploy to Preview
URLs (or not deploy at all) rather than production. This is a dashboard
setting, not something in this repo, so it can't be fixed by a commit here.

Never commit secret values. Environment files are ignored by Git.
