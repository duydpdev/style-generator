import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig, mergeConfig } from "vitest/config";

import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    // Pre-bundle the runtime imports up front: a dependency Vite discovers
    // mid-run triggers a re-optimise and a page reload that fails a cold run.
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "class-variance-authority",
        "clsx",
        "tailwind-merge",
      ],
    },
    test: {
      projects: [
        {
          extends: true,
          // configDir defaults to .storybook (relative to the cwd: the scripts run in this workspace).
          plugins: [storybookTest()],
          test: {
            name: "storybook",
            browser: {
              enabled: true,
              provider: playwright(),
              headless: true,
              instances: [{ browser: "chromium" as const }],
            },
          },
        },
      ],
    },
  }),
);
