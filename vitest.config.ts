import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    exclude: [...configDefaults.exclude, "e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "dist/", "**/*.test.ts", "**/*.test-d.ts"],
    },
    // Support type testing
    typecheck: {
      enabled: true,
      checker: "tsc",
      include: ["**/*.test-d.ts"],
    },
  },
});
