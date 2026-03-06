import type { TailwindPlugin } from "../features/plugin/createStylePlugin";
import { createStylePlugin } from "../features/plugin/createStylePlugin";
import { generateSafelist } from "../features/safelist/generateSafelist";
import { createDesignTokens } from "../features/tokens/createDesignTokens";

import { DesignTokensResult, InferSafelistClasses } from "./inference";
import { StyleGeneratorOptions } from "./Options";
import { ThemeConfig } from "./ThemeConfig";

/**
 * Creates a complete style system including the Tailwind plugin and safelist.
 * @param {ThemeConfig} config - Theme configuration
 * @param {StyleGeneratorOptions} options - Generator options
 * @returns {object} Style system object including plugin, safelist and design tokens
 */
export const createStyleSystem = <
  TTheme extends ThemeConfig,
  TOptions extends StyleGeneratorOptions | undefined = undefined,
>(
  config: TTheme,
  options?: TOptions,
): {
  plugin: TailwindPlugin;
  safelist: InferSafelistClasses<TTheme, TOptions>[];
  DesignTokens: DesignTokensResult<TTheme>["DesignTokens"];
} => {
  // Generate safelist once to avoid double calculation
  const safelist = generateSafelist<TTheme, TOptions>(config, options);

  const styleOptions: StyleGeneratorOptions = options ?? {};

  const { DesignTokens } = createDesignTokens<TTheme>(config, styleOptions);

  return {
    /**
     * The Tailwind CSS plugin instance.
     * With optimized safelist passed down.
     */
    plugin: createStylePlugin(config, styleOptions, safelist),

    /**
     * The list of safelisted classes.
     */
    safelist,

    /**
     * Typed design tokens inferred from the theme.
     */
    DesignTokens,
  };
};
