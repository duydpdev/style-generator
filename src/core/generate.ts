import { z } from "zod";

import { buildDesignTokens } from "../features/tokens/createDesignTokens";

import { generateFromParsed } from "./generateFromParsed";
import type { DesignTokensResult } from "./inference";
import type { ExactOptions, StyleGeneratorOptions } from "./Options";
import { prepareGenerate } from "./prepareGenerate";
import { ThemeSchema, type ThemeConfig } from "./themeSchema";

// Computed once: `ThemeSchema` never changes at runtime.
const themeJsonSchema = z.toJSONSchema(ThemeSchema);

/** What {@link generate} returns for theme `TTheme` and options `O`. */
export interface GenerateResult<
  TTheme extends ThemeConfig,
  // eslint-disable-next-line @typescript-eslint/no-generated-empty-object-type -- `{}` is the "no extra options" default of the options type parameter
  O = Record<never, never>,
> {
  css: string;
  tokens: DesignTokensResult<TTheme, O>["DesignTokens"];
  schema: typeof themeJsonSchema;
}

/**
 * Validate options, then the theme; return the Tailwind v4 CSS, typed tokens and theme JSON Schema.
 * @template TTheme
 * @template O
 * @param {ThemeConfig} theme - Theme configuration
 * @returns {GenerateResult<ThemeConfig, O>} `{ css, tokens, schema }`
 * @throws {z.ZodError} On invalid options or an invalid theme
 */
export function generate<const TTheme extends ThemeConfig>(
  theme: TTheme,
): GenerateResult<TTheme>;
/**
 * `generate()` with `options`, whose literal keys type `tokens`.
 * @template TTheme
 * @template O
 * @param {ThemeConfig} theme - Theme configuration
 * @param {StyleGeneratorOptions | undefined} options - Generator options, validated first
 * @returns {GenerateResult<ThemeConfig, O>} `{ css, tokens, schema }`
 */
export function generate<
  const TTheme extends ThemeConfig,
  const O extends StyleGeneratorOptions = StyleGeneratorOptions,
>(
  theme: TTheme,
  options: ExactOptions<O> | undefined,
): GenerateResult<TTheme, O>;
export function generate(
  theme: ThemeConfig,
  options?: StyleGeneratorOptions,
): GenerateResult<ThemeConfig, StyleGeneratorOptions> {
  const { parsed, resolved } = prepareGenerate(theme, options);

  const { DesignTokens } = buildDesignTokens<
    ThemeConfig,
    StyleGeneratorOptions
  >(parsed, resolved);

  const css = generateFromParsed(parsed, resolved);

  return { css, tokens: DesignTokens, schema: themeJsonSchema };
}
