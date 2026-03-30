import plugin, { PluginAPI, PluginCreator } from "tailwindcss/plugin";

import { StyleGeneratorOptions, defaultScreens } from "../../core/Options";
import { ThemeConfig, TypographyConfig } from "../../core/ThemeConfig";
import type { ThemeOverride } from "../../core/ThemeConfig";
import { extractData, addDot, toKebabCase } from "../../shared/helpers";
import { detectTailwindVersion } from "../../shared/detectTailwindVersion";
import { generateSafelist } from "../safelist/generateSafelist";
import { generateSpacingRules } from "../spacing/spacing";

import { flattenToVars, mapToVarRefs } from "./cssVariables";

export type TailwindPlugin = ReturnType<typeof plugin>;

/**
 * Build CSS variable declarations from theme config.
 * Colors use "color" prefix, shadows use "shadow", etc.
 * @param {Partial<Pick<ThemeConfig, "colors">> & Pick<ThemeOverride, "shadows" | "backDropBlurs" | "borderRadius">} source - Theme source
 * @returns {Record<string, string>} CSS variable map
 */
const buildCssVars = (
  source: Partial<Pick<ThemeConfig, "colors">> &
    Pick<ThemeOverride, "shadows" | "backDropBlurs" | "borderRadius">,
): Record<string, string> => {
  return {
    ...(source.colors ? flattenToVars("color", source.colors) : {}),
    ...(source.shadows ? flattenToVars("shadow", source.shadows) : {}),
    ...(source.backDropBlurs
      ? flattenToVars("backdrop-blur", source.backDropBlurs)
      : {}),
    ...(source.borderRadius
      ? flattenToVars("radius", source.borderRadius)
      : {}),
  };
};

/**
 * Build the shared plugin handler (CSS vars, theme overrides, typography, spacing).
 * @param {ThemeConfig} config - Theme configuration
 * @param {StyleGeneratorOptions} options - Generator options
 * @param {Record<string, string>} mergedScreens - Merged screen definitions
 * @returns {PluginCreator} Plugin creator function
 */
const buildPluginHandler = (
  config: ThemeConfig,
  options: StyleGeneratorOptions,
  mergedScreens: Record<string, string>,
): PluginCreator => {
  const { typography } = config;

  return (api: PluginAPI) => {
    // Inject CSS variables
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

    // Register custom typography utilities
    if (options.typography?.cssVarDriven) {
      buildTypographyCssVarDriven(api, typography);
    } else {
      api.addUtilities(
        addDot(typography) as Record<string, Record<string, string | string[]>>,
      );
    }

    // Register spacing CSS custom property utilities
    if (options.spacing?.enabled !== false) {
      generateSpacingRules(api, options, mergedScreens);
    }
  };
};

/**
 * Build typography CSS vars and var-driven utilities for cssVarDriven mode.
 * @param {PluginAPI} api - Tailwind plugin API
 * @param {Record<string, TypographyConfig>} typography - Typography config keyed by utility name
 * @returns {void} No return value
 */
const buildTypographyCssVarDriven = (
  api: PluginAPI,
  typography: Record<string, TypographyConfig>,
): void => {
  const typographyVars: Record<string, string> = {};
  for (const [name, styles] of Object.entries<TypographyConfig>(typography)) {
    for (const [prop, value] of Object.entries(styles)) {
      typographyVars[`--typography-${toKebabCase(name)}-${toKebabCase(prop)}`] =
        String(value);
    }
  }
  api.addBase({ ":root": typographyVars });

  const varDrivenUtils: Record<string, Record<string, string>> = {};
  for (const [name, styles] of Object.entries<TypographyConfig>(typography)) {
    const varStyles: Record<string, string> = {};
    for (const prop of Object.keys(styles)) {
      const cssProp = toKebabCase(prop);
      varStyles[cssProp] = `var(--typography-${toKebabCase(name)}-${cssProp})`;
    }
    varDrivenUtils[`.${toKebabCase(name)}`] = varStyles;
  }
  api.addUtilities(varDrivenUtils);
};

/**
 * Creates a Tailwind CSS plugin based on the provided theme configuration.
 * Auto-detects Tailwind version and creates the appropriate plugin variant.
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
  const twVersion = options.tailwindVersion ?? detectTailwindVersion();
  const { colors, shadows, backDropBlurs, borderRadius, border } = config;
  const { enableResponsive = true } = options;

  const allScreens = { ...defaultScreens, ...options.screens };
  const mergedScreens = enableResponsive ? allScreens : {};

  const computedSafelist = safelist ?? generateSafelist(config, options);
  const handler = buildPluginHandler(config, options, mergedScreens);

  if (twVersion === 4) {
    // V4: does NOT register theme.extend.colors — Tailwind v4 uses `@theme inline`
    return plugin(handler, {
      theme: {
        screens: allScreens,
        extend: {
          borderWidth: border ? extractData(border) : {},
        },
      },
      safelist: computedSafelist,
    } as Record<string, unknown>);
  }

  // V3: extends theme.colors with var() refs
  return plugin(handler, {
    theme: {
      screens: allScreens,
      extend: {
        colors: mapToVarRefs("color", colors),
        boxShadow: shadows ? extractData(shadows) : {},
        backdropBlur: backDropBlurs ? extractData(backDropBlurs) : {},
        borderRadius: borderRadius ? extractData(borderRadius) : {},
        borderWidth: border ? extractData(border) : {},
      },
    },
    safelist: computedSafelist,
  } as Record<string, unknown>);
};
