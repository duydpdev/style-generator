import type {
  StyleGeneratorOptions,
  SpacingPropertyMap,
} from "../../core/Options";
import { DEFAULT_SPACING_PROPERTIES } from "../../shared/defaultOption";

/**
 * Generate the `@source inline(...)` directives that cover classes
 * Tailwind's static candidate scan can never see on its own: every `sp-*`
 * utility the spacing pipeline can produce, plus any caller-supplied
 * `options.extraSources` entries (see `StyleGeneratorOptions.extraSources`).
 *
 * The `sp-*` line uses Tailwind's `{a,b,c}` brace-expansion syntax rather
 * than one directive per key. Does NOT enumerate `md:sp-*`/other variants:
 * the breakpoint fallback chain already lives inside each `@utility
 * sp-<key>` block (see `generateSpacingCss`), so a variant is only needed
 * at the actual call site where a consumer uses it, not pre-declared here.
 *
 * `extraSources` entries are assumed already validated (`generate()` runs
 * that validation before calling this) and are emitted verbatim, one
 * `@source inline("<entry>")` line each, after the `sp-*` line.
 *
 * Scoped to spacing + `extraSources` only; other categories get their own
 * `@source inline` coverage in a later phase.
 * @param {StyleGeneratorOptions} [options] - Generator options
 * @returns {string} One `@source inline(...)` directive per line, empty when there is nothing to emit
 */
export const generateSourceInline = (
  options: StyleGeneratorOptions = {},
): string => {
  const lines: string[] = [];

  if (options.spacing?.enabled !== false) {
    const spacingProps: SpacingPropertyMap =
      options.spacing?.properties ?? DEFAULT_SPACING_PROPERTIES;
    const spacingKeys = Object.keys(spacingProps);

    if (spacingKeys.length > 0) {
      lines.push(`@source inline("sp-{${spacingKeys.join(",")}}");`);
    }
  }

  for (const entry of options.extraSources ?? []) {
    lines.push(`@source inline("${entry}");`);
  }

  return lines.length > 0 ? `${lines.join("\n")}\n` : "";
};
