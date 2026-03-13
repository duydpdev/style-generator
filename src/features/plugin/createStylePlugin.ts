import plugin, { PluginAPI, PluginCreator } from "tailwindcss/plugin";

import { StyleGeneratorOptions, defaultScreens } from "../../core/Options";
import { ThemeConfig, TypographyConfig } from "../../core/ThemeConfig";
import type { ThemeOverride } from "../../core/ThemeConfig";
import { extractData, addDot, toKebabCase } from "../../shared/helpers";
import { generateSafelist } from "../safelist/generateSafelist";
import { generateSpacingRules } from "../spacing/spacing";

import { flattenToVars, mapToVarRefs } from "./cssVariables";

export type TailwindPlugin = ReturnType<typeof plugin>;

/** Color naming modes supported by the plugin. */
export type ColorNamingMode = "v3" | "v4" | "flat";

interface VarSource {
  colors?: {
    base?: Record<string, string | Record<string, string>>;
    text?: Record<string, string | Record<string, string>>;
    common?: Record<string, string | Record<string, string>>;
  };
  shadows?: Record<string, string>;
  backDropBlurs?: Record<string, string>;
  borderRadius?: Record<string, string>;
}

/**
 * Resolve the effective colorNamingMode, supporting the legacy disableColorPrefix flag.
 * - "v3": keep all namespaces (--color-base-*, --color-text-*, --color-common-*)
 * - "v4": flatten base and common (--color-*), keep text (--color-text-*)
 * - "flat": flatten all namespaces (--color-*)
 * @param {Pick<StyleGeneratorOptions, "colorNamingMode" | "disableColorPrefix">} options - Generator options subset
 * @returns {ColorNamingMode} Effective color naming mode
 */
const resolveColorNamingMode = (
  options: Pick<
    StyleGeneratorOptions,
    "colorNamingMode" | "disableColorPrefix"
  >,
): ColorNamingMode => {
  if (options.colorNamingMode) return options.colorNamingMode;
  // eslint-disable-next-line @typescript-eslint/no-deprecated, sonarjs/deprecation
  if (options.disableColorPrefix) return "flat";
  return "v3";
};

/**
 * Resolve prefix and disablePrefix flag for a color namespace given the naming mode.
 * @param {"base" | "text" | "common"} namespace - Color namespace
 * @param {ColorNamingMode} mode - Naming mode
 * @returns {{ prefix: string; disablePrefix: boolean }} Prefix configuration for CSS variable generation
 */
const colorNsConfig = (
  namespace: "base" | "text" | "common",
  mode: ColorNamingMode,
): { prefix: string; disablePrefix: boolean } => {
  if (mode === "flat") return { prefix: "color", disablePrefix: false };
  if (mode === "v4") {
    if (namespace === "text")
      return { prefix: "color-text", disablePrefix: false };
    return { prefix: "color", disablePrefix: false };
  }
  // v3
  return { prefix: `color-${namespace}`, disablePrefix: false };
};

const buildCssVars = (
  source: VarSource,
  mode: ColorNamingMode,
): Record<string, string> => {
  const base = colorNsConfig("base", mode);
  const text = colorNsConfig("text", mode);
  const common = colorNsConfig("common", mode);

  return {
    ...(source.colors?.base
      ? flattenToVars(base.prefix, source.colors.base, {
          disablePrefix: base.disablePrefix,
        })
      : {}),
    ...(source.colors?.text
      ? flattenToVars(text.prefix, source.colors.text, {
          disablePrefix: text.disablePrefix,
        })
      : {}),
    ...(source.colors?.common
      ? flattenToVars(common.prefix, source.colors.common, {
          disablePrefix: common.disablePrefix,
        })
      : {}),
    ...(source.shadows ? flattenToVars("shadow", source.shadows, false) : {}),
    ...(source.backDropBlurs
      ? flattenToVars("backdrop-blur", source.backDropBlurs, false)
      : {}),
    ...(source.borderRadius
      ? flattenToVars("radius", source.borderRadius, false)
      : {}),
  };
};

const buildColorConfig = (
  colors: ThemeConfig["colors"],
  enableCssVariables: boolean,
  mode: ColorNamingMode,
): Record<string, string | Record<string, string>> => {
  if (enableCssVariables) {
    const base = colorNsConfig("base", mode);
    const text = colorNsConfig("text", mode);
    const common = colorNsConfig("common", mode);

    return {
      ...(colors.base
        ? mapToVarRefs(base.prefix, colors.base, {
            disablePrefix: base.disablePrefix,
          })
        : {}),
      ...(colors.text
        ? mapToVarRefs(text.prefix, colors.text, {
            disablePrefix: text.disablePrefix,
          })
        : {}),
      ...(colors.common
        ? mapToVarRefs(common.prefix, colors.common, {
            disablePrefix: common.disablePrefix,
          })
        : {}),
    };
  }
  return {
    ...(colors.base ? extractData(colors.base as Record<string, unknown>) : {}),
    ...(colors.text ? extractData(colors.text as Record<string, unknown>) : {}),
    ...(colors.common
      ? extractData(colors.common as Record<string, unknown>)
      : {}),
  } as Record<string, string | Record<string, string>>;
};

