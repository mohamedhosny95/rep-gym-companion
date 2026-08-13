import tseslint from "typescript-eslint";

export default tseslint.config({
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
});
