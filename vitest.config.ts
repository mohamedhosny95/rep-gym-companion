import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

const runtimeBindings = {
  ENVIRONMENT: "staging",
  REP_SYNC_KEY: "runtime-test-pairing-key-with-at-least-32-characters",
  NOTION_TOKEN: "runtime-test-notion-token",
  NOTION_DATA_SOURCE_ID: "runtime-test-workout-source",
  NOTION_RECOVERY_DATA_SOURCE_ID: "runtime-test-recovery-source",
  NOTION_NUTRITION_DATA_SOURCE_ID: "runtime-test-nutrition-source",
  NOTION_HYGIENE_DATA_SOURCE_ID: "runtime-test-hygiene-source",
  NOTION_HABIT_DATA_SOURCE_ID: "runtime-test-habit-source",
  NOTION_FOOD_DATA_SOURCE_ID: "runtime-test-food-source",
  CANONICAL_ORIGIN: "https://runtime-test.example",
  VITALS_IMPORT_KEY: "runtime-test-vitals-key-with-at-least-32-characters"
} as const;

Object.assign(process.env, runtimeBindings);

export default defineConfig({
  plugins: [cloudflareTest({
    wrangler: { configPath: "./wrangler.jsonc" },
    miniflare: {
      bindings: runtimeBindings
    }
  })],
  test: {
    include: ["tests/runtime/**/*.test.ts"]
  }
});
