import {
  DEFAULT_BREAKPOINTS,
  DEFAULT_SPACING_PROPERTIES,
} from "../shared/defaultOption";

import { defaultScreens } from "./Options";
import type { SpacingPropertyMap, StyleGeneratorOptions } from "./Options";

/**
 * The options the typed tokens read, with their defaults applied. A module of
 * its own so the browser-safe `./tokens` entry does not pull the rest of
 * `resolveOptions` (coverage, breakpoint sorting) into its bundle;
 * `ResolvedOptions` extends it.
 */
export interface ResolvedTokenOptions {
  /** `options.breakpoints`, else `DEFAULT_BREAKPOINTS`. */
  breakpoints: readonly string[];
  /** The px `defaultScreens` overridden/extended by `options.screens`. */
  screens: Readonly<Record<string, string>>;
  spacing: { enabled: boolean; properties: SpacingPropertyMap };
}

/**
 * Merge the library's px `defaultScreens` with a custom screens map.
 * Generic so the options validator can merge a not-yet-validated map too.
 * @template V Value type of the custom screens map
 * @param {Readonly<Record<string, V>> | undefined} screens - Custom screens
 * @returns {Record<string, string | V>} The merged map
 */
export const mergeScreens = <V>(
  screens: Readonly<Record<string, V>> | undefined,
): Record<string, string | V> => ({ ...defaultScreens, ...screens });

/**
 * Resolve the defaults of the options the typed tokens read. Pure; expects
 * options that already passed `StyleGeneratorOptionsSchema`.
 * @param {StyleGeneratorOptions} [options] - Raw generator options
 * @returns {ResolvedTokenOptions} Breakpoints, screens and spacing with defaults applied
 */
export const resolveTokenOptions = (
  options: StyleGeneratorOptions = {},
): ResolvedTokenOptions => ({
  breakpoints: options.breakpoints ?? DEFAULT_BREAKPOINTS,
  screens: mergeScreens(options.screens),
  spacing: {
    enabled: options.spacing?.enabled !== false,
    properties: options.spacing?.properties ?? DEFAULT_SPACING_PROPERTIES,
  },
});
