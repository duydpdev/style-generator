import type { StyleGeneratorOptions } from "../../core/Options";
import { prepareGenerate } from "../../core/prepareGenerate";
import type { ResolvedOptions } from "../../core/resolveOptions";
import type { ThemeConfig, ThemeOverride } from "../../core/themeSchema";
import { axisAttributeName } from "../../shared/axisAttributeName";
import { toKebabCase } from "../../shared/helpers";
import { cssVarCategories } from "../registry/builtInCategories";
import { flattenByCategory } from "../registry/flattenByCategory";

/**
 * Build intermediate `--sg-*` CSS variables for every registered category
 * present on the given theme source (base theme or a `themeAxes.<axis>.<variant>` override).
 * @param {ThemeOverride} source - Theme source data (a base `ThemeConfig` is structurally assignable)
 * @returns {Record<string, string>} CSS variable map
 */
const buildIntermediateVars = (
  source: ThemeOverride,
): Record<string, string> => {
  return cssVarCategories.reduce<Record<string, string>>(
    (acc, category) => ({
      ...acc,
      ...flattenByCategory(category, source[category.key]),
    }),
    {},
  );
};

/**
 * Format a CSS variable map into a CSS rule block.
 * @param {string} selector - CSS selector
 * @param {Record<string, string>} vars - CSS variable map
 * @returns {string} Formatted CSS block or empty string
 */
const formatCssBlock = (
  selector: string,
  vars: Record<string, string>,
): string => {
  if (Object.keys(vars).length === 0) return "";
  const lines = Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n");
  return `${selector} {\n${lines}\n}`;
};

/**
 * Map intermediate `--sg-*` vars to Tailwind v4 `\@theme` namespace vars.
 * Each category is flattened from its OWN theme data: every category owns a
 * distinct `--sg-<category>-` prefix (`--sg-color-`, `--sg-shadow-`, …), so
 * its vars are sliced by that prefix.
 * @param {ThemeConfig} config - Theme configuration (base theme only)
 * @returns {Record<string, string>} Tailwind v4 theme mapping
 */
const buildThemeMapping = (config: ThemeConfig): Record<string, string> => {
  const mapping: Record<string, string> = {};

  for (const category of cssVarCategories) {
    if (!category.themeNamespace) continue;
    const varPrefix = `--${category.cssVarPrefix}-`;
    const vars = flattenByCategory(category, config[category.key]);

    for (const varName of Object.keys(vars)) {
      const key = varName.slice(varPrefix.length);
      mapping[`${category.themeNamespace}${key}`] = `var(${varName})`;
    }
  }

  return mapping;
};

/**
 * `resetTailwindDefaults` name → its `@theme inline` line, in the fixed
 * order they are emitted (so duplicates and the written order do not change
 * the CSS).
 */
const RESET_LINES = [
  ["colors", "  --color-*: initial;"],
  ["radius", "  --radius-*: initial;"],
  ["shadow", "  --shadow-*: initial;"],
] as const;

/**
 * Generate a complete CSS string for Tailwind v4 `\@theme` integration.
 *
 * Output includes:
 * 1. `:root` block with `--sg-*` intermediate CSS variables
 * 2. `html[data-<axis-kebab>="<variant-kebab>"]` blocks for each `themeAxes`
 *    axis/variant, in config declaration order (both axes and variants) —
 *    the selector is pinned to `html` by default because a `$`-alias
 *    `var()` resolves to the value computed at the element that DECLARES the
 *    custom property, so an override on a non-root element wouldn't affect
 *    an alias's inherited value (see `.claude/CLAUDE.md`'s Theme rules).
 *    `options.axes` renames the attribute per axis and, with
 *    `scope: "element"`, drops the `html` anchor (guarded by an alias check)
 * 3. `\@theme inline` block: the `resetTailwindDefaults` lines
 *    (`--color-*: initial;`, …) first, then the mapping of `--sg-*` → Tailwind v4 namespaces
 *
 * Parses `options` and `config` like `generate()` — options first — so an
 * invalid or injection-unsafe option or theme throws a `ZodError` instead of
 * reaching the CSS.
 * @param {ThemeConfig} config - Theme configuration
 * @param {StyleGeneratorOptions} [options] - Generator options; only `axes` and `resetTailwindDefaults` affect this output
 * @returns {string} CSS string
 */
export const generateThemeCss = (
  config: ThemeConfig,
  options?: StyleGeneratorOptions,
): string => {
  const { parsed, resolved } = prepareGenerate(config, options);
  return buildThemeCss(parsed, resolved);
};

/**
 * {@link generateThemeCss} without validation, for `generate()`, which has
 * already parsed the theme and the options. Not exported from any public
 * barrel.
 * @param {ThemeConfig} config - Theme already parsed by `ThemeSchema`
 * @param {Pick<ResolvedOptions, "axes" | "resetTailwindDefaults">} options - Resolved options (`axes`: attribute map and scope; `resetTailwindDefaults`: namespaces to clear)
 * @returns {string} CSS string
 */
export const buildThemeCss = (
  config: ThemeConfig,
  options: Pick<ResolvedOptions, "axes" | "resetTailwindDefaults">,
): string => {
  const blocks: string[] = [];

  // 1. :root with intermediate vars
  const rootVars = buildIntermediateVars(config);
  const rootBlock = formatCssBlock(":root", rootVars);
  if (rootBlock) blocks.push(rootBlock);

  // 2. Axis override blocks, in declaration order (axis, then variant)
  const { attribute, scope } = options.axes;
  const anchor = scope === "root" ? "html" : "";
  if (config.themeAxes) {
    for (const [axisName, variants] of Object.entries(config.themeAxes)) {
      for (const [variantName, override] of Object.entries<ThemeOverride>(
        variants,
      )) {
        const overrideVars = buildIntermediateVars(override);
        const selector = `${anchor}[${axisAttributeName(axisName, attribute)}="${toKebabCase(variantName)}"]`;
        const overrideBlock = formatCssBlock(selector, overrideVars);
        if (overrideBlock) blocks.push(overrideBlock);
      }
    }
  }

  // 3. @theme inline: the Tailwind default resets first (they wipe the
  // namespace, so anything declared after them survives), then the mapping
  // (only base theme vars, not overrides)
  const lines = [
    ...RESET_LINES.filter(([name]) =>
      options.resetTailwindDefaults.includes(name),
    ).map(([, line]) => line),
    ...Object.entries(buildThemeMapping(config)).map(
      ([k, v]) => `  ${k}: ${v};`,
    ),
  ];
  if (lines.length > 0) {
    blocks.push(`@theme inline {\n${lines.join("\n")}\n}`);
  }

  return blocks.join("\n\n") + "\n";
};
