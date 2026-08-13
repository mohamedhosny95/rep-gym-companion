# Operations and recovery

## Release gate without GitHub Actions

1. `npm ci`
2. `npm run verify:all`
3. `npm run deploy:staging:dry-run`
4. Deploy staging and run `npm run test:staging` with the dedicated test integration.
5. Inspect structured logs for errors and verify the mobile certification matrix.
6. Record current Cloudflare deployment ID; deploy production manually.
7. Probe `/api/system-health`, pair a test device, and sync one disposable record.

Do not modify or depend on GitHub Actions until the monthly quota is available again.

## Notion outage or schema drift

The device outbox is the recovery buffer. Do not clear it or mark entries successful. Confirm `/api/system-health`, integration access, source Trash state, and required property types. Repair the test copy first, run the staging contract, then repair production. Use **Retry pending now**; stable idempotency keys and verified receipts prevent duplicate success reporting.

## Elevated Worker errors

Check the deployment version, status families, duration, and structured event names. If the rise began with the latest deployment, run `npm run rollback:production` and confirm the previous version. Preserve logs and the failing request class without copying health payloads into the incident record.

## Push failures

Filter `device_alarm_failed` and `push_delivery_completed`. A 404/410 deletes an expired subscription; ask that device to enable reminders again. For provider 5xx/network errors, Durable Object alarm retries are automatic. Verify VAPID subject/key pair and use the per-device test button. Never paste an endpoint or private JWK into a ticket.

## Credential compromise

Rotate the affected secret in both the provider and Cloudflare, revoke all registered devices, and invalidate the old provider token. Staging and production are rotated separately. If the master pairing key changes, existing device cookies remain registered; revoke them explicitly when compromise is suspected.

## Backup/restore drill

Quarterly, use a fresh browser profile: export a schema-5 encrypted backup, tamper with its header and confirm restore rejection, clear the profile, import the untouched file, and compare record counts/date ranges. Record the build, backup schema, result, and operator. Automatic device snapshots are convenience recovery, not an off-device backup.

## Off-workspace Notion backup (one-time setup)

The device outbox and encrypted client backups above protect against local/browser loss, but neither protects against losing the Notion workspace itself — Notion is the only durable copy of every synced record. A Worker cron (`17 3 * * *`, alongside the existing five-minute health check) exports every configured data source's page ids/properties to R2 daily and keeps the last 30 days.

1. `npx wrangler r2 bucket create rep-gym-companion-backups` (and `rep-gym-companion-backups-staging` for staging).
2. Redeploy. `/api/system-health` → `infrastructure.notionBackup.configured` becomes `true`, and Settings → Sync shows the last backup time. Until the bucket exists, the job no-ops (`{skipped:true}`) rather than failing loudly — it does not block deploys, but check `infrastructure.notionBackup` after setup to confirm it actually started running.
3. Watch for the `notion_backup_completed` (or `notion_backup_failed`) structured log event once a day.

**Restoring after real data loss.** This is a deliberately manual, human-reviewed process — nothing here auto-writes back into Notion, because a Worker silently overwriting a live workspace on a bad assumption would be worse than the outage it's recovering from.

1. Download the most recent object from the `notion-backup/` prefix in the R2 bucket (`npx wrangler r2 object get rep-gym-companion-backups/notion-backup/<date>.json`).
2. It's one JSON file with a `sources` object keyed by `workout`/`recovery`/`nutrition`/`hygiene`/`habit`/`food`, each holding the page ids, timestamps, and properties captured that day (no attachments/files, no page content blocks — property values only, matching what the app itself writes).
3. Recreate the destination database/data source in Notion if needed, then re-create pages from the backup's `properties` objects via the Notion API or by hand, cross-checking against the device's own encrypted local backup (Settings → Security) for anything synced after the last daily export ran.

## Privacy request

Export if requested, revoke every device, clear each browser/device vault, then archive/delete records across every configured Notion data source under the workspace retention policy. Confirm push subscriptions no longer exist and rotate import credentials when the request includes automation sources.
