import { z } from "zod";

import { generateSourceInline } from "../features/registry/generateSourceInline";
import { generateSpacingCss } from "../features/spacing/generateSpacingCss";
import { generateScreensCss } from "../features/theme-css/generateScreensCss";
import { buildThemeCss } from "../features/theme-css/generateThemeCss";
import { buildDesignTokens } from "../features/tokens/createDesignTokens";
import { generateTypographyCss } from "../features/typography/generateTypographyCss";

import { assertAxesOptions } from "./crossFieldChecks";
import type { DesignTokensResult } from "./inference";
import type { StyleGeneratorOptions } from "./Options";
import { StyleGeneratorOptionsSchema } from "./optionsSchema";
import { parseTheme } from "./parseTheme";
import { resolveOptions } from "./resolveOptions";
import { ThemeSchema, type ThemeConfig } from "./themeSchema";

// Computed once at module scope — `z.toJSONSchema` walks the whole schema
// tree, and `ThemeSchema` never changes at runtime, so recomputing it on
// every `generate()` call would be pure waste.
const themeJsonSchema = z.toJSONSchema(ThemeSchema);

/** What {@link generate} returns for theme `TTheme` and options `O`. */
export interface GenerateResult<
  TTheme extends ThemeConfig,
  O = Record<never, never>,
> {
  css: string;
  tokens: DesignTokensResult<TTheme, O>["DesignTokens"];
  schema: typeof themeJsonSchema;
}

/**
 * Generate the complete registry-driven CSS string (breakpoint `@theme`
 * override + theme vars + `@theme inline` mapping + typography/spacing
 * `@utility` blocks) and typed design tokens for a theme. Returns a single
 * static CSS string meant to be written to a file and `@import`ed alongside
 * `@import "tailwindcss"` (Tailwind v4 only).
 *
 * Validates `options` first, then `theme` against `ThemeSchema` — independent
 * of whether the caller already went through `defineTheme()` — so CLI/Vite/
 * Next callers that hand it raw `JSON.parse()` output get the same
 * guarantees. Both failures are a `ZodError`; with `axes.scope: "element"`
 * a variant that would leave a `$`-alias holder stale is rejected too.
 *
 * With `options`, their literal `breakpoints`, `screens` and
 * `spacing.properties` keys type `tokens`; options typed as
 * `StyleGeneratorOptions`, or an explicit `<typeof theme>` type argument
 * (which leaves `O` at its default), widen them to `string`. Without
 * `options` the tokens carry the library defaults.
 * @template TTheme
 * @template O
 * @param {ThemeConfig} theme - Theme configuration (the optional second argument is the `StyleGeneratorOptions`)
 * @returns {GenerateResult<ThemeConfig, O>} `{ css, tokens, schema }` — generated CSS string, typed
 *   design tokens, and the theme's JSON Schema (`z.toJSONSchema(ThemeSchema)`)
 */
export function generate<const TTheme extends ThemeConfig>(
  theme: TTheme,
): GenerateResult<TTheme>;
export function generate<
  const TTheme extends ThemeConfig,
  const O extends StyleGeneratorOptions = StyleGeneratorOptions,
>(theme: TTheme, options: O | undefined): GenerateResult<TTheme, O>;
export function generate(
  theme: ThemeConfig,
  options?: StyleGeneratorOptions,
): GenerateResult<ThemeConfig, StyleGeneratorOptions> {
  // Options first (a bad option fails before the theme is even looked at),
  // then the theme: each throws a `ZodError` (unknown keys,
  // injection-unsafe values, ...) before any CSS is generated.
  // `parseTheme` hands the theme back typed as `ThemeConfig` so downstream
  // inference keeps the literal keys.
  const styleOptions: StyleGeneratorOptions = options ?? {};
  StyleGeneratorOptionsSchema.parse(styleOptions);
  const resolved = resolveOptions(styleOptions);
  const parsed = parseTheme(theme);
  // The only checks that need both the theme and the options.
  assertAxesOptions(parsed, resolved.axes);

  const { DesignTokens } = buildDesignTokens<
    ThemeConfig,
    StyleGeneratorOptions
  >(parsed, resolved);

  const css = [
    generateScreensCss(resolved),
    buildThemeCss(parsed, resolved),
    generateTypographyCss(parsed.typography, resolved),
    generateSpacingCss(resolved),
    generateSourceInline(parsed, resolved),
  ]
    .filter((block) => block.length > 0)
    .join("\n");

  return { css, tokens: DesignTokens, schema: themeJsonSchema };
}
