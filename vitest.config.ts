import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // e2e/** and e2e-site/** are Playwright specs; examples/** are separate workspaces with their own vitest config
    // (`yarn workspace design-system-example test`, CI: after `build:all`).
    exclude: [...configDefaults.exclude, "e2e/**", "e2e-site/**", "examples/**"],
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
      // Floor ~1 point under the measured totals (2026-10-06: 95.23 / 89.55 /
      // 95.95 / 95.68). CI runs `yarn test:coverage`, so a drop fails the build.
      thresholds: {
        statements: 94,
        branches: 88,
        functions: 94,
        lines: 94,
      },
    },
    // Type tests (*.test-d.ts) run only via `yarn test:types`; enabling
    // typecheck here would type-check them again on every `yarn test`.
    typecheck: {
      checker: "tsc",
      include: ["**/*.test-d.ts"],
      exclude: [...configDefaults.exclude, "examples/**"],
    },
  },
});
