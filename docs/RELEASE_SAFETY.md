# Release safety

Production releases are owned by the `deploy-production` job in
`.github/workflows/verify.yml`. It runs only for `main`, only after the fast
verification and browser E2E jobs pass, and through the protected GitHub
`production` environment.

Repository administrators must complete these one-time settings:

1. Resolve any GitHub Actions billing or spending-limit warning.
2. Protect `main`; require a pull request and the `verify` and `e2e` checks.
3. Create a GitHub environment named `production` and require an approver.
4. Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as environment
   secrets. Scope the token only to this Worker.
5. Disable Cloudflare's direct branch deployment for this repository. The
   GitHub workflow is the only production deployer.
6. Use the per-commit `health-os-client-*` artifact to review pull requests.

Never configure a feature branch to target the production Worker. If hosted
preview URLs are added later, they must use a separate Worker, bindings, KV
namespace, secrets, and Durable Object namespace.
