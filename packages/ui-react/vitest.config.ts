import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.tsx", "tests/**/*.test.ts"],
    typecheck: {
      checker: "tsc",
      tsconfig: "./tsconfig.json",
      include: ["src/**/*.test-d.tsx", "tests/**/*.test-d.tsx"],
    },
  },
});
