import type { ThemeConfig, ThemeOverride } from "../../core/themeSchema";
import { builtInCategories } from "../registry/builtInCategories";
import { flattenByCategory } from "../registry/flattenByCategory";

/**
 * Build intermediate `--sg-*` CSS variables for every registered category
 * present on the given theme source (base theme or a `themes` override).
 * @param {ThemeOverride} source - Theme source data (a base `ThemeConfig` is structurally assignable)
 * @returns {Record<string, string>} CSS variable map
 */
const buildIntermediateVars = (
  source: ThemeOverride,
): Record<string, string> => {
  return builtInCategories.reduce<Record<string, string>>(
    (acc, category) => ({
      ...acc,
      ...flattenByCategory(category, category.select?.(source)),
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
 * Each category is flattened from its OWN theme data: prefix-matching a
 * merged var map would misroute vars, because the colors prefix `--sg-` is
 * also a prefix of `--sg-shadow-*`, `--sg-radius-*` and `--sg-backdrop-blur-*`.
 * @param {ThemeConfig} config - Theme configuration (base theme only)
 * @returns {Record<string, string>} Tailwind v4 theme mapping
 */
const buildThemeMapping = (config: ThemeConfig): Record<string, string> => {
  const mapping: Record<string, string> = {};

  for (const category of builtInCategories) {
    if (!category.cssVarPrefix || !category.themeNamespace) continue;
    const varPrefix = `--${category.cssVarPrefix}-`;
    const vars = flattenByCategory(category, category.select?.(config));

    for (const varName of Object.keys(vars)) {
      const key = varName.slice(varPrefix.length);
      mapping[`${category.themeNamespace}${key}`] = `var(${varName})`;
    }
  }

  return mapping;
};

/**
 * Generate a complete CSS string for Tailwind v4 `\@theme` integration.
 *
 * Output includes:
 * 1. `:root` block with `--sg-*` intermediate CSS variables
 * 2. `[data-theme="<name>"]` blocks for each theme override
 * 3. `\@theme inline` block mapping `--sg-*` → Tailwind v4 namespaces
 * @param {ThemeConfig} config - Theme configuration
 * @returns {string} CSS string
 */
export const generateThemeCss = (config: ThemeConfig): string => {
  const blocks: string[] = [];

  // 1. :root with intermediate vars
  const rootVars = buildIntermediateVars(config);
  const rootBlock = formatCssBlock(":root", rootVars);
  if (rootBlock) blocks.push(rootBlock);

  // 2. Theme overrides
  if (config.themes) {
    for (const [name, override] of Object.entries<ThemeOverride>(
      config.themes,
    )) {
      const overrideVars = buildIntermediateVars(override);
      const overrideBlock = formatCssBlock(
        `[data-theme="${name}"]`,
        overrideVars,
      );
      if (overrideBlock) blocks.push(overrideBlock);
    }
  }

  // 3. @theme inline mapping (only base theme vars, not overrides)
  const themeMapping = buildThemeMapping(config);
  if (Object.keys(themeMapping).length > 0) {
    const lines = Object.entries(themeMapping)
      .map(([k, v]) => `  ${k}: ${v};`)
      .join("\n");
    blocks.push(`@theme inline {\n${lines}\n}`);
  }

  return blocks.join("\n\n") + "\n";
};
