import type {
  BuiltInCategory,
  CategoryKey,
  OpacityCategoryKey,
  RegistryPrefix,
} from "../features/registry/builtInCategories";

/**
 * Tailwind's default breakpoint keys. A const object (not an enum) so the
 * runtime values and the string-literal type are one structural thing:
 * `Breakpoint.MD` is `"md"`, and `const b: Breakpoint = "md"` compiles.
 */
export const Breakpoint = {
  SM: "sm",
  MD: "md",
  LG: "lg",
  XL: "xl",
  XXL: "2xl",
} as const;
export type Breakpoint = (typeof Breakpoint)[keyof typeof Breakpoint];

/** Tailwind's default screen width per `Breakpoint` (`sm` 640px … `2xl` 1536px). `options.screens` is merged over it. */
export const defaultScreens: Record<Breakpoint, string> = {
  [Breakpoint.SM]: "640px",
  [Breakpoint.MD]: "768px",
  [Breakpoint.LG]: "1024px",
  [Breakpoint.XL]: "1280px",
  [Breakpoint.XXL]: "1536px",
};

/**
 * Mapping of spacing property keys to the CSS properties each `sp-<key>`
 * utility sets (e.g. `p: ["padding"]`, `mx: ["margin-left", "margin-right"]`).
 */
export type SpacingPropertyMap = Readonly<Record<string, readonly string[]>>;

/**
 * How much of one token category's `@source inline` coverage to emit.
 * `coverage` only changes the `@source inline(...)` lines (class-name
 * coverage for classes Tailwind cannot see in source files): it trims
 * them, and `coverage.colors.opacities` adds one opacity-modifier line. It
 * never changes the `@theme inline` mapping or the `@utility` blocks; of the
 * typed `DesignTokens` only `opacities` (from `coverage.colors.opacities`)
 * depends on it.
 * @template P Class prefixes the category accepts
 */
export interface CoverageRule<P extends string = RegistryPrefix> {
  /**
   * Keep only these class prefixes of the category (e.g. `["bg"]` for
   * `colors`, which feeds `bg`, `text`, `border`, `ring`, `outline`, `divide` and `placeholder`). Non-empty (the type
   * is a non-empty tuple); each entry must be one of the category's own
   * prefixes, and `typography` has none (its class is the bare key).
   * Applies to the category's state lines too.
   */
  prefixes?: readonly [P, ...P[]];
  /**
   * `"all"` (default): every key of the category. `"aliased"`: only the
   * alias holders — keys whose value is a `$<key>` alias, in the base record
   * or in any `themeAxes` override of the same category (e.g. `primary:
   * "$blue600"`). The primitives they point to are consumed through
   * `var(--sg-*)` and need no class. Not accepted for `typography`.
   */
  keys?: "aliased" | "all";
}

/** The class prefixes of one built-in category (none for `typography`). */
type CategoryPrefix<K extends CategoryKey> = Exclude<
  Extract<BuiltInCategory, { key: K }>["classPrefixes"][number],
  ""
>;

/**
 * The opacity-modifier part of a `coverage` rule, accepted only by the
 * categories whose utilities take Tailwind's `/<n>` modifier (`colors`).
 */
interface OpacityCoverage {
  /**
   * Also cover `<prefix>-<key>/<n>` (`bg-primary/10`) for every kept
   * prefix and key and each listed step, in one extra `@source inline`
   * line after the category's own line. Distinct integers 1–100
   * (non-empty), emitted ascending. Not crossed with the state lines:
   * `hover:bg-primary-hover/10` still needs a literal class in your own
   * `@source inline(...)`. Every step adds `prefixes × keys` classes to the built CSS.
   */
  opacities?: readonly [number, ...number[]];
}

/**
 * The `coverage` rule of category `K`: its own prefixes only. A category
 * without class prefixes or `$` aliases (`typography`) takes neither
 * `prefixes` nor `keys: "aliased"`, and only an opacity-modifier category
 * (`colors`) takes `opacities` — `generate()` rejects the rest.
 */
type CategoryCoverageRule<K extends CategoryKey> = [CategoryPrefix<K>] extends [
  never,
]
  ? { prefixes?: never; keys?: "all"; opacities?: never }
  : CoverageRule<CategoryPrefix<K>> &
      ([K] extends [OpacityCategoryKey]
        ? OpacityCoverage
        : { opacities?: never });

