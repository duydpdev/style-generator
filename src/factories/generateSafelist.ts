import { ThemeConfig, StyleGeneratorOptions, StyleModule } from "../types";
import { toKebabCase } from "../utils";
import {
  roundedOptionBase,
  borderOption,
  spacingOption,
  opacityOption,
  zIndexOption,
  spacingProperties,
  displayClasses,
  flexClasses,
  alignClasses,
  justifyClasses,
  selfClasses,
  contentClasses,
  textAlignClasses,
  roundedProperties,
  borderProperties,
} from "../constants";

/**
 * Generates a list of safelisted classes based on the theme configuration.
 * @param {ThemeConfig} config - Theme configuration
 * @param {StyleGeneratorOptions} options - Generator options
 * @returns {string[]} Array of class names
 */
export const generateSafelist = (
  config: ThemeConfig,
  options: StyleGeneratorOptions = {},
): string[] => {
  const { colors, typography, shadows, backDropBlurs, borderRadius } = config;

  // --- Helpers ---

  const {
    modules,
    responsiveModules = ["spacing", "layout", "typography", "rounded"],
  } = options;

  const shouldGenerate = (moduleName: StyleModule) => {
    return !modules || modules.includes(moduleName);
  };

  const shouldGenerateResponsive = (moduleName: StyleModule) => {
    return (
      shouldGenerate(moduleName) &&
      (responsiveModules.includes(moduleName) || !responsiveModules)
    );
    // Note: If responsiveModules IS defined (even empty), we respect it.
    // If it is undefined, we use the default provided above.
  };

  // Prefixes for responsive design
  const keysToUse = options.breakpoints ?? ["md", "lg"];
  const responsivePrefixes = keysToUse.map((b) => `${b}:`);

  const safelist: string[] = [];

  // Helper to push combinations
  const pushClasses = (
    moduleName: StyleModule,
    props: readonly string[],
    values: readonly (string | number)[],
    isClassOnly = false,
  ) => {
    if (!shouldGenerate(moduleName)) return;

    const generate = (prefix: string) => {
      // If prefix is not empty (responsive), check if this module allows responsive
      if (prefix && !shouldGenerateResponsive(moduleName)) return;

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

    // Always generate base classes (empty prefix)
    generate("");

    // Generate responsive classes
    for (const prefix of responsivePrefixes) {
      generate(prefix);
    }
  };

  // --- 1. Spacing ---
  // Generates spacing classes (m, p, mx, my, etc.) combined with spacing options.
  pushClasses("spacing", spacingProperties, spacingOption);

  // --- 2. Layout ---
  const layoutGroups = [
    displayClasses,
    flexClasses,
    alignClasses,
    justifyClasses,
    selfClasses,
    contentClasses,
    textAlignClasses,
  ];

  layoutGroups.forEach((group) => {
    pushClasses("layout", group, [], true);
  });

  // --- 3. Rounded ---
  const roundedValues = [
    ...roundedOptionBase,
    ...Object.keys(borderRadius ?? {}),
  ];
  pushClasses("rounded", roundedProperties, roundedValues);

  // --- 4. Typography ---
  const typographyKeys = Object.keys(typography);
  pushClasses("typography", typographyKeys.map(toKebabCase), [], true);

  // --- 5. Borders ---
  const borderValues = borderOption;
  pushClasses("borders", borderProperties, borderValues);

  // --- 6. Colors ---
  const colorKeys = [
    ...Object.keys(colors.text),
    ...Object.keys(colors.base),
  ].map((k) => toKebabCase(k));

  if (shouldGenerate("colors")) {
    const generateColorClasses = (prefix: string) => {
      if (prefix && !shouldGenerateResponsive("colors")) return;
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
  }

  // --- 7. Shadows ---
  const shadowKeys = Object.keys(shadows ?? {});
  pushClasses("shadows", ["shadow"], shadowKeys);

  // --- 8. Backdrop ---
  const blurKeys = Object.keys(backDropBlurs ?? {});
  pushClasses("backdrop", ["backdrop-blur"], blurKeys);

  // --- 9. Opacity ---
  const opacityValues = opacityOption;
  pushClasses("opacity", ["opacity"], opacityValues);

  // --- 10. Z-Index ---
  const zIndexValues = zIndexOption;
  pushClasses("zIndex", ["z"], zIndexValues);

  return safelist;
};
