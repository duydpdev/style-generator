import { StyleGeneratorOptions } from "../../core/Options";
import { ThemeConfig, ThemeOverride } from "../../core/ThemeConfig";
import { flattenToVars } from "../plugin/cssVariables";

/**
 * Generate intermediate CSS variables from theme config.
 * All values are stored as `--sg-*` intermediate vars.
 * @param {Partial<Pick<ThemeConfig, "colors">> & Pick<ThemeOverride, "shadows" | "backDropBlurs" | "borderRadius">} source - Theme source data
 * @returns {Record<string, string>} CSS variable map
 */
const buildIntermediateVars = (
  source: Partial<Pick<ThemeConfig, "colors">> &
    Pick<ThemeOverride, "shadows" | "backDropBlurs" | "borderRadius">,
): Record<string, string> => {
  return {
    ...(source.colors ? flattenToVars("sg", source.colors) : {}),
    ...(source.shadows ? flattenToVars("sg-shadow", source.shadows) : {}),
    ...(source.backDropBlurs
      ? flattenToVars("sg-backdrop-blur", source.backDropBlurs)
      : {}),
    ...(source.borderRadius
      ? flattenToVars("sg-radius", source.borderRadius)
      : {}),
  };
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
 * Colors → `--color-*`, shadows → `--shadow-*`, radius → `--radius-*`, backdrop-blur → `--backdrop-blur-*`.
 * @param {Record<string, string>} intermediateVars - Intermediate CSS variable map
 * @returns {Record<string, string>} Tailwind v4 theme mapping
 */
const buildThemeMapping = (
  intermediateVars: Record<string, string>,
): Record<string, string> => {
  const mapping: Record<string, string> = {};

  for (const varName of Object.keys(intermediateVars)) {
    // varName is like "--sg-primary", "--sg-shadow-sm", "--sg-radius-md", "--sg-backdrop-blur-sm"
    // Strip "--sg-" prefix to get the key
    const key = varName.slice(5); // "--sg-" is 5 chars → "primary", "shadow-sm", etc.

    if (key.startsWith("shadow-")) {
      mapping[`--${key}`] = `var(${varName})`;
    } else if (key.startsWith("backdrop-blur-")) {
      mapping[`--${key}`] = `var(${varName})`;
    } else if (key.startsWith("radius-")) {
      mapping[`--${key}`] = `var(${varName})`;
    } else {
      // Colors: key is "primary", "blue-500", etc.
      mapping[`--color-${key}`] = `var(${varName})`;
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
 * @param {StyleGeneratorOptions} _options - Generator options
 * @returns {string} CSS string
 */
export const generateThemeCss = (
  config: ThemeConfig,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _options: StyleGeneratorOptions = {},
): string => {
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
  const themeMapping = buildThemeMapping(rootVars);
  if (Object.keys(themeMapping).length > 0) {
    const lines = Object.entries(themeMapping)
      .map(([k, v]) => `  ${k}: ${v};`)
      .join("\n");
    blocks.push(`@theme inline {\n${lines}\n}`);
  }

  return blocks.join("\n\n") + "\n";
};
