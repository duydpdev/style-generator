import type { StorybookConfig } from "@storybook/react-vite";

/** Hand-written (never `storybook add`): component stories under src/ui/ only, docs + Vitest addons, no telemetry. */
const config: StorybookConfig = {
  stories: ["../src/ui/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-vitest"],
  framework: "@storybook/react-vite",
  core: { disableTelemetry: true },
};

export default config;
