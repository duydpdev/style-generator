import { ThemeConfig, StyleGeneratorOptions } from "../types";
import { toKebabCase } from "../utils";
import {
  DEFAULT_LAYOUT_CLASSES,
  DEFAULT_ROUNDED_VALUES,
  DEFAULT_BORDER_VALUES,
  DEFAULT_OPACITY_VALUES,
  DEFAULT_ZINDEX_VALUES,
  roundedProperties,
  borderProperties,
} from "../constants";

/**
 * Generates a list of safelisted classes based on the theme configuration.
 * NOTE: Spacing is NOT included — it uses CSS custom properties (see createStylePlugin).
 * @param {ThemeConfig} config - Theme configuration
 * @param {StyleGeneratorOptions} options - Generator options
 * @returns {string[]} Array of class names to safelist
 */
export const generateSafelist = (
  config: ThemeConfig,
  options: StyleGeneratorOptions = {},
): string[] => {
  const { colors, typography, shadows, backDropBlurs, borderRadius } = config;

  const { enableResponsive = true, responsiveModules = ["layout", "rounded"] } =
    options;

  // Build responsive prefixes from breakpoint keys
  const breakpointKeys = options.breakpoints ?? ["md", "lg"];
  const responsivePrefixes = enableResponsive
    ? breakpointKeys.map((b) => `${b}:`)
    : [];

  const safelist: string[] = [];

  /**
   * Push class combinations to safelist with optional responsive variants.
   * @param {string} moduleName - Module name (used to check responsive inclusion)
   * @param {string[]} props - Property prefixes or full class names
   * @param {Array<string | number>} values - Values to combine with properties
   * @param {boolean} isClassOnly - If true, push props as-is without combining with values
   */
  const pushClasses = (
    moduleName: string,
    props: readonly string[],
    values: readonly (string | number)[],
    isClassOnly = false,
  ) => {
    const generate = (prefix: string) => {
      // Skip responsive generation if module is not in responsiveModules
      if (prefix && !responsiveModules.includes(moduleName as never)) return;

      if (isClassOnly) {
        for (const cls of props) {
          safelist.push(`${prefix}${cls}`);
        }
      } else {
        for (const prop of props) {
          for (const val of values) {
            safelist.push(`${prefix}${prop}-${String(val)}`);
          }
        }
      }
    };

    // Always generate base classes
    generate("");

    // Generate responsive variants
    for (const prefix of responsivePrefixes) {
      generate(prefix);
    }
  };

  // --- 1. Layout (display, flex, align, justify, text-align) ---
  if (options.layout?.enabled !== false) {
    const classes = options.layout?.values ?? [...DEFAULT_LAYOUT_CLASSES];
    pushClasses("layout", classes, [], true);
  }

  // --- 2. Rounded ---
  if (options.rounded?.enabled !== false) {
    const values = [
      ...(options.rounded?.values ?? [...DEFAULT_ROUNDED_VALUES]),
      ...Object.keys(borderRadius ?? {}),
    ];
    const props = options.rounded?.properties ?? roundedProperties;
    pushClasses("rounded", props, [...new Set(values)]);
  }

  // --- 3. Border widths ---
  if (options.border?.enabled !== false) {
    const values = options.border?.values ?? [...DEFAULT_BORDER_VALUES];
    const props = options.border?.properties ?? borderProperties;
    pushClasses("borders", props, values);
  }

  // --- 4. Colors (text, bg, border for each custom color key) ---
  const colorKeys = [
    ...Object.keys(colors.text),
    ...Object.keys(colors.base),
  ].map((k) => toKebabCase(k));

  const generateColorClasses = (prefix: string) => {
    if (prefix && !responsiveModules.includes("colors" as never)) return;
    colorKeys.forEach((color) => {
      safelist.push(
        `${prefix}text-${color}`,
        `${prefix}bg-${color}`,
        `${prefix}border-${color}`,
      );
    });
  };

  generateColorClasses("");
  for (const prefix of responsivePrefixes) {
    generateColorClasses(prefix);
  }

  // --- 5. Typography (custom utility classes) ---
  const typographyKeys = Object.keys(typography);
  pushClasses("typography", typographyKeys.map(toKebabCase), [], true);

  // --- 6. Box shadows ---
  const shadowKeys = Object.keys(shadows ?? {});
  pushClasses("shadows", ["shadow"], shadowKeys);

  // --- 7. Backdrop blur ---
  const blurKeys = Object.keys(backDropBlurs ?? {});
  pushClasses("backdrop", ["backdrop-blur"], blurKeys);

  // --- 8. Opacity ---
  if (options.opacity?.enabled !== false) {
    const opacityValues = options.opacity?.values ?? [
      ...DEFAULT_OPACITY_VALUES,
    ];
    pushClasses("opacity", ["opacity"], opacityValues);
  }

  // --- 9. Z-Index ---
  if (options.zIndex?.enabled !== false) {
    const zIndexValues = options.zIndex?.values ?? [...DEFAULT_ZINDEX_VALUES];
    pushClasses("zIndex", ["z"], zIndexValues);
  }

  // --- 10. User-defined dynamic classes ---
  if (options.dynamicClasses) {
    safelist.push(...options.dynamicClasses);
  }

  // Deduplicate
  return [...new Set(safelist)];
};
