# Claude Guidelines for Health OS (Rep Gym Companion)

## Automated Merge & Deployment Rule
Whenever the user asks to "merge into main" or "merge to main":
1. **Sync & Verify**: Run `npm run sync` and `npm run verify` to ensure all tests, static builds, and linting pass.
2. **Merge to Main**: Fast-forward merge the working branch into `main`.
3. **Auto-Redeploy to Cloudflare**: Run `npx wrangler deploy --env=""` immediately to deploy production.
4. **Push to Remote**: Run `git push origin main` (which also triggers the GitHub Actions automated deployment pipeline).
5. **Confirm**: Output the live production URL and version ID to the user.
