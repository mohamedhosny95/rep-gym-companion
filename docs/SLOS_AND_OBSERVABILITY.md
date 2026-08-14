# SLOs and observability

## Objectives

| Signal | Objective | Alert threshold |
| --- | ---: | ---: |
| Worker availability | 99.9% per 30 days | 5-minute error ratio consumes 10% of monthly budget |
| Internal error rate | <0.1% | >1% for 5 minutes |
| Verified sync rate | 99.5% | <99% for 15 minutes |
| Verified sync latency | 95% within 5 minutes | p95 >5 minutes for 15 minutes |
| Pairing success | 99.5% | <99% for 15 minutes |
| Web LCP / CLS / interaction | ≤2.5s / ≤0.1 / ≤200ms | any 75th percentile budget breach over 24 hours |

These values are returned by authenticated `/api/system-health` so the UI and runbook share one definition.
The "interaction" figure is the longest observed main-thread long task, not a true
input-to-paint (INP) measurement — a reasonable proxy given the client has no framework-level
interaction tracing, but narrower than the label implies.

**What's actually alerting today vs. what's a target.** Of the six rows above, only Notion sync
health is wired to an automated alert in this codebase: two consecutive verified-sync failures
push a deduplicated notification (6-hour re-alert gate) via `monitorSystemHealth`/
`sendSystemHealthAlert` in `src/server/index.js`. The remaining five rows — Worker availability,
internal error rate, verified sync latency, pairing success, and the Web Vitals budgets — are
objectives this table commits to, not alerts that currently page anyone; realizing them requires
building the Cloudflare dashboard alerts described below. Don't read this table as "monitoring is
live for all six" — it isn't yet.

## Signals

Worker logs are structured JSON events. Sync logs contain kind, status, verified flag, and duration—not meal text, health measurements, credentials, push endpoints, or Notion page content. Push delivery logs include only provider origin, status, and duration. Browser RUM stores the last 20 anonymous performance samples locally and sends bounded performance numbers only from a paired device.

Cloudflare invocation logs are enabled at 100%; traces are sampled at 5%. Build dashboards for request count, status family, duration, `notion_sync_completed`, `client_web_vitals`, `push_delivery_completed`, `device_alarm_failed`, and `notion_backup_completed`/`notion_backup_failed` (the daily off-workspace Notion export — see Architecture's Backups section). Alerts should link directly to the relevant procedure in `OPERATIONS.md`.

Per-device push status (`last_status`/`last_error`) and the last successful backup are also
surfaced directly on authenticated `/api/system-health` (`push`, `backup` fields) and in
Settings → Sync, independent of building any dashboard — a broken daily reminder or a stalled
backup is visible in-app even before an operator sets up alerting.

Per-device Durable Object SQLite state (registrations, receipts, push subscriptions) has no
export or backup path — accepted as low-risk since recovery is just re-pairing the device, but
worth naming explicitly rather than leaving it unaddressed by omission.

## Error budget policy

- Above 75% budget remaining: normal feature work.
- 25–75%: require a staging contract run and rollback evidence for risky changes.
- Below 25%: reliability-only changes until the rolling window recovers.
- A privacy incident or incorrect verified receipt bypasses the budget and freezes promotion immediately.

Do not claim an SLO is met from local tests. The objective becomes certified only after 30 days of production measurements with the dashboard retained as evidence.
