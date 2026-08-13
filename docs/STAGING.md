# Isolated staging

The `staging` Wrangler environment is deliberately separate from production. Environment configuration does not inherit bindings or secrets, so configure every staging secret explicitly and use a dedicated test Notion integration and copied schema.

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
