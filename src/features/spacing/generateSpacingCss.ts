import type {
  StyleGeneratorOptions,
  SpacingPropertyMap,
} from "../../core/Options";
import { defaultScreens } from "../../core/Options";
import { DEFAULT_SPACING_PROPERTIES } from "../../shared/defaultOption";

interface SortedBreakpoint {
  key: string;
  value: string;
  numericValue: number;
}

/**
 * Resolve the ascending breakpoint list to generate fallback chains for.
 * Empty when `enableResponsive` is `false` — no `@media`/`@property`
 * breakpoint variants are emitted in that case, only the base value.
 * @param {StyleGeneratorOptions} options - Generator options
 * @returns {SortedBreakpoint[]} Ascending breakpoints (by resolved width)
 */
const resolveSortedBreakpoints = (
  options: StyleGeneratorOptions,
): SortedBreakpoint[] => {
  if (options.enableResponsive === false) return [];

  const breakpointKeys = options.breakpoints ?? ["md", "lg"];
  const mergedScreens: Record<string, string> = {
    ...defaultScreens,
    ...options.screens,
  };

  return breakpointKeys
    .map((bp) => {
      const value = mergedScreens[bp];
      return value === undefined
        ? undefined
        : { key: bp, value, numericValue: Number.parseInt(value, 10) };
    })
    .filter((entry): entry is SortedBreakpoint => entry !== undefined)
    .sort((a, b) => a.numericValue - b.numericValue);
};

/**
 * Build the ascending `var(--sg-sp-<key>-<bp>, ...)` fallback chain for a
 * spacing key up to (and including) `uptoIndex` in `sortedBreakpoints`.
 * Every level accumulates every narrower breakpoint on top of the base
 * value: range media queries (`width >= X`) can be simultaneously true at
 * a given viewport width, so the LAST matching `@media` block wins by
 * source order — its declaration must therefore carry the full chain
 * rather than only its own override, or a wider viewport could silently
 * fall back past a narrower breakpoint's value.
 * @param {string} key - Spacing property key (e.g. `"p"`)
 * @param {SortedBreakpoint[]} sortedBreakpoints - Ascending breakpoints
 * @param {number} uptoIndex - Inclusive index into `sortedBreakpoints`
 * @returns {string} `var(--sg-sp-<key>...)` fallback chain
 */
const buildFallbackChain = (
  key: string,
  sortedBreakpoints: SortedBreakpoint[],
  uptoIndex: number,
): string => {
  let chain = `var(--sg-sp-${key})`;
  for (let j = 0; j <= uptoIndex; j++) {
    const bp = sortedBreakpoints[j];
    if (bp === undefined) continue;
    chain = `var(--sg-sp-${key}-${bp.key}, ${chain})`;
  }
  return chain;
};

/**
 * Build one `@utility sp-<key> { ... }` block: base declarations reference
 * `var(--sg-sp-<key>)` directly, followed by one nested `@media (width >=
 * ...)` per declared breakpoint holding the accumulated fallback chain.
 * No bare selector is ever emitted — Tailwind's variant engine only picks
 * up `hover:`/`md:` modifiers on classes defined via `@utility`.
 * @param {string} key - Spacing property key
 * @param {Record<string, string>} cssProps - CSS property → `var()` template map for this key
 * @param {SortedBreakpoint[]} sortedBreakpoints - Ascending breakpoints (empty when responsive is disabled)
 * @returns {string} `@utility sp-<key> { ... }` block
 */
const buildUtilityBlock = (
  key: string,
  cssProps: Record<string, string>,
  sortedBreakpoints: SortedBreakpoint[],
): string => {
  const cssPropNames = Object.keys(cssProps);
  const baseSection = cssPropNames
    .map((cssProp) => `  ${cssProp}: var(--sg-sp-${key});`)
    .join("\n");

  const mediaSections = sortedBreakpoints.map((bp, i) => {
    const chain = buildFallbackChain(key, sortedBreakpoints, i);
    const lines = cssPropNames
      .map((cssProp) => `    ${cssProp}: ${chain};`)
      .join("\n");
    return `  @media (width >= ${bp.value}) {\n${lines}\n  }`;
  });

  return `@utility sp-${key} {\n${[baseSection, ...mediaSections].join("\n\n")}\n}`;
};

/**
 * Build `@property --sg-sp-<key>[-<bp>] { syntax: "*"; inherits: false; }`
 * for a spacing key: the base var plus every declared breakpoint variant.
 * Deliberately has no `initial-value` — an unregistered custom property
 * with `syntax: "*"` and no `initial-value` is guaranteed-invalid at
 * computed-value time when unset, which is what makes the `var(--x,
 * fallback)` chain fall through to its fallback instead of resolving to
 * an empty string (the root cause of the pre-fix bug this block replaces).
 * @param {string} key - Spacing property key
 * @param {SortedBreakpoint[]} sortedBreakpoints - Ascending breakpoints (empty when responsive is disabled)
 * @returns {string[]} One `@property` block per (key, base|breakpoint) pair
 */
const buildPropertyBlocks = (
  key: string,
  sortedBreakpoints: SortedBreakpoint[],
): string[] => {
  const names = [
    `--sg-sp-${key}`,
    ...sortedBreakpoints.map((bp) => `--sg-sp-${key}-${bp.key}`),
  ];
  return names.map(
    (name) => `@property ${name} {\n  syntax: "*";\n  inherits: false;\n}`,
  );
};

/**
 * Generate static CSS for `.sp-*` spacing utilities — replaces the old
 * JS-plugin `generateSpacingRules` (`api.addBase` + `api.addUtilities`).
 * Each `.sp-<key>` is emitted as `@utility sp-<key> { ... }` (never a bare
 * `.class {}` rule) so Tailwind's variant engine still applies
 * `hover:`/`md:` modifiers to it from raw CSS-text input.
 *
 * D8 fix (DEV.2.5): no global `*` rule / `@layer base` — each utility owns
 * its full breakpoint fallback chain inline — and every `--sg-sp-<key>[-<bp>]`
 * var is registered via `@property` so it participates correctly in the
 * cascade instead of leaking a parent's value into children via
 * unregistered custom-property inheritance.
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
  const sortedBreakpoints = resolveSortedBreakpoints(options);

  const utilityBlocks = spacingKeys.flatMap((key) => {
    const cssProps = spacingProps[key];
    return cssProps === undefined
      ? []
      : [buildUtilityBlock(key, cssProps, sortedBreakpoints)];
  });
  const propertyBlocks = spacingKeys.flatMap((key) =>
    buildPropertyBlocks(key, sortedBreakpoints),
  );

  return [...utilityBlocks, ...propertyBlocks].join("\n\n") + "\n";
};
