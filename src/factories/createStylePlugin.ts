import plugin, { PluginAPI, PluginCreator } from "tailwindcss/plugin";

import { ThemeConfig, StyleGeneratorOptions, defaultScreens } from "../types";
import type { SpacingPropertyMap, ThemeOverride } from "../types";
import { extractData, addDot, flattenToVars, mapToVarRefs } from "../utils";
import { DEFAULT_SPACING_PROPERTIES } from "../constants";

import { generateSafelist } from "./generateSafelist";

/**
 * Build CSS variable overrides from a theme override config.
 * @param {ThemeOverride} override - Theme override config
 * @returns {Record<string, string>} CSS variables for the theme
 */
const buildThemeVars = (override: ThemeOverride): Record<string, string> => {
  return {
    ...(override.colors?.base
      ? flattenToVars("color-base", override.colors.base)
      : {}),
    ...(override.colors?.text
      ? flattenToVars("color-text", override.colors.text)
      : {}),
    ...(override.shadows ? flattenToVars("shadow", override.shadows) : {}),
    ...(override.backDropBlurs
      ? flattenToVars("backdrop-blur", override.backDropBlurs)
      : {}),
    ...(override.borderRadius
      ? flattenToVars("radius", override.borderRadius)
      : {}),
  };
};

/**
 * Build light mode CSS variable declarations from config.
 * @param {ThemeConfig} config - Theme config
 * @returns {Record<string, string>} Light CSS variables
 */
const buildLightVars = (config: ThemeConfig): Record<string, string> => {
  const { colors, shadows, backDropBlurs, borderRadius } = config;
  return {
    ...flattenToVars("color-base", colors.base),
    ...flattenToVars("color-text", colors.text),
    ...(shadows ? flattenToVars("shadow", shadows) : {}),
    ...(backDropBlurs ? flattenToVars("backdrop-blur", backDropBlurs) : {}),
    ...(borderRadius ? flattenToVars("radius", borderRadius) : {}),
  };
};

/**
 * Build a `var()` fallback chain for a spacing property at a given breakpoint index.
 * Implements mobile-first cascade: larger breakpoints fall back to smaller ones.
 * @param {string} propKey - Spacing property key (e.g. 'p', 'mx')
 * @param {{ key: string }[]} sortedBreakpoints - Breakpoints sorted ascending by width
 * @param {number} currentIndex - Current breakpoint index in the sorted array
 * @returns {string} CSS `var()` fallback chain
 * @example
 * // For prop "p", breakpoints [md, lg], index 1 (lg):
 * // → "var(--sp-p-lg, var(--sp-p-md, var(--sp-p)))"
 */
const buildFallbackChain = (
  propKey: string,
  sortedBreakpoints: { key: string }[],
  currentIndex: number,
): string => {
  // Start with base variable: var(--sp-{prop})
  let chain = `var(--sp-${propKey})`;

  // Wrap with each breakpoint from smallest to current
  for (let i = 0; i <= currentIndex; i++) {
    const bp = sortedBreakpoints[i];
    chain = `var(--sp-${propKey}-${bp.key}, ${chain})`;
  }

  return chain;
};

/**
 * Generate spacing utility CSS rules (`.sp-p`, `.sp-mx`, etc.) with responsive
 * `var()` fallback chains. This replaces the traditional safelist approach for spacing,
 * producing a fixed number of CSS rules regardless of how many spacing values exist.
 * @param {PluginAPI} api - Tailwind plugin API
 * @param {StyleGeneratorOptions} options - Style generator options
 * @param {Record<string, string>} mergedScreens - Merged screen breakpoint definitions
 */
const generateSpacingRules = (
  api: PluginAPI,
  options: StyleGeneratorOptions,
  mergedScreens: Record<string, string>,
) => {
  const spacingProps: SpacingPropertyMap =
    options.spacing?.properties ?? DEFAULT_SPACING_PROPERTIES;

  const breakpointKeys = options.breakpoints ?? ["md", "lg"];
  const enableResponsive = options.enableResponsive !== false;

  // Sort breakpoints by screen width (ascending) for correct mobile-first cascade
  const sortedBreakpoints = enableResponsive
    ? breakpointKeys
        .filter((bp) => mergedScreens[bp])
        .map((bp) => ({
          key: bp,
          value: mergedScreens[bp],
          numericValue: Number.parseInt(mergedScreens[bp]),
        }))
        .sort((a, b) => a.numericValue - b.numericValue)
    : [];

  // Base rules: .sp-p { padding: var(--sp-p) }
  const baseRules: Record<string, Record<string, string>> = {};
  for (const [key, cssProps] of Object.entries(spacingProps)) {
    baseRules[`.sp-${key}`] = { ...cssProps };
  }
  api.addUtilities(baseRules);

  // Responsive rules: @media (min-width: ...) { .sp-p { padding: var(--sp-p-md, var(--sp-p)) } }
  for (let i = 0; i < sortedBreakpoints.length; i++) {
    const bp = sortedBreakpoints[i];
    const mediaRules: Record<string, Record<string, string>> = {};

    for (const [key, cssProps] of Object.entries(spacingProps)) {
      const fallback = buildFallbackChain(key, sortedBreakpoints, i);
      const overrides: Record<string, string> = {};
      for (const cssProp of Object.keys(cssProps)) {
        overrides[cssProp] = fallback;
      }
      mediaRules[`.sp-${key}`] = overrides;
    }

    // Wrap rules in @media query
    api.addUtilities({
      [`@media (min-width: ${bp.value})`]: mediaRules,
    });
  }
};

/**
 * Creates a Tailwind CSS plugin based on the provided theme configuration.
 * Registers CSS variables, typography utilities, spacing CSS custom property rules,
 * and extends the theme with custom colors/shadows/etc.
 * @param {ThemeConfig} config - Theme configuration
 * @param {StyleGeneratorOptions} options - Generator options
 * @param {string[]} [safelist] - Precomputed safelist (avoids double generation)
 * @returns {unknown} Tailwind plugin instance
 */
export const createStylePlugin = (
  config: ThemeConfig,
  options: StyleGeneratorOptions = {},
  safelist?: string[],
): unknown => {
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
      const baseVars = buildLightVars(config);
      api.addBase({ ":root": baseVars });

      // Generate CSS variables for each theme override
      if (config.themes) {
        for (const [name, override] of Object.entries(config.themes)) {
          const vars = buildThemeVars(override);
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

  return plugin(myPlugin, tailwindConfig) as unknown;
};
