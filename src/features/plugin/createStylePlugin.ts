import plugin, { PluginAPI, PluginCreator } from "tailwindcss/plugin";

import { StyleGeneratorOptions, defaultScreens } from "../../core/Options";
import { ThemeConfig } from "../../core/ThemeConfig";
import type { ThemeOverride } from "../../core/ThemeConfig";
import { extractData, addDot } from "../../shared/helpers";
import { generateSafelist } from "../safelist/generateSafelist";
import { generateSpacingRules } from "../spacing/spacing";

import { flattenToVars, mapToVarRefs } from "./cssVariables";

export type TailwindPlugin = ReturnType<typeof plugin>;

interface VarSource {
  colors?: {
    base?: Record<string, string | Record<string, string>>;
    text?: Record<string, string | Record<string, string>>;
    common?: Record<string, string | Record<string, string>>;
  };
  shadows?: Record<string, string>;
  backDropBlurs?: Record<string, string>;
  borderRadius?: Record<string, string>;
}

const buildCssVars = (
  source: VarSource,
  disablePrefix = false,
): Record<string, string> => ({
  ...(source.colors?.base
    ? flattenToVars("color-base", source.colors.base, disablePrefix)
    : {}),
  ...(source.colors?.text
    ? flattenToVars("color-text", source.colors.text, disablePrefix)
    : {}),
  ...(source.colors?.common
    ? flattenToVars("color-common", source.colors.common, disablePrefix)
    : {}),
  ...(source.shadows ? flattenToVars("shadow", source.shadows, false) : {}),
  ...(source.backDropBlurs
    ? flattenToVars("backdrop-blur", source.backDropBlurs, false)
    : {}),
  ...(source.borderRadius
    ? flattenToVars("radius", source.borderRadius, false)
    : {}),
});

const buildColorConfig = (
  colors: ThemeConfig["colors"],
  enableCssVariables: boolean,
  disableColorPrefix: boolean,
): Record<string, string | Record<string, string>> => {
  if (enableCssVariables) {
    return {
      ...(colors.base
        ? mapToVarRefs("color-base", colors.base, disableColorPrefix)
        : {}),
      ...(colors.text
        ? mapToVarRefs("color-text", colors.text, disableColorPrefix)
        : {}),
      ...(colors.common
        ? mapToVarRefs("color-common", colors.common, disableColorPrefix)
        : {}),
    };
  }
  return {
    ...(colors.base ? extractData(colors.base as Record<string, unknown>) : {}),
    ...(colors.text ? extractData(colors.text as Record<string, unknown>) : {}),
    ...(colors.common
      ? extractData(colors.common as Record<string, unknown>)
      : {}),
  } as Record<string, string | Record<string, string>>;
};

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
  const { colors, typography, shadows, backDropBlurs, borderRadius, border } =
    config;

  const {
    enableCssVariables = true,
    enableResponsive = true,
    disableColorPrefix = false,
  } = options;

  // Merge default screens with custom overrides
  const mergedScreens = enableResponsive
    ? { ...defaultScreens, ...options.screens }
    : {};

  // Colors: use var() references if CSS variables enabled, otherwise direct hex values
  const colorConfig = buildColorConfig(
    colors,
    enableCssVariables,
    disableColorPrefix,
  );

  const tailwindConfig = {
    theme: {
      screens: mergedScreens,
      extend: {
        colors: colorConfig,
        boxShadow: shadows ? extractData(shadows) : {},
        backdropBlur: backDropBlurs ? extractData(backDropBlurs) : {},
        borderRadius: borderRadius ? extractData(borderRadius) : {},
        borderWidth: border ? extractData(border) : {},
      },
    },
    safelist: safelist ?? generateSafelist(config, options),
  };

  const myPlugin: PluginCreator = (api: PluginAPI) => {
    // Inject CSS variables: base theme → :root, overrides → html[data-theme='<name>']
    if (enableCssVariables) {
      api.addBase({
        ":root": buildCssVars(config, disableColorPrefix),
      });

      if (config.themes) {
        for (const [name, override] of Object.entries<ThemeOverride>(
          config.themes,
        )) {
          const vars = buildCssVars(override, disableColorPrefix);
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
