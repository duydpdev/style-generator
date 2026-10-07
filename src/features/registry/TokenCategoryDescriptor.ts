/**
 * Describes how a single theme token category (colors, shadows, typography,
 * etc.) is flattened into CSS variables, which utility classes it feeds and
 * which typed-token names it surfaces as. This is the single source of
 * truth the registry-driven pipelines (`flattenByCategory`,
 * `generateThemeCss`, `generateSourceInline`, `createDesignTokens`) and the
 * `DesignTokensWeb` / `DesignTokenKeys` types read from instead of
 * hard-coding per-category branches.
 *
 * Token data is read with `theme[descriptor.key]` (`key` is the
 * `ThemeConfig` field name), so a descriptor carries no accessor of its own;
 * `DesignTokens.Web` names this category's typed token array by the same `key`.
 * @template K Literal union of valid category keys, kept for call-site type
 * narrowing (`builtInCategories` is `as const satisfies` this interface).
 */
export interface TokenCategoryDescriptor<K extends string = string> {
  /** Stable identifier for the category (matches the `ThemeConfig` key). */
  key: K;
  /**
   * Name of this category's key-union alias in `DesignTokenKeys`
   * (e.g. `"colorKey"`).
   */
  tokenKeyName: string;
  /**
   * Bare intermediate CSS variable prefix (no leading/trailing dash), e.g.
   * `"sg-color"` for colors or `"sg-shadow"` for shadows. Combined with a
   * kebab-cased token key to produce `--<cssVarPrefix>-<key>`. Every
   * built-in prefix starts a distinct `--sg-<category>-` namespace (none is
   * a prefix of another, nor of the spacing `--sg-sp-`), so two categories
   * can never produce the same variable.
   * `undefined` when the category has no CSS variable representation.
   */
  cssVarPrefix?: string;
  /**
   * Tailwind v4 `@theme` namespace prefix (including the leading `--` and
   * trailing dash), e.g. `"--color-"` or `"--radius-"`. When set,
   * `generateThemeCss` maps every intermediate var into
   * `${themeNamespace}<key>: var(--<cssVarPrefix>-<key>)` inside
   * `@theme inline`, letting Tailwind auto-generate the matching
   * utilities. Omitted for categories the library emits its own
   * `@utility` rules for (typography) or that have no CSS variable at all.
   * `--border-width-` (border width) is an undocumented Tailwind
   * namespace, pinned by the real-engine integration test.
   */
  themeNamespace?: string;
  /**
   * Utility class prefixes this category's tokens participate in, e.g.
   * `["bg", "text", "border"]` for colors. Every entry is non-empty except
   * for a `bareClassName` category, whose single entry is `""`.
   */
  classPrefixes?: readonly string[];
  /**
   * `true` when the token key itself is the full class name (typography:
   * `.text-12-mono` comes from the key `text12Mono`), so `classPrefixes`
   * is the single empty-string entry and `@source inline` emits bare keys
   * instead of `<prefix>-<key>`.
   */
  bareClassName?: boolean;
  /** Whether this category gets responsive (`md:`, `lg:`, …) variants. */
  responsive?: boolean;
  /** Interactive state suffixes this category supports (e.g. `["hover"]`). */
  states?: readonly string[];
  /** Fallback values used when the theme config omits this category. */
  defaultValues?: Readonly<Record<string, unknown>> | readonly unknown[];
}
