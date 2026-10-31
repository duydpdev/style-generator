import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    typecheck: {
      checker: "tsc",
      tsconfig: "./tsconfig.json",
      include: ["src/**/*.test-d.ts"],
    },
  },
});
