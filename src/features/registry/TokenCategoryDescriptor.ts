import type { ColorState } from "../../shared/colorStates";

/**
 * How one theme token category is flattened into CSS variables, which
 * utilities it feeds and which typed-token names it surfaces as; the single
 * source of truth the registry-driven pipelines read. Token data is read with
 * `theme[descriptor.key]`.
 * @template K Literal union of valid category keys
 */
// Rationale: documents/architecture.md#tokencategorydescriptor-namespace-opacity-and-percent-invariants
export interface TokenCategoryDescriptor<K extends string = string> {
  /** Stable identifier for the category (matches the `ThemeConfig` key). */
  key: K;
  /** Name of this category's key-union alias in `DesignTokenKeys` (e.g. `"colorKey"`). */
  tokenKeyName: string;
  /** Bare `--sg-*` variable prefix (e.g. `"sg-color"`); absent when the category has no CSS variable. */
  cssVarPrefix?: string;
  /** Tailwind `@theme` namespace with leading `--` and trailing dash (e.g. `"--color-"`). */
  themeNamespace?: string;
  /** Utility class prefixes the tokens feed; a `bareClassName` category has the single entry `""`. */
  classPrefixes?: readonly string[];
  /** `true` when the token key itself is the full class name (typography `text12Mono` → `.text-12-mono`). */
  bareClassName?: boolean;
  /** Whether this category gets responsive (`md:`, `lg:`, …) variants. */
  responsive?: boolean;
  /** Interactive states: a sibling key `<token><suffix>` gets the `<variant>:` state line. */
  states?: readonly ColorState[];
  /** `true` when the utilities take Tailwind's `/<n>` opacity modifier; gates `coverage.<key>.opacities`. */
  opacityModifier?: boolean;
  /** `true` for a scale category (no `$` alias, one prefix): `coverage.<key>` is only `false`, `true` or `{ keys: "all" }`. */
  literalScale?: boolean;
  /** `"percent"` maps the `--sg-*` 0–1 number as `calc(var(--sg-…) * 100%)` in `@theme inline`. */
  themeValue?: "percent";
  /** Fallback values used when the theme config omits this category. */
  defaultValues?: Readonly<Record<string, unknown>> | readonly unknown[];
}
