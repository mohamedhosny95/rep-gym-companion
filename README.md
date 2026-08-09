# Rep Gym Companion

A mobile-first, offline-ready Health OS companion built with plain HTML, CSS, and JavaScript. It includes guided exercise movement animations, workout logging, recovery and progression gates, Bad Day fallbacks, nutrition and hygiene checklists, bilingual English/Arabic navigation, and secure Notion synchronization.

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
match, along with a syntax check on all JS — it does not deploy anything;
Cloudflare's own GitHub integration still owns deployment (see below).

If you change any file referenced by the service worker's asset list
(`dist/client/sw.js`), bump the `CACHE` name and the `?v=` query strings in
that file and in `dist/client/index.html` together, so installed clients
pick up the new version instead of serving a stale cached copy.

## Notion sync configuration

The deployed server expects these environment variables (see `.env.example`):

- `NOTION_TOKEN` — secret Notion integration token
- `NOTION_DATA_SOURCE_ID` — workout database data-source ID
- `REP_SYNC_KEY` — private pairing key entered in the app
- `GEMINI_API_KEY` — Google Gemini API key, required for AI food analysis

Recovery, nutrition, hygiene, and food databases use their checked-in public
data-source IDs by default. They can be overridden with
`NOTION_RECOVERY_DATA_SOURCE_ID`, `NOTION_NUTRITION_DATA_SOURCE_ID`,
`NOTION_HYGIENE_DATA_SOURCE_ID`, and `NOTION_FOOD_DATA_SOURCE_ID`.

Set these as secrets/variables in the Cloudflare dashboard (Settings →
Variables and secrets) or via `wrangler secret put <NAME>` — never in a
committed file. `.env.example` documents the names only, for reference.

## Server hardening

`dist/server/index.js` applies a few defenses beyond basic pairing-key auth:

- **Rate limiting** — a best-effort, per-colo limiter (Cloudflare's edge
  Cache API) throttles `/api/pair-check`, `/api/food/analyze`, and
  `/api/notion-sync` per client IP. This raises the cost of brute-forcing
  `REP_SYNC_KEY` or running up your Gemini bill, but it is not a hard
  guarantee across Cloudflare's network. For a guaranteed limit, also add a
  Cloudflare Rate Limiting Rule on `/api/*` in the dashboard.
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
