import { InferSafelistClasses } from "../../core/inference";
import { ThemeConfig } from "../../core/ThemeConfig";
import { StyleGeneratorOptions } from "../../core/Options";
import { toKebabCase } from "../../shared/helpers";
import {
  DEFAULT_LAYOUT_CLASSES,
  DEFAULT_ROUNDED_VALUES,
  DEFAULT_BORDER_VALUES,
  DEFAULT_OPACITY_VALUES,
  DEFAULT_ZINDEX_VALUES,
} from "../../shared/defaultOption";
import {
  roundedProperties,
  borderProperties,
} from "../../shared/safelistProperties";

/**
 * Generates a list of safelisted classes based on the theme configuration.
 * NOTE: Spacing is NOT included — it uses CSS custom properties (see createStylePlugin).
 * @param {ThemeConfig} config - Theme configuration
 * @param {StyleGeneratorOptions | undefined} [options] - Generator options
 * @returns {InferSafelistClasses<ThemeConfig, StyleGeneratorOptions | undefined>[]} Typed safelist classes
 */
export const generateSafelist = <
  TTheme extends ThemeConfig,
  TOptions extends StyleGeneratorOptions | undefined = undefined,
>(
  config: TTheme,
  options?: TOptions,
): InferSafelistClasses<TTheme, TOptions>[] => {
  const { colors, typography, shadows, backDropBlurs, borderRadius, border } =
    config;

  const resolvedOptions: StyleGeneratorOptions =
    ((options ?? {}) as StyleGeneratorOptions | undefined) ?? {};

  const { enableResponsive = true, responsiveModules = ["layout", "rounded"] } =
    resolvedOptions;

  const breakpointKeys = resolvedOptions.breakpoints ?? ["md", "lg"];
  const responsivePrefixes = enableResponsive
    ? breakpointKeys.map((b: string) => `${b}:`)
    : [];

  const safelist: string[] = [];

  const pushClasses = (
    moduleName: string,
    props: readonly string[],
    values: readonly (string | number)[],
    isClassOnly = false,
  ) => {
    const generate = (prefix: string) => {
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

    generate("");
    for (const prefix of responsivePrefixes) {
      generate(prefix);
    }
  };

  // Helper to extract nested keys safely
  const extractKeys = (obj: Record<string, unknown> | undefined): string[] => {
    if (!obj) return [];
    const keys: string[] = [];
    for (const [k, v] of Object.entries(obj)) {
      if (k === "DEFAULT") {
        keys.push("");
      } else if (typeof v === "object" && v !== null) {
        const subKeys = extractKeys(v as Record<string, unknown>);
        for (const sub of subKeys) {
          keys.push(sub ? `${k}-${sub}` : k);
        }
      } else {
        keys.push(k);
      }
    }
    return keys;
  };

  // --- 1. Layout (display, flex, align, justify, text-align) ---
  if (resolvedOptions.layout?.enabled !== false) {
    const classes = resolvedOptions.layout?.values ?? [
      ...DEFAULT_LAYOUT_CLASSES,
    ];
    pushClasses("layout", classes, [], true);
  }

  // --- 2. Rounded ---
  if (resolvedOptions.rounded?.enabled !== false) {
    const values = [
      ...(resolvedOptions.rounded?.values ?? [...DEFAULT_ROUNDED_VALUES]),
      ...Object.keys(borderRadius ?? {}).map(toKebabCase),
    ];
    const props = resolvedOptions.rounded?.properties ?? roundedProperties;
    pushClasses("rounded", props, [...new Set(values)]);
  }

  // --- 3. Border widths ---
  if (resolvedOptions.border?.enabled !== false) {
    const values =
      resolvedOptions.border?.values ??
      (border ? Object.keys(border).map(toKebabCase) : DEFAULT_BORDER_VALUES);
    const props = resolvedOptions.border?.properties ?? borderProperties;
    pushClasses("borders", props, values);
  }

  // --- 4. Colors (optional — only when safelistColors is true) ---
  if (resolvedOptions.safelistColors) {
    const colorKeys = extractKeys(colors as Record<string, unknown>)
      .filter(Boolean)
      .map((k) => toKebabCase(k));

    pushClasses("colors", ["text"], colorKeys);
    pushClasses("colors", ["bg"], colorKeys);
    pushClasses("colors", ["border"], colorKeys);
  }

  // --- 5. Typography (custom utility classes) ---
  const typographyKeys = Object.keys(typography);
  pushClasses(
    "typography",
    typographyKeys.map((k) => toKebabCase(k)),
    [],
    true,
  );

  // --- 6. Box shadows ---
  const shadowKeys = Object.keys(shadows ?? {}).map(toKebabCase);
  pushClasses("shadows", ["shadow"], shadowKeys);

  // --- 7. Backdrop blur ---
  const blurKeys = Object.keys(backDropBlurs ?? {}).map(toKebabCase);
  pushClasses("backdrop", ["backdrop-blur"], blurKeys);

  // --- 8. Opacity ---
  if (resolvedOptions.opacity?.enabled !== false) {
    const opacityValues = resolvedOptions.opacity?.values ?? [
      ...DEFAULT_OPACITY_VALUES,
    ];
    pushClasses("opacity", ["opacity"], opacityValues);
  }

  // --- 9. Z-Index ---
  if (resolvedOptions.zIndex?.enabled !== false) {
    const zIndexValues = resolvedOptions.zIndex?.values ?? [
      ...DEFAULT_ZINDEX_VALUES,
    ];
    pushClasses("zIndex", ["z"], zIndexValues);
  }

  // --- 10. User-defined dynamic classes ---
  if (resolvedOptions.dynamicClasses) {
    safelist.push(...resolvedOptions.dynamicClasses);
  }

  // Deduplicate
  return [...new Set(safelist)] as InferSafelistClasses<TTheme, TOptions>[];
};
