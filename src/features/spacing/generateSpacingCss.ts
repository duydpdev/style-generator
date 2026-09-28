import {
  StyleGeneratorOptions,
  SpacingPropertyMap,
  defaultScreens,
} from "../../core/Options";
import { DEFAULT_SPACING_PROPERTIES } from "../../shared/defaultOption";

interface SortedBreakpoint {
  key: string;
  value: string;
  numericValue: number;
}

/**
 * Build the `@layer base { * { --tw-sp-<key>: ... } \@media (...) { * {...} } }`
 * block. Intentionally reproduces the pre-registry `--tw-sp-*`/`*` var chain
 * exactly as-is (including its known bug) — DEV.2 scope only, fixed in
 * DEV.2.5.
 * @param {string[]} spacingKeys - Spacing property keys (e.g. `["p", "px", ...]`)
 * @param {SortedBreakpoint[]} sortedBreakpoints - Ascending breakpoints (empty when responsive is disabled)
 * @returns {string} `@layer base { ... }` block
 */
const buildBaseLayer = (
  spacingKeys: string[],
  sortedBreakpoints: SortedBreakpoint[],
): string => {
  const rootLines = spacingKeys.map(
    (key) => `    --tw-sp-${key}: var(--sp-${key});`,
  );
  const sections = [`  * {\n${rootLines.join("\n")}\n  }`];

  for (let i = 0; i < sortedBreakpoints.length; i++) {
    const bp = sortedBreakpoints[i];
    const lines = spacingKeys.map((key) => {
      let chain = `var(--sp-${key})`;
      for (let j = 0; j <= i; j++) {
        const iterBp = sortedBreakpoints[j];
        chain = `var(--sp-${key}-${iterBp.key}, ${chain})`;
      }
      return `      --tw-sp-${key}: ${chain};`;
    });
    sections.push(
      `  @media (min-width: ${bp.value}) {\n    * {\n${lines.join("\n")}\n    }\n  }`,
    );
  }

  return `@layer base {\n${sections.join("\n")}\n}`;
};

/**
 * Generate static CSS for `.sp-*` spacing utilities — replaces the old
 * JS-plugin `generateSpacingRules` (`api.addBase` + `api.addUtilities`).
 * Preserves the exact pre-registry output, bug-for-bug (DEV.2 scope; the
 * `--tw-sp-*` chain gets its real fix in DEV.2.5). Each `.sp-<key>` is
 * emitted as `@utility sp-<key> { ... }` (never a bare `.class {}` rule) so
 * Tailwind's variant engine still applies `hover:`/`md:` modifiers to it
 * from raw CSS-text input.
 *
 * Note: `options.spacing.useMatchUtilities` (JIT arbitrary-value support,
 * e.g. `sp-p-[24px]`) has no static-CSS equivalent — it required the real
 * Tailwind JS plugin's `matchUtilities` API — and is out of scope here; it
 * is removed entirely in DEV.2 Task 3 alongside `spacing.ts`.
 * @param {StyleGeneratorOptions} [options] - Generator options
 * @returns {string} CSS string, empty when spacing generation is disabled
 */
export const generateSpacingCss = (
  options: StyleGeneratorOptions = {},
): string => {
  if (options.spacing?.enabled === false) return "";

  const spacingProps: SpacingPropertyMap =
    options.spacing?.properties ?? DEFAULT_SPACING_PROPERTIES;
  const spacingKeys = Object.keys(spacingProps);

  if (options.enableResponsive === false) {
    const utilityBlocks = spacingKeys.map((key) => {
      const lines = Object.keys(spacingProps[key]).map(
        (cssProp) => `  ${cssProp}: var(--sp-${key});`,
      );
      return `@utility sp-${key} {\n${lines.join("\n")}\n}`;
    });
    return utilityBlocks.join("\n\n") + "\n";
  }

  const breakpointKeys = options.breakpoints ?? ["md", "lg"];
  const mergedScreens: Record<string, string> = {
    ...defaultScreens,
    ...options.screens,
  };
  const sortedBreakpoints = breakpointKeys
    .filter((bp) => mergedScreens[bp])
    .map((bp) => ({
      key: bp,
      value: mergedScreens[bp],
      numericValue: Number.parseInt(mergedScreens[bp], 10),
    }))
    .sort((a, b) => a.numericValue - b.numericValue);

  const utilityBlocks = spacingKeys.map((key) => {
    const lines = Object.keys(spacingProps[key]).map(
      (cssProp) => `  ${cssProp}: var(--tw-sp-${key});`,
    );
    return `@utility sp-${key} {\n${lines.join("\n")}\n}`;
  });

  return (
    [buildBaseLayer(spacingKeys, sortedBreakpoints), ...utilityBlocks].join(
      "\n\n",
    ) + "\n"
  );
};
