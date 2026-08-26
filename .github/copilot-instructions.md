# Copilot & Agent Instructions for Health OS

## Automated Merge & Deployment Rule
Whenever the user asks to "merge into main" or "merge to main":
1. Run `npm run sync && npm run verify` to build static assets and test.
2. Merge working branch into `main`.
3. Run `npx wrangler deploy --env=""` to deploy directly to Cloudflare production.
4. Push to `origin main` to trigger GitHub Actions deployment pipeline.
5. Report the live deployment status.
