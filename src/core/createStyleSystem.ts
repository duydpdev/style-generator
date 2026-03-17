import type { TailwindPlugin } from "../features/plugin/createStylePlugin";
import { createStylePlugin } from "../features/plugin/createStylePlugin";
import { generateSafelist } from "../features/safelist/generateSafelist";
import { createDesignTokens } from "../features/tokens/createDesignTokens";
import { generateThemeCss } from "../features/theme-css/generateThemeCss";

import { DesignTokensResult, InferSafelistClasses } from "./inference";
import { StyleGeneratorOptions } from "./Options";
import { ThemeConfig } from "./ThemeConfig";

/**
 * Creates a complete style system including the Tailwind plugin, safelist, and theme CSS.
 * @param {ThemeConfig} config - Theme configuration
 * @param {StyleGeneratorOptions} options - Generator options
 * @returns {object} Style system object including plugin, safelist, themeCss, and design tokens
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
  themeCss: string;
  DesignTokens: DesignTokensResult<TTheme>["DesignTokens"];
} => {
  const safelist = generateSafelist<TTheme, TOptions>(config, options);

  const styleOptions: StyleGeneratorOptions = options ?? {};

  const { DesignTokens } = createDesignTokens<TTheme>(config, styleOptions);

  return {
    plugin: createStylePlugin(config, styleOptions, safelist),
    safelist,
    themeCss: generateThemeCss(config, styleOptions),
    DesignTokens,
  };
};
