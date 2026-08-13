# Isolated staging

The `staging` Wrangler environment is deliberately separate from production. Environment configuration does not inherit bindings or secrets, so configure every staging secret explicitly and use a dedicated test Notion integration and copied schema.

**One-time setup — dedicated staging KV namespace.** `PUSH_KV` must not point at the
production namespace (that would let staging reminders/imports/idempotency markers collide
with real data). `wrangler.jsonc`'s `env.staging.kv_namespaces` entry ships with the
placeholder id `REPLACE_WITH_STAGING_PUSH_KV_ID`. `deploy:staging:dry-run` still succeeds
with the placeholder in place (it only validates the local bundle/config), but a real
`npm run deploy:staging` fails once Cloudflare looks up that namespace id — replace it
before the first non-dry-run staging deploy:

```sh
npx wrangler kv namespace create PUSH_KV --env staging
# paste the returned id into wrangler.jsonc -> env.staging.kv_namespaces[0].id
```

```sh
npm run deploy:staging:dry-run
npx wrangler secret put REP_SYNC_KEY --env staging
npx wrangler secret put NOTION_TOKEN --env staging
npx wrangler secret put NOTION_FOOD_DATA_SOURCE_ID --env staging
npm run deploy:staging
```

Also set the remaining integration secrets only when that staging capability is being exercised. Never reuse production `REP_SYNC_KEY`, VAPID private key, Notion token, data-source IDs, or canonical origin.

After deployment, run the real contract against the dedicated test source:

```sh
REP_STAGING_URL=https://rep-gym-companion-staging.<account>.workers.dev \
REP_STAGING_SYNC_KEY=... NOTION_TEST_TOKEN=... npm run test:staging
```

The script refuses a Worker that does not report `environment: staging`. It creates one labelled food row through the Worker, requires its verified receipt, reads the page directly from Notion, and archives it in `finally`.

Promotion is manual while the GitHub Actions quota is unavailable: verify locally, run the staging contract, inspect Cloudflare logs, and only then use `npx wrangler deploy`. Record the deployed version and prior version before promotion so `npm run rollback:production` has an unambiguous target.
