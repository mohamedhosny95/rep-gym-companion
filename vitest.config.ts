import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [cloudflareTest({
    wrangler: { configPath: "./wrangler.jsonc" },
    miniflare: {
      bindings: {
        ENVIRONMENT: "staging",
        REP_SYNC_KEY: "runtime-test-pairing-key-with-at-least-32-characters"
      }
    }
  })],
  test: {
    include: ["tests/runtime/**/*.test.ts"]
  }
});