/**
 * Build typography CSS vars and var-driven utilities for cssVarDriven mode.
 * @param {PluginAPI} api - Tailwind plugin API
 * @param {Record<string, TypographyConfig>} typography - Typography config keyed by utility name
 * @returns {void} No return value
 */
const buildTypographyCssVarDriven = (
  api: PluginAPI,
  typography: Record<string, TypographyConfig>,
): void => {
  const typographyVars: Record<string, string> = {};
  for (const [name, styles] of Object.entries<TypographyConfig>(typography)) {
    for (const [prop, value] of Object.entries(styles)) {
      typographyVars[`--typography-${toKebabCase(name)}-${toKebabCase(prop)}`] =
        String(value);
    }
  }
  api.addBase({ ":root": typographyVars });

  const varDrivenUtils: Record<string, Record<string, string>> = {};
  for (const [name, styles] of Object.entries<TypographyConfig>(typography)) {
    const varStyles: Record<string, string> = {};
    for (const prop of Object.keys(styles)) {
      const cssProp = toKebabCase(prop);
      varStyles[cssProp] = `var(--typography-${toKebabCase(name)}-${cssProp})`;
    }
    varDrivenUtils[`.${toKebabCase(name)}`] = varStyles;
  }
  api.addUtilities(varDrivenUtils);
};

/**
 * Creates a Tailwind CSS plugin based on the provided theme configuration.
 * Registers CSS variables, typography utilities, spacing CSS custom property rules,
 * and extends the theme with custom colors/shadows/etc.
 * @param {ThemeConfig} config - Theme configuration
 * @param {StyleGeneratorOptions} options - Generator options
 * @param {string[]} [safelist] - Precomputed safelist (avoids double generation)
 * @returns {TailwindPlugin} Tailwind plugin instance
 */
export const createStylePlugin = (
  config: ThemeConfig,
  options: StyleGeneratorOptions = {},
  safelist?: string[],
): TailwindPlugin => {
  const { colors, typography, shadows, backDropBlurs, borderRadius, border } =
    config;

  const { enableCssVariables = true, enableResponsive = true } = options;

  const colorMode = resolveColorNamingMode(options);

  // Always include all screens in Tailwind config so breakpoint utilities (md:*, lg:*) work.
  // mergedScreens is used only for spacing responsive rule generation.
  const allScreens = { ...defaultScreens, ...options.screens };
  const mergedScreens = enableResponsive ? allScreens : {};

  // Colors: use var() references if CSS variables enabled, otherwise direct hex values
  const colorConfig = buildColorConfig(colors, enableCssVariables, colorMode);

  const tailwindConfig = {
    theme: {
      screens: allScreens,
      extend: {
        colors: colorConfig,
        boxShadow: shadows ? extractData(shadows) : {},
        backdropBlur: backDropBlurs ? extractData(backDropBlurs) : {},
        borderRadius: borderRadius ? extractData(borderRadius) : {},
        borderWidth: border ? extractData(border) : {},
      },
    },
    safelist: safelist ?? generateSafelist(config, options),
  };

  const myPlugin: PluginCreator = (api: PluginAPI) => {
    // Inject CSS variables: base theme → :root, overrides → html[data-theme='<name>']
    if (enableCssVariables) {
      api.addBase({ ":root": buildCssVars(config, colorMode) });

      if (config.themes) {
        for (const [name, override] of Object.entries<ThemeOverride>(
          config.themes,
        )) {
          const vars = buildCssVars(override, colorMode);
          if (Object.keys(vars).length > 0) {
            api.addBase({ [`html[data-theme='${name}']`]: vars });
          }
        }
      }
    }

    // Register custom typography utilities
    if (options.typography?.cssVarDriven) {
      buildTypographyCssVarDriven(api, typography);
    } else {
      api.addUtilities(
        addDot(typography) as Record<string, Record<string, string | string[]>>,
      );
    }

    // Register spacing CSS custom property utilities (.sp-* classes)
    if (options.spacing?.enabled !== false) {
      generateSpacingRules(api, options, mergedScreens);
    }
  };

  return plugin(myPlugin, tailwindConfig);
};
