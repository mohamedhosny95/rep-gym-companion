# Health OS Assistant Instructions

## Automated Merge & Deployment Protocol
- **Merge to Main Trigger**: Whenever the user asks to "merge to main" or "merge into main", the AI assistant must automatically execute the following pipeline in sequence without requiring separate prompts:
  1. **Sync & Verify**: Run `npm run sync` and `npm run verify` to ensure all tests, types, and builds pass cleanly.
  2. **Merge Branch**: Fast-forward merge the working branch into `main`.
  3. **Auto-Redeploy to Cloudflare**: Run `npx wrangler deploy` immediately so the new build is deployed and live in production on Cloudflare Workers without delay.
  4. **Report Status**: Return the live production URL and deployment version ID in the completion message.
