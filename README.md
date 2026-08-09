# Rep Gym Companion

A mobile-first, offline-ready workout companion built with plain HTML, CSS, and JavaScript. It includes guided exercise movement animations, workout logging, progress tracking, bilingual English/Arabic support, and optional secure Notion synchronization.

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

Never commit these values. Environment files are ignored by Git.
