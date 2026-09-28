/**
 * Describes how a single theme token category (colors, shadows, typography,
 * etc.) is flattened into CSS variables and which utility classes it feeds.
 * This is the single source of truth the registry-driven pipelines
 * (`flattenByCategory`, `generateThemeCss`, future `@source inline`
 * emission) read from instead of hard-coding per-category branches.
 * @template K Literal union of valid category keys (unused at runtime,
 * kept for call-site type narrowing).
 */
export interface TokenCategoryDescriptor<K extends string = string> {
  /** Stable identifier for the category (matches the `ThemeConfig` key). */
  key: K;
  /**
   * Bare intermediate CSS variable prefix (no leading/trailing dash), e.g.
   * `"sg"` for colors or `"sg-shadow"` for shadows. Combined with a
   * kebab-cased token key to produce `--<cssVarPrefix>-<key>`.
   * `undefined` when the category has no CSS variable representation
   * (e.g. `border`, whose values map directly to Tailwind's built-in
   * border-width scale).
   */
  cssVarPrefix?: string;
  /**
   * Tailwind v4 `@theme` namespace prefix (including the leading `--` and
   * trailing dash), e.g. `"--color-"` or `"--radius-"`. When set,
   * `generateThemeCss` maps every intermediate var into
   * `${themeNamespace}<key>: var(--<cssVarPrefix>-<key>)` inside
   * `@theme inline`, letting Tailwind auto-generate the matching
   * utilities. Omitted for categories the library emits its own
   * `@utility` rules for (typography) or that have no CSS variable at
   * all (border).
   */
  themeNamespace?: string;
  /**
   * Utility class prefixes this category's tokens participate in, e.g.
   * `["bg", "text", "border"]` for colors. An empty-string entry (`[""]`)
   * means the token key itself is the full class name (typography).
   */
  classPrefixes?: readonly string[];
  /** Whether this category gets responsive (`md:`, `lg:`, …) variants. */
  responsive?: boolean;
  /** Interactive state suffixes this category supports (e.g. `["hover"]`). */
  states?: readonly string[];
  /** Fallback values used when the theme config omits this category. */
  defaultValues?: Readonly<Record<string, unknown>> | readonly unknown[];
}

/**
 * Identity helper for defining a `TokenCategoryDescriptor` with inferred
 * literal types. Zero runtime cost — mirrors `defineTheme`/`defineOptions`.
 * @template K Literal category key type
 * @param {TokenCategoryDescriptor<K>} descriptor - Category descriptor
 * @returns {TokenCategoryDescriptor<K>} The same descriptor object
 */
export function defineCategory<K extends string>(
  descriptor: TokenCategoryDescriptor<K>,
): TokenCategoryDescriptor<K> {
  return descriptor;
}
