import { z } from "zod";

import { generateSourceInline } from "../features/registry/generateSourceInline";
import { generateSpacingCss } from "../features/spacing/generateSpacingCss";
import { generateBorderWidthCss } from "../features/theme-css/generateBorderWidthCss";
import { generateScreensCss } from "../features/theme-css/generateScreensCss";
import { buildThemeCss } from "../features/theme-css/generateThemeCss";
import { createDesignTokens } from "../features/tokens/createDesignTokens";
import { generateTypographyCss } from "../features/typography/generateTypographyCss";

import type { DesignTokensResult } from "./inference";
import type { StyleGeneratorOptions } from "./Options";
import {
  TOKEN_KEY_RE,
  ThemeSchema,
  TokenValue,
  type ThemeConfig,
} from "./themeSchema";

// Computed once at module scope — `z.toJSONSchema` walks the whole schema
// tree, and `ThemeSchema` never changes at runtime, so recomputing it on
// every `generate()` call would be pure waste.
const themeJsonSchema = z.toJSONSchema(ThemeSchema);

/**
 * Grammar for a single `extraSources` entry: non-empty, bounded length, and
 * free of characters that could escape the `@source inline("<entry>")`
 * string literal and inject an arbitrary at-rule (e.g. closing the quote
 * then opening `@import`).
 */
const ExtraSourceEntry = z
  .string()
  .min(1, "extraSources entries must not be empty")
  .max(512, "extraSources entries must be at most 512 characters")
  .refine(
    (v) => !/["'\\;@<>\n\r]/.test(v),
    "extraSources entries must not contain \", ', \\, ;, @, <, >, or a line break",
  );

/**
 * Option names echoed into the CSS (`--breakpoint-<key>`, `md:` variants,
 * `sp-<key>`, `--sg-sp-<key>-<bp>`) use the theme key grammar, without the
 * typed-token round-trip check (options never become typed tokens).
 */
const OptionKey = z
  .string()
  .regex(
    TOKEN_KEY_RE,
    "Key must start with a letter/digit and contain only letters, digits, `-`",
  );

/** A CSS property name (`padding`, `column-gap`, `--custom`). */
const CssPropertyName = z
  .string()
  .regex(
    /^-{0,2}[a-z][a-z0-9-]*$/,
    "CSS property name must be lowercase letters, digits and `-`",
  );

/**
 * Validates every option that reaches `generate().css`, with the same
 * injection guarantees as `ThemeSchema`. Unknown and purely behavioural
 * options (`enableResponsive`, `typography`, `spacing.enabled`) pass through;
 * the result is only checked, never used.
 */
const StyleGeneratorOptionsSchema = z.object({
  breakpoints: z.array(OptionKey).optional(),
  screens: z.record(OptionKey, TokenValue).optional(),
  spacing: z
    .object({
      properties: z
        .record(OptionKey, z.record(CssPropertyName, TokenValue))
        .optional(),
    })
    .optional(),
  extraSources: z.array(ExtraSourceEntry).optional(),
});

/**
 * Generate the complete registry-driven CSS string (breakpoint `@theme`
 * override + theme vars + `@theme inline` mapping + typography/spacing
 * `@utility` blocks) and typed design tokens for a theme. Returns a single
 * static CSS string meant to be written to a file and `@import`ed alongside
 * `@import "tailwindcss"` (Tailwind v4 only).
 *
 * Always validates `theme` against `ThemeSchema` first — independent of
 * whether the caller already went through `defineTheme()` — so CLI/Vite/Next
 * callers that hand it raw `JSON.parse()` output get the same guarantees.
 * @param {ThemeConfig} theme - Theme configuration
 * @param {StyleGeneratorOptions} [options] - Generator options
 * @returns {object} `{ css, tokens, schema }` — generated CSS string, typed
 *   design tokens, and the theme's JSON Schema (`z.toJSONSchema(ThemeSchema)`)
 */
export const generate = <TTheme extends ThemeConfig>(
  theme: TTheme,
  options?: StyleGeneratorOptions,
): {
  css: string;
  tokens: DesignTokensResult<TTheme>["DesignTokens"];
  schema: typeof themeJsonSchema;
} => {
  // Throws a `ZodError` (unknown keys, injection-unsafe values, ...) before
  // any CSS is generated. `parsed` is structurally identical to `theme` (no
  // coercion/defaults in this schema) — cast back to `TTheme` so downstream
  // generic inference (`createDesignTokens<TTheme>`) keeps literal keys.
  const parsed = ThemeSchema.parse(theme) as TTheme;

  const styleOptions: StyleGeneratorOptions = options ?? {};
  StyleGeneratorOptionsSchema.parse(styleOptions);

  const { DesignTokens } = createDesignTokens<TTheme>(parsed, styleOptions);

  const css = [
    generateScreensCss(styleOptions),
    buildThemeCss(parsed),
    generateBorderWidthCss(parsed),
    generateTypographyCss(parsed.typography, styleOptions),
    generateSpacingCss(styleOptions),
    generateSourceInline(parsed, styleOptions),
  ]
    .filter((block) => block.length > 0)
    .join("\n");

  return { css, tokens: DesignTokens, schema: themeJsonSchema };
};
