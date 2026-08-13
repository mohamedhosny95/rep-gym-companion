# Security and privacy model

## Assets and trust boundaries

Sensitive assets are health logs, pairing authority, Notion integration access, HealthKit import authority, push subscriptions, and encrypted backups. Boundaries are browser ↔ Worker, Worker ↔ Notion/AI/push provider, iPhone Keychain ↔ Worker, and production ↔ staging.

| Threat | Primary controls | Residual action |
| --- | --- | --- |
| Pairing-key theft | one-time exchange, HttpOnly Secure SameSite cookie, registered device authority, five-minute atomic QR claim | rotate master key and revoke every device |
| Replay/duplicate sync | stable client idempotency key, per-device receipt store, Notion post-write read | inspect receipt and archive duplicate manually |
| Offline data loss | IndexedDB source plus versioned durable outbox | encrypted export and recovery drill |
| Cross-device revocation race | strongly consistent DeviceCoordinator and DeviceRegistry | revoke current device and rotate master key |
| Push subscription disclosure | subscription is per-device DO state; logs expose provider origin only | clear subscription and revoke device |
| Injection or oversized input | explicit runtime contracts, size limits, CSP, same-origin enforcement, rate limits | disable affected adapter and inspect structured logs |
| Staging contaminates production | independent Worker, KV, DO namespace, rate limits, secrets, and test Notion source | revoke test integration and archive test rows |
| Backup header downgrade/tamper | schema 5 AES-GCM binds the versioned algorithm header as authenticated data; schema 4 remains restore-only | re-export legacy backups as schema 5 |

## Data lifecycle

| Data | Location | Retention/deletion |
| --- | --- | --- |
| Local health/workout/food state | browser IndexedDB | until user chooses delete; two confirmations |
| Sync delivery intent | browser IndexedDB | removed after verified receipt; failed records retained for user action |
| Device registration/subscription | Durable Object SQLite | until device revocation; revocation deletes subscription and receipts |
| Verified receipts | Durable Object SQLite | 30 days, then opportunistically purged |
| Health import aggregates/monitor snapshot | KV | bounded endpoint-specific TTL; operational snapshot 30 days |
| Notion records | owner's Notion workspace | controlled by Notion workspace retention; app deletion does not silently destroy them |
| Local RUM | browser localStorage | latest 20 samples; removed by local-data deletion |
| Worker logs/traces | Cloudflare account | set account retention to the shortest operationally useful period |

Before local deletion, export a schema-5 encrypted backup if recovery may be needed. Local deletion disconnects and revokes the current server device, clears IndexedDB/localStorage, and removes the local device vault. To erase synchronized cloud records, use the Notion workspace delete/archive workflow and verify every configured data source; the app intentionally has no mass-delete endpoint because an accidental or stolen-session request would be disproportionally destructive.

## Review cadence

Run this threat model before adding a new provider, new health field, new storage binding, or broader telemetry. Quarterly: rotate test credentials, audit active devices/integrations, verify log redaction, restore an encrypted backup in an isolated browser, and review Cloudflare/Notion access roles.
