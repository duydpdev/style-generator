import plugin, { PluginAPI, PluginCreator } from "tailwindcss/plugin";

import { ThemeConfig, StyleGeneratorOptions, defaultScreens } from "../types";
import { extractData, addDot } from "../utils";

import { generateSafelist } from "./generateSafelist";

/**
 * Creates a Tailwind CSS plugin based on the provided theme configuration.
 * @param {ThemeConfig} config - Theme configuration
 * @param {StyleGeneratorOptions} options - Generator options
 * @param {string[]} [safelist] - Precomputed safelist
 * @returns {unknown} Tailwind plugin instance
 */
export const createStylePlugin = (
  config: ThemeConfig,
  options: StyleGeneratorOptions = {},
  safelist?: string[],
): unknown => {
  const { colors, typography, shadows, backDropBlurs, borderRadius } = config;

  const mergedScreens = {
    ...defaultScreens,
    ...options.screens,
  };

  // If user provides specific breakpoints, we should restrict the theme screens to those?
  // Or usually, the theme should have ALL screens available, but we only SAFELIST some.
  // BUT the user said: "breakpoints cũng đang nằm trong theme là không đúng mà phải là option".
  // So likely they want to configure the screens via this option.
  const themeScreens = mergedScreens; // Use all merged screens for the theme configuration

  const tailwindConfig = {
    theme: {
      screens: themeScreens,
      extend: {
        colors: { ...extractData(colors.base), ...extractData(colors.text) },
        boxShadow: extractData(shadows ?? {}),
        backdropBlur: extractData(backDropBlurs ?? {}),
        borderRadius: extractData(borderRadius ?? {}, false),
      },
    },
    safelist: safelist ?? generateSafelist(config, options),
  };

  const myPlugin: PluginCreator = (api: PluginAPI) => {
    api.addUtilities(
      addDot(typography) as Record<string, Record<string, string | string[]>>,
    );
  };

  return plugin(myPlugin, tailwindConfig) as unknown;
};
