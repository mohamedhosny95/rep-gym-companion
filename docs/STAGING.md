# Isolated staging

The `staging` Wrangler environment is deliberately separate from production. Environment configuration does not inherit bindings or secrets, so configure every staging secret explicitly and use a dedicated test Notion integration and copied schema.

`PUSH_KV` is declared without an ID in the staging environment. Wrangler 4
auto-provisions a namespace scoped to `rep-gym-companion-staging`; production
keeps its explicit, separate namespace ID. Do not paste the production ID into
the staging binding.

Load the dedicated staging values listed in `.env.example` into the current
shell, set `CANONICAL_ORIGIN` to the staging HTTPS origin, then run:

```sh
npm run deploy:staging:dry-run
npm run staging:bootstrap
```

`staging:bootstrap` validates that every required value exists, rejects weak or
shared import/pairing credentials, provisions the Worker and KV namespace,
uploads all secrets through Wrangler's stdin (without logging them), lists only
the secret names, and runs the verified Notion write/read/archive contract.

Also set the remaining integration secrets (`NOTION_DATA_SOURCE_ID`, `NOTION_RECOVERY_DATA_SOURCE_ID`, `NOTION_NUTRITION_DATA_SOURCE_ID`, `NOTION_HYGIENE_DATA_SOURCE_ID`, `NOTION_HABIT_DATA_SOURCE_ID`) before exercising that staging capability. The Worker refuses the request with a clear error if `ENVIRONMENT=staging` and a domain's data-source secret is missing — it never falls back to the production database id, so an omitted secret fails loudly instead of writing staging test data into production Notion. Never reuse production `REP_SYNC_KEY`, VAPID private key, Notion token, data-source IDs, or canonical origin.

To repeat only the real contract after deployment:

```sh
REP_STAGING_URL=https://rep-gym-companion-staging.<account>.workers.dev \
REP_STAGING_SYNC_KEY=... NOTION_TEST_TOKEN=... npm run test:staging
```

The script refuses a Worker that does not report `environment: staging`. It creates one labelled food row through the Worker, requires its verified receipt, reads the page directly from Notion, and archives it in `finally`.

Promotion is manual while the GitHub Actions quota is unavailable: verify locally, run the staging contract, inspect Cloudflare logs, and only then use `npx wrangler deploy`. Record the deployed version and prior version before promotion so `npm run rollback:production` has an unambiguous target.
