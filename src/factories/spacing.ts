import type { PluginAPI } from "tailwindcss/plugin";

import type { SpacingPropertyMap, StyleGeneratorOptions } from "../types";
import { DEFAULT_SPACING_PROPERTIES } from "../constants";

/**
 * Build a `var()` fallback chain for a spacing property at a given breakpoint index.
 * Implements mobile-first cascade: larger breakpoints fall back to smaller ones.
 * @param {string} propKey Spacing property key (e.g. 'p', 'mx')
 * @param {{ key: string }[]} sortedBreakpoints Breakpoints sorted ascending by width
 * @param {number} currentIndex Current breakpoint index in the sorted array
 * @returns {string} CSS `var()` fallback chain
 * @example
 * // For prop "p", breakpoints [md, lg], index 1 (lg):
 * // → "var(--sp-p-lg, var(--sp-p-md, var(--sp-p)))"
 */
export const buildFallbackChain = (
  propKey: string,
  sortedBreakpoints: { key: string }[],
  currentIndex: number,
): string => {
  let chain = `var(--sp-${propKey})`;

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
 * @param {PluginAPI} api Tailwind plugin API
 * @param {StyleGeneratorOptions} options Style generator options
 * @param {Record<string, string>} mergedScreens Merged screen breakpoint definitions
 */
export const generateSpacingRules = (
  api: PluginAPI,
  options: StyleGeneratorOptions,
  mergedScreens: Record<string, string>,
) => {
  const spacingProps: SpacingPropertyMap =
    options.spacing?.properties ?? DEFAULT_SPACING_PROPERTIES;

  const breakpointKeys = options.breakpoints ?? ["md", "lg"];
  const enableResponsive = options.enableResponsive !== false;

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

  const baseRules: Record<string, Record<string, string>> = {};
  for (const [key, cssProps] of Object.entries(spacingProps)) {
    baseRules[`.sp-${key}`] = { ...cssProps };
  }
  api.addUtilities(baseRules);

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

    api.addBase({
      [`@media (min-width: ${bp.value})`]: mediaRules,
    });
  }
};
