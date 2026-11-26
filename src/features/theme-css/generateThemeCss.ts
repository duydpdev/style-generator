import type { StyleGeneratorOptions } from "../../core/Options";
import { forEachAxisVariant } from "../../core/forEachAxisVariant";
import { prepareGenerate } from "../../core/prepareGenerate";
import type { ResolvedOptions } from "../../core/resolveOptions";
import type { ThemeConfig, ThemeOverride } from "../../core/themeSchema";
import { axisAttributeName } from "../../shared/axisAttributeName";
import { cssBlock } from "../../shared/cssBlock";
import { toKebabCase } from "../../shared/helpers";
import { cssVarCategories } from "../registry/builtInCategories";
import { flattenByCategory } from "../registry/flattenByCategory";

// `--sg-*` variables of every CSS-var category in a base theme or axis override.
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

// A CSS rule block of the variables, or `""` when there are none.
const formatCssBlock = (
  selector: string,
  vars: Record<string, string>,
): string => {
  if (Object.keys(vars).length === 0) return "";
  const lines = Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n");
  return cssBlock(selector, lines);
};

// `@theme inline` mapping of the base theme's `--sg-*` vars into Tailwind namespaces.
const buildThemeMapping = (config: ThemeConfig): Record<string, string> => {
  const mapping: Record<string, string> = {};

  for (const category of cssVarCategories) {
    if (!category.themeNamespace) continue;
    const varPrefix = `--${category.cssVarPrefix}-`;
    const vars = flattenByCategory(category, config[category.key]);

    const percent = category.themeValue === "percent";
    for (const varName of Object.keys(vars)) {
      const key = varName.slice(varPrefix.length);
      mapping[`${category.themeNamespace}${key}`] = percent
        ? `calc(var(${varName}) * 100%)`
        : `var(${varName})`;
    }
  }

  return mapping;
};

// Fixed emit order, so duplicates and the written order do not change the CSS.
const RESET_LINES = [
  ["colors", "  --color-*: initial;"],
  ["radius", "  --radius-*: initial;"],
  ["shadow", "  --shadow-*: initial;"],
] as const;

/**
 * Generates the `:root` `--sg-*` variables, one `html[data-<axis>="<variant>"]`
 * block per `themeAxes` variant, then `@theme inline`. Parses options, then the
 * theme, like `generate()`: invalid input throws a `ZodError`.
 * @param {ThemeConfig} config - Theme configuration
 * @param {StyleGeneratorOptions} [options] - Generator options; only `resetTailwindDefaults` affects this output
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
 * {@link generateThemeCss} without validation, for `generate()`, which has already parsed both.
 * @param {ThemeConfig} config - Theme already parsed by `ThemeSchema`
 * @param {Pick<ResolvedOptions, "resetTailwindDefaults">} options - Resolved options
 * @returns {string} CSS string
 */
export const buildThemeCss = (
  config: ThemeConfig,
  options: Pick<ResolvedOptions, "resetTailwindDefaults">,
): string => {
  const blocks: string[] = [];

  // 1. :root with intermediate vars
  const rootVars = buildIntermediateVars(config);
  const rootBlock = formatCssBlock(":root", rootVars);
  if (rootBlock) blocks.push(rootBlock);

  // 2. Axis override blocks, in declaration order (axis, then variant)
  forEachAxisVariant(config.themeAxes, (axisName, variantName, override) => {
    const overrideVars = buildIntermediateVars(override);
    const selector = `html[${axisAttributeName(axisName)}="${toKebabCase(variantName)}"]`;
    const overrideBlock = formatCssBlock(selector, overrideVars);
    if (overrideBlock) blocks.push(overrideBlock);
  });

  // 3. @theme inline: resets first (they wipe the namespace), then the base mapping
  const lines = [
    ...RESET_LINES.filter(([name]) =>
      options.resetTailwindDefaults.includes(name),
    ).map(([, line]) => line),
    ...Object.entries(buildThemeMapping(config)).map(
      ([k, v]) => `  ${k}: ${v};`,
    ),
  ];
  if (lines.length > 0) {
    blocks.push(cssBlock("@theme inline", lines.join("\n")));
  }

  return blocks.join("\n\n") + "\n";
};
