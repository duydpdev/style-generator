import type { PluginAPI } from "tailwindcss/plugin";

import type {
  StyleGeneratorOptions,
  SpacingPropertyMap,
} from "../../core/Options";
import { DEFAULT_SPACING_PROPERTIES } from "../../shared/defaultOption";

interface Breakpoint {
  key: string;
  value: string;
  numericValue: number;
}

type CSSRuleObject = Record<
  string,
  Record<string, string> | Record<string, Record<string, string>>
>;

const getSortedBreakpoints = (
  breakpointKeys: string[],
  mergedScreens: Record<string, string>,
): Breakpoint[] =>
  breakpointKeys
    .filter((bp: string) => mergedScreens[bp])
    .map((bp: string) => ({
      key: bp,
      value: mergedScreens[bp],
      numericValue: Number.parseInt(mergedScreens[bp], 10),
    }))
    .sort((a, b) => a.numericValue - b.numericValue);

const buildResponsiveStyles = (
  spacingProps: SpacingPropertyMap,
  sortedBreakpoints: Breakpoint[],
  api: PluginAPI,
  utilities: Record<string, Record<string, string>>,
): void => {
  const baseStyles: CSSRuleObject = { "*": {} };

  // 1. Collect all base variables
  for (const key of Object.keys(spacingProps)) {
    (baseStyles["*"] as Record<string, string>)[`--tw-sp-${key}`] =
      `var(--sp-${key})`;
  }

  // 2. Build media queries cascade
  for (let i = 0; i < sortedBreakpoints.length; i++) {
    const bp = sortedBreakpoints[i];
    const mqKey = `@media (min-width: ${bp.value})`;
    baseStyles[mqKey] = { "*": {} };

    for (const key of Object.keys(spacingProps)) {
      let chain = `var(--sp-${key})`;
      for (let j = 0; j <= i; j++) {
        const iterBp = sortedBreakpoints[j];
        chain = `var(--sp-${key}-${iterBp.key}, ${chain})`;
      }

      const screenBase = baseStyles[mqKey];
      screenBase["*"][`--tw-sp-${key}`] = chain;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
  api.addBase(baseStyles as any);

  // 3. Generate flat utility classes
  for (const [key, cssProps] of Object.entries(spacingProps)) {
    const overrides: Record<string, string> = {};
    for (const cssProp of Object.keys(cssProps)) {
      overrides[cssProp] = `var(--tw-sp-${key})`;
    }
    utilities[`.sp-${key}`] = overrides;
  }
};

const buildFlatStyles = (
  spacingProps: SpacingPropertyMap,
  utilities: Record<string, Record<string, string>>,
): void => {
  for (const [key, cssProps] of Object.entries(spacingProps)) {
    const overrides: Record<string, string> = {};
    for (const cssProp of Object.keys(cssProps)) {
      overrides[cssProp] = `var(--sp-${key})`;
    }
    utilities[`.sp-${key}`] = overrides;
  }
};

/**
 * Generate spacing utility CSS rules (`.sp-p`, `.sp-mx`, etc.) with responsive
 * `var()` fallback chains.
 *
 * It uses `addBase` to inject the CSS variables mapping logic for responsive usage,
 * and mapping utilites to reading that resolved variable.
 * @param {PluginAPI} api Tailwind plugin API
 * @param {StyleGeneratorOptions} options Style generator options
 * @param {Record<string, string>} mergedScreens Merged screen breakpoint definitions
 */
export const generateSpacingRules = (
  api: PluginAPI,
  options: StyleGeneratorOptions,
  mergedScreens: Record<string, string>,
): void => {
  const spacingProps: SpacingPropertyMap =
    options.spacing?.properties ?? DEFAULT_SPACING_PROPERTIES;

  const breakpointKeys = options.breakpoints ?? ["md", "lg"];
  const enableResponsive = options.enableResponsive !== false;
  const utilities: Record<string, Record<string, string>> = {};

  if (enableResponsive) {
    const sortedBreakpoints = getSortedBreakpoints(
      breakpointKeys,
      mergedScreens,
    );
    buildResponsiveStyles(spacingProps, sortedBreakpoints, api, utilities);
  } else {
    buildFlatStyles(spacingProps, utilities);
  }

  api.addUtilities(utilities);

  // JIT mode: register matchUtilities so consumers can use sp-p-4, sp-p-[24px] directly
  if (options.spacing?.useMatchUtilities) {
    for (const [key, cssProps] of Object.entries(spacingProps)) {
      api.matchUtilities(
        {
          [`sp-${key}`]: (value: string) => {
            const result: Record<string, string> = {};
            for (const cssProp of Object.keys(cssProps)) {
              result[cssProp] = value;
            }
            return result;
          },
        },
        {
          values: api.theme("spacing") as Record<string, string>,
          supportsNegativeValues: false,
        },
      );
    }
  }
};
