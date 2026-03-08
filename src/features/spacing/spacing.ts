import type { PluginAPI } from "tailwindcss/plugin";

import type {
  StyleGeneratorOptions,
  SpacingPropertyMap,
} from "../../core/Options";
import { DEFAULT_SPACING_PROPERTIES } from "../../shared/defaultOption";

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
 * `var()` fallback chains. Each utility class reads from CSS custom properties
 * that can be set inline by components (e.g. `style={{ "--sp-p": "1rem" }}`).
 *
 * Tailwind v4 CSS-first architecture does not support `@media` inside
 * `addUtilities()` or `addBase()` JS plugin API. Responsive behavior is
 * achieved through the fallback chain: components set `--sp-p-md`, `--sp-p-lg`
 * variables inline, and the utility reads them via nested `var()` fallbacks.
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
        .filter((bp: string) => mergedScreens[bp])
        .map((bp: string) => ({
          key: bp,
          value: mergedScreens[bp],
          numericValue: Number.parseInt(mergedScreens[bp]),
        }))
        .sort(
          (a: { numericValue: number }, b: { numericValue: number }) =>
            a.numericValue - b.numericValue,
        )
    : [];

  // Generate flat utility classes that reference CSS custom properties.
  // No @media queries — Tailwind v4 plugin API does not support them.
  // Responsive values are resolved via var() fallback chain at runtime.
  const utilities: Record<string, Record<string, string>> = {};
  for (const [key, cssProps] of Object.entries(spacingProps)) {
    const overrides: Record<string, string> = {};
    for (const cssProp of Object.keys(cssProps)) {
      overrides[cssProp] = enableResponsive
        ? buildFallbackChain(
            key,
            sortedBreakpoints,
            sortedBreakpoints.length - 1,
          )
        : `var(--sp-${key})`;
    }
    utilities[`.sp-${key}`] = overrides;
  }

  api.addUtilities(utilities);
};
