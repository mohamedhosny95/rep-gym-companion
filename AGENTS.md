# Repository Rules & Operating Guidelines for Health OS (Rep Gym Companion)

## Automated Merge & Deployment Protocol
- **Merge to Main Trigger**: Whenever the user asks to "merge to main" or "merge into main", the AI assistant must automatically execute the following pipeline in sequence without requiring separate prompts:
  1. **Sync & Verify**: Run `npm run sync` and `npm run verify` to ensure static assets, typechecks, linter, node unit tests, and vitest worker tests pass 100%.
  2. **Merge Branch**: Fast-forward merge the working branch into `main`.
  3. **Auto-Redeploy to Cloudflare**: Run `npx wrangler deploy` immediately so the new build is deployed and live in production on Cloudflare Workers without delay.
  4. **Report Status**: Return the live production URL and deployment version ID in the completion message.

## Mobile Ergonomics & Quality Standards
- All workout, sports, and recovery interfaces must strictly adhere to 44px–48px touch targets, non-overlapping HUDs, safe viewport boundaries, and full bilingual (English & Arabic RTL) parity.
