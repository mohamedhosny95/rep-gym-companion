import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    files: ["src/server/**/*.ts"],
    ignores: ["src/server/worker-configuration.d.ts"],
    plugins: { "@typescript-eslint": tseslint.plugin },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { project: "./tsconfig.json", tsconfigRootDir: import.meta.dirname }
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/consistent-type-imports": "error"
    }
  },
  {
    // Classic (non-module) browser scripts, each an IIFE that shares state
    // with the others through implicit globals (state, app, sessions, U(),
    // REP_SAFE_DOM, etc.). We don't attempt no-undef here: doing that
    // accurately would mean hand-maintaining a global registry across ~40
    // files, and a false positive there is worse than the bug it'd catch.
    // no-unused-vars needs no such registry - it only looks at local
    // bindings and parameters - and it's exactly what would have caught
    // this session's dead `ar`/`rtl` parameters left behind by the
    // Arabic-removal sweep.
    files: ["src/client/**/*.js"],
    ignores: ["src/client/qrcode.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script"
    },
    rules: {
      "no-unused-vars": ["warn", { args: "after-used", varsIgnorePattern: "^_" }]
    }
  }
);
