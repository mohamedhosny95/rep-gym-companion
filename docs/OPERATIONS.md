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

## Privacy request

Export if requested, revoke every device, clear each browser/device vault, then archive/delete records across every configured Notion data source under the workspace retention policy. Confirm push subscriptions no longer exist and rotate import credentials when the request includes automation sources.
