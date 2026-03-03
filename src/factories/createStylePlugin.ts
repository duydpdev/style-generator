import plugin, { PluginAPI, PluginCreator } from "tailwindcss/plugin";

import { ThemeConfig, StyleGeneratorOptions, defaultScreens } from "../types";
import type { ThemeOverride } from "../types";
import { extractData, addDot, flattenToVars, mapToVarRefs } from "../utils";

import { generateSafelist } from "./generateSafelist";
import { generateSpacingRules } from "./spacing";

export type TailwindPlugin = ReturnType<typeof plugin>;

interface VarSource {
  colors?: {
    base?: Record<string, string>;
    text?: Record<string, string>;
  };
  shadows?: Record<string, string>;
  backDropBlurs?: Record<string, string>;
  borderRadius?: Record<string, string>;
}

const buildCssVars = (source: VarSource): Record<string, string> => ({
  ...(source.colors?.base
    ? flattenToVars("color-base", source.colors.base)
    : {}),
  ...(source.colors?.text
    ? flattenToVars("color-text", source.colors.text)
    : {}),
  ...(source.shadows ? flattenToVars("shadow", source.shadows) : {}),
  ...(source.backDropBlurs
    ? flattenToVars("backdrop-blur", source.backDropBlurs)
    : {}),
  ...(source.borderRadius ? flattenToVars("radius", source.borderRadius) : {}),
});

/**
 * Creates a Tailwind CSS plugin based on the provided theme configuration.
 * Registers CSS variables, typography utilities, spacing CSS custom property rules,
 * and extends the theme with custom colors/shadows/etc.
 * @param {ThemeConfig} config - Theme configuration
 * @param {StyleGeneratorOptions} options - Generator options
 * @param {string[]} [safelist] - Precomputed safelist (avoids double generation)
 * @returns {TailwindPlugin} Tailwind plugin instance
 */
export const createStylePlugin = (
  config: ThemeConfig,
  options: StyleGeneratorOptions = {},
  safelist?: string[],
): TailwindPlugin => {
  const { colors, typography, shadows, backDropBlurs, borderRadius } = config;

  const { enableCssVariables = true, enableResponsive = true } = options;

  // Merge default screens with custom overrides
  const mergedScreens = enableResponsive
    ? { ...defaultScreens, ...options.screens }
    : {};

  // Colors: use var() references if CSS variables enabled, otherwise direct hex values
  const colorConfig = enableCssVariables
    ? {
        ...mapToVarRefs("color-base", colors.base),
        ...mapToVarRefs("color-text", colors.text),
      }
    : {
        ...extractData(colors.base),
        ...extractData(colors.text),
      };

  const tailwindConfig = {
    theme: {
      screens: mergedScreens,
      extend: {
        colors: colorConfig,
        boxShadow: shadows ? extractData(shadows) : {},
        backdropBlur: backDropBlurs ? extractData(backDropBlurs) : {},
        borderRadius: borderRadius ? extractData(borderRadius, false) : {},
      },
    },
    safelist: safelist ?? generateSafelist(config, options),
  };

  const myPlugin: PluginCreator = (api: PluginAPI) => {
    // Inject CSS variables: base theme → :root, overrides → html[data-theme='<name>']
    if (enableCssVariables) {
      api.addBase({ ":root": buildCssVars(config) });

      if (config.themes) {
        for (const [name, override] of Object.entries<ThemeOverride>(
          config.themes,
        )) {
          const vars = buildCssVars(override);
          if (Object.keys(vars).length > 0) {
            api.addBase({ [`html[data-theme='${name}']`]: vars });
          }
        }
      }
    }

    // Register custom typography utilities
    api.addUtilities(
      addDot(typography) as Record<string, Record<string, string | string[]>>,
    );

    // Register spacing CSS custom property utilities (.sp-* classes)
    if (options.spacing?.enabled !== false) {
      generateSpacingRules(api, options, mergedScreens);
    }
  };

  return plugin(myPlugin, tailwindConfig);
};