/** Options of `generate()` and `createDesignTokens()`; `defineOptions`, `style-gen.config.json` and the Vite/Next plugins take the same shape. Unknown keys are rejected. */
export interface StyleGeneratorOptions {
  // Option declared in 4 places: here, optionsSchema.ts (zod shape),
  // resolveTokenOptions.ts and resolveOptions.ts (resolved defaults). The
  // types are pinned to each other by optionsSchema.test-d.ts.
  /**
   * Breakpoint keys to use for responsive class generation: a `Breakpoint`
   * value (`"sm"` … `"2xl"`) or a custom key declared in `screens`.
   * @default ["md", "lg"]
   */
  breakpoints?: readonly (Breakpoint | (string & {}))[];

  /**
   * Custom screens map to override defaults or add new ones.
   * Example: { md: "800px", "3xl": "1920px" }
   * Each value must be one length in px, rem or em, and the map merged with
   * the px `defaultScreens` must use a single unit (override every default
   * screen to switch to rem).
   */
  screens?: Record<string, string>;

  /**
   * Enable responsive class generation in spacing CSS rules.
   * Set to false if your project only targets a single viewport.
   * @default true
   */
  enableResponsive?: boolean;

  /**
   * Typography configuration.
   */
  typography?: {
    /**
     * When true, inject typography tokens as CSS vars into :root and have
     * utility classes reference those vars instead of hard-coded values.
     * Allows consumer to override a single token via CSS without touching JS.
     * @default false
     */
    cssVarDriven?: boolean;
  };

  // --- Spacing (CSS custom properties) ---

  /**
   * Spacing configuration. `generate()` emits one static
   * `@utility sp-<key>` block per spacing key; each declaration reads a
   * `var(--sg-sp-<key>)` custom property, with a per-breakpoint `var()`
   * fallback chain inside nested `@media` rules.
   */
  spacing?: {
    /** Disable spacing CSS rule generation entirely. Defaults to true. */
    enabled?: boolean;
    /**
     * Spacing key → CSS properties, e.g. `{ p: ["padding"] }`. REPLACES the
     * defaults: spread `DEFAULT_SPACING_PROPERTIES` to extend them.
     */
    properties?: SpacingPropertyMap;
  };

  /**
   * Trim or extend the `@source inline(...)` coverage per token category.
   * Absent, `true` or `{}` keeps today's output (one line per category
   * covering every key and prefix, plus the colors state lines). `false`
   * omits the category's lines (and its state lines); a {@link CoverageRule}
   * keeps only the listed `prefixes` and/or the alias holders
   * (`keys: "aliased"`). `colors` also takes `opacities` (e.g. `[10, 20]`):
   * one extra line covering `<prefix>-<key>/<n>` for the kept prefixes and
   * keys (`bg-primary/10`), never crossed with the state lines.
   * The same steps become `DesignTokens.Web.opacities`; the other typed
   * tokens and the `@theme`/`@utility` CSS are unaffected.
   *
   * Validated by `generate()`: keys must be built-in category names, every
   * `prefixes` entry a class prefix of that category, `keys: "aliased"`
   * is rejected for `typography` (it has no `$` aliases), and `opacities`
   * must be a non-empty list of distinct integers 1–100, accepted only for
   * `colors`.
   */
  coverage?: { [K in CategoryKey]?: boolean | CategoryCoverageRule<K> };

  /**
   * Tailwind default theme namespaces to clear before the theme's own values
   * are mapped, as `--color-*: initial;` / `--radius-*: initial;` /
   * `--shadow-*: initial;` lines at the top of `@theme inline`. After it,
   * `bg-red-500`, `rounded-md` or `shadow-md` no longer compile unless the
   * theme declares them.
   *
   * `"colors"` also removes `--color-white`/`--color-black`: declare them in
   * `colors` if you use them. `rounded-full`, `rounded-none` and
   * `shadow-none` are static utilities and stay. `inset-shadow-*`,
   * `drop-shadow-*` and `text-shadow-*` are other namespaces and are not
   * touched.
   *
   * Validated by `generate()`: `"radius"` needs a non-empty
   * `theme.borderRadius` and `"shadow"` a non-empty `theme.shadows`, or the
   * defaults would be wiped with nothing to replace them.
   * @default []
   */
  resetTailwindDefaults?: readonly ("colors" | "radius" | "shadow")[];
}

/**
 * `O` plus a `never` slot for every top-level key `StyleGeneratorOptions`
 * does not declare. A `const O extends StyleGeneratorOptions` type parameter
 * skips the excess-property check, so `generate(theme, { screnes })` would
 * compile; this restores it without losing `const` inference.
 */
export type ExactOptions<O> = O &
  Readonly<Record<Exclude<keyof O, keyof StyleGeneratorOptions>, never>>;
