import { fileURLToPath } from "node:url";

import type { StorybookConfig } from "@storybook/vue3-vite";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { mergeConfig } from "vite";

const config: StorybookConfig = {
  stories: ["../app/ui/**/*.stories.@(ts)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-vitest"],
  framework: "@storybook/vue3-vite",
  core: { disableTelemetry: true },
  async viteFinal(config) {
    return mergeConfig(config, {
      plugins: [vue(), tailwindcss()],
      resolve: {
        alias: {
          "~": fileURLToPath(new URL("../app", import.meta.url)),
        },
      },
    });
  },
};

export default config;
