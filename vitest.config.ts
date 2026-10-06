import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    exclude: [...configDefaults.exclude, "e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      // Every source file counts, including ones no test imports (cli/*).
      include: ["src/**/*.ts"],
      exclude: [
        "**/*.test.ts",
        "**/*.test-d.ts",
        "**/*.d.ts",
        "src/__integration__/**",
      ],
    },
    // Type tests (*.test-d.ts) run only via `yarn test:types`; enabling
    // typecheck here would type-check them again on every `yarn test`.
    typecheck: {
      checker: "tsc",
      include: ["**/*.test-d.ts"],
    },
  },
});
