import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import type { StorybookConfig } from "@storybook/nextjs-vite";

function getAbsolutePath(value: string): string {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}

/** Hand-written (never `storybook add`): component stories under src/ui/ only, docs + Vitest addons, no telemetry. */
const config: StorybookConfig = {
  stories: ["../src/ui/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-vitest"],
  framework: getAbsolutePath("@storybook/nextjs-vite"),
  core: { disableTelemetry: true },
};

export default config;
