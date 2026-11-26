import {
  DEFAULT_BREAKPOINTS,
  DEFAULT_SPACING_PROPERTIES,
} from "../shared/defaultOption";

import { defaultScreens } from "./Options";
import type { SpacingPropertyMap, StyleGeneratorOptions } from "./Options";

/**
 * The options the typed tokens read, with their defaults applied.
 * Rationale: documents/architecture.md#stylegeneratoroptions-why-each-option-is-declared-in-four-files
 */
export interface ResolvedTokenOptions {
  breakpoints: readonly string[];
  screens: Readonly<Record<string, string>>;
  spacing: { enabled: boolean; properties: SpacingPropertyMap };
  /** Plain steps of `coverage.colors.opacities`, ascending (groups are not typed). */
  opacities: readonly number[];
}

/**
 * Merge `defaultScreens` with a custom map; generic so unvalidated maps merge too.
 * @template V Value type of the custom screens map
 * @param {Readonly<Record<string, V>> | undefined} screens - Custom screens
 * @returns {Record<string, string | V>} The merged map
 */
export const mergeScreens = <V>(
  screens: Readonly<Record<string, V>> | undefined,
): Record<string, string | V> => ({ ...defaultScreens, ...screens });

/**
 * Resolve the defaults of the options the typed tokens read; pure.
 * @param {StyleGeneratorOptions} [options] - Raw generator options
 * @returns {ResolvedTokenOptions} Breakpoints, screens, spacing and opacity steps with defaults applied
 */
export const resolveTokenOptions = (
  options: StyleGeneratorOptions = {},
): ResolvedTokenOptions => {
  const colors = options.coverage?.colors;
  return {
    breakpoints: options.breakpoints ?? DEFAULT_BREAKPOINTS,
    screens: mergeScreens(options.screens),
    spacing: {
      enabled: options.spacing?.enabled !== false,
      properties: options.spacing?.properties ?? DEFAULT_SPACING_PROPERTIES,
    },
    opacities:
      typeof colors === "object" && colors.opacities
        ? colors.opacities
            .filter((step): step is number => typeof step === "number")
            .sort((a, b) => a - b)
        : [],
  };
};
