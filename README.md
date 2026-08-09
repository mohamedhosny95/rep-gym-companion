# Rep Gym Companion

A mobile-first, offline-ready Health OS companion built with plain HTML, CSS, and JavaScript. It includes guided exercise movement animations, workout logging, recovery and progression gates, Bad Day fallbacks, nutrition and hygiene checklists, bilingual English/Arabic navigation, and secure Notion synchronization.

## Open locally

Open `outputs/index.html` in a browser. For reliable service-worker and offline testing, serve `outputs/` with any local static web server.

## Project folders

- `outputs/` — ready-to-open static app and downloadable ZIP
- `dist/client/` — deployment-ready client files
- `dist/server/` — server-side Notion sync endpoint

## Notion sync configuration

The deployed server expects these environment variables:

- `NOTION_TOKEN` — secret Notion integration token
- `NOTION_DATA_SOURCE_ID` — workout database data-source ID
- `REP_SYNC_KEY` — private pairing key entered in the app

Recovery, nutrition, and hygiene databases use their checked-in public data-source IDs by default. They can be overridden with `NOTION_RECOVERY_DATA_SOURCE_ID`, `NOTION_NUTRITION_DATA_SOURCE_ID`, and `NOTION_HYGIENE_DATA_SOURCE_ID`.

## Deployment

Production is deployed by Cloudflare's direct GitHub integration. A push to `main` triggers `npx wrangler deploy`; GitHub Actions is intentionally not used.

Never commit these values. Environment files are ignored by Git.
