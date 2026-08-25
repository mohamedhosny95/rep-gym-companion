# Release safety

Production releases are owned by the `deploy-production` job in
`.github/workflows/verify.yml`. It runs only for `main`, only after the fast
verification and browser E2E jobs pass, and through the protected GitHub
`production` environment.

Temporary quota-outage mode: do not weaken or edit that workflow. Follow the
local, staging, evidence, and manual-deploy sequence in `OPERATIONS.md`. This is
an explicit exception for unavailable Actions capacity, not a second permanent
deployment path. Restore the protected workflow as the sole deployer when the
quota renews.

Repository administrators must complete these one-time settings:

1. Resolve any GitHub Actions billing or spending-limit warning.
2. Protect `main`; require a pull request and the `verify` and `e2e` checks.
3. Create a GitHub environment named `production` and require an approver.
4. Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as environment
   secrets. Scope the token only to this Worker.
5. Disable Cloudflare's direct branch deployment for this repository. The
   GitHub workflow is the only production deployer.
6. Use the per-commit `health-os-client-*` artifact to review pull requests.

With a repository-administration token in `GH_TOKEN`, apply and verify the
idempotent repository settings from a trusted local shell:

```sh
npm run github:configure
npm run github:check
```

The command protects `main`, requires pull requests plus the `verify` and `e2e`
checks, applies the rules to administrators, blocks force-push/deletion, requires
linear history and resolved conversations, and creates the reviewed
`production` environment. It never prints the token. GitHub Actions billing and
the environment's Cloudflare secrets remain account-level settings and must be
confirmed by an administrator.

Never configure a feature branch to target the production Worker. If hosted
preview URLs are added later, they must use a separate Worker, bindings, KV
namespace, secrets, and Durable Object namespace.
