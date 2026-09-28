import type {
  StyleGeneratorOptions,
  SpacingPropertyMap,
} from "../../core/Options";
import { DEFAULT_SPACING_PROPERTIES } from "../../shared/defaultOption";

/**
 * Generate a `@source inline(...)` directive covering every `sp-*` utility
 * class the spacing pipeline can produce, so Tailwind v4 emits every
 * `@utility sp-<key>` even when the consuming app's real candidate scan
 * (file globs) never contains a literal `sp-<key>` string — e.g. the class
 * is built at runtime via `resolveSpacing`/`resolveSpacingProps` and never
 * appears as source text anywhere.
 *
 * Emits a single directive using Tailwind's `{a,b,c}` brace-expansion
 * syntax rather than one directive per key. Does NOT enumerate
 * `md:sp-*`/other variants: the breakpoint fallback chain already lives
 * inside each `@utility sp-<key>` block (see `generateSpacingCss`), so a
 * variant is only needed at the actual call site where a consumer uses
 * it, not pre-declared here.
 *
 * Scoped to spacing only (`sp-*`); other categories/modules get their own
 * `@source inline` coverage in a later phase.
 * @param {StyleGeneratorOptions} [options] - Generator options
 * @returns {string} `@source inline("sp-{...}");` directive, empty when spacing generation is disabled or has no properties
 */
export const generateSourceInline = (
  options: StyleGeneratorOptions = {},
): string => {
  if (options.spacing?.enabled === false) return "";

  const spacingProps: SpacingPropertyMap =
    options.spacing?.properties ?? DEFAULT_SPACING_PROPERTIES;
  const spacingKeys = Object.keys(spacingProps);

  if (spacingKeys.length === 0) return "";

  return `@source inline("sp-{${spacingKeys.join(",")}}");\n`;
};
