import { generateSourceInline } from "../features/registry/generateSourceInline";
import { generateSpacingCss } from "../features/spacing/generateSpacingCss";
import { generateScreensCss } from "../features/theme-css/generateScreensCss";
import { generateThemeCss } from "../features/theme-css/generateThemeCss";
import { createDesignTokens } from "../features/tokens/createDesignTokens";
import { generateTypographyCss } from "../features/typography/generateTypographyCss";

import { DesignTokensResult } from "./inference";
import { StyleGeneratorOptions } from "./Options";
import { ThemeConfig } from "./ThemeConfig";

/**
 * Generate the complete registry-driven CSS string (breakpoint `@theme`
 * override + theme vars + `@theme inline` mapping + typography/spacing
 * `@utility` blocks) and typed design tokens for a theme. Returns a single
 * static CSS string meant to be written to a file and `@import`ed alongside
 * `@import "tailwindcss"` (Tailwind v4 only).
 * @param {ThemeConfig} theme - Theme configuration
 * @param {StyleGeneratorOptions} [options] - Generator options
 * @returns {object} `{ css, tokens }` — generated CSS string and typed design tokens
 */
export const generate = <TTheme extends ThemeConfig>(
  theme: TTheme,
  options?: StyleGeneratorOptions,
): {
  css: string;
  tokens: DesignTokensResult<TTheme>["DesignTokens"];
} => {
  const styleOptions: StyleGeneratorOptions = options ?? {};

  const { DesignTokens } = createDesignTokens<TTheme>(theme, styleOptions);

  const css = [
    generateScreensCss(styleOptions),
    generateThemeCss(theme),
    generateTypographyCss(theme.typography, styleOptions),
    generateSpacingCss(styleOptions),
    generateSourceInline(styleOptions),
  ]
    .filter((block) => block.length > 0)
    .join("\n");

  return { css, tokens: DesignTokens };
};
