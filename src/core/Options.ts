import type {
  BuiltInCategory,
  CategoryKey,
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
 * `coverage` only trims the `@source inline(...)` safelist lines
 * (class-name coverage for classes Tailwind cannot see in source files); it
 * never changes the `@theme inline` mapping, the `@utility` blocks or the
 * typed `DesignTokens`.
 * @template P Class prefixes the category accepts
 */
export interface CoverageRule<P extends string = RegistryPrefix> {
  /**
   * Keep only these class prefixes of the category (e.g. `["bg"]` for
   * `colors`, which feeds `bg`, `text` and `border`). Non-empty; each entry
   * must be one of the category's own prefixes, and `typography` has none
   * (its class is the bare key). Applies to the category's state lines too.
   */
  prefixes?: readonly P[];
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
 * The `coverage` rule of category `K`: its own prefixes only, and none at
 * all for a category without class prefixes (`typography`).
 */
type CategoryCoverageRule<K extends CategoryKey> = [CategoryPrefix<K>] extends [
  never,
]
  ? Omit<CoverageRule, "prefixes"> & { prefixes?: never }
  : CoverageRule<CategoryPrefix<K>>;

export interface StyleGeneratorOptions {
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
   * Extra Tailwind v4 `@source inline(...)` entries appended to the
   * generated CSS, for classes built at runtime that Tailwind's static
   * candidate scan can never see (e.g. a template-literal class name).
   * Each entry is emitted verbatim inside `@source inline("<entry>")` —
   * Tailwind's brace-expansion syntax (`{a,b,c}`) is supported.
   *
   * Validated by `generate()`: each entry must be non-empty, at most 512
   * characters, and must not contain `"`, `'`, `\`, `;`, `@`, `<`, `>`, or
   * a line break — those characters could escape the `inline("…")` string
   * and inject an arbitrary at-rule.
   */
  extraSources?: readonly string[];

  /**
   * Trim the `@source inline(...)` coverage per token category. Absent, or
   * `true`, keeps today's output (one line per category covering every key
   * and prefix, plus the colors state lines). `false` omits the category's
   * lines (and its state lines); a {@link CoverageRule} keeps only the
   * listed `prefixes` and/or the alias holders (`keys: "aliased"`). Typed
   * tokens and the `@theme`/`@utility` CSS are unaffected.
   *
   * Validated by `generate()`: keys must be built-in category names, every
   * `prefixes` entry a class prefix of that category, and `keys: "aliased"`
   * is rejected for `typography` (it has no `$` aliases).
   */
  coverage?: { [K in CategoryKey]?: boolean | CategoryCoverageRule<K> };

  /**
   * How `themeAxes` variants are switched on in the DOM.
   *
   * Validated by `generate()`: every attribute name must match
   * `[a-z][a-z0-9-]*` (it is interpolated into a CSS selector), every
   * `attribute` key must name a `themeAxes` axis, and no two axes may
   * resolve to the same attribute name — all for every `scope`. With
   * `scope: "element"`, no variant may leave a `$`-alias holder stale (see
   * `scope`).
   */
  axes?: {
    /**
     * Axis name → DOM attribute name, e.g. `{ theme: "data-mode" }` emits
     * `html[data-mode="dark"]` instead of `html[data-theme="dark"]`. Axes
     * that are not listed keep `data-<axis-kebab>`. `themeAxisAttributes()`
     * from `./recipes` reads the same map, so both sides stay in step.
     * @default {}
     */
    attribute?: Readonly<Record<string, string>>;
    /**
     * Where a variant block applies. `"root"` pins the selector to `html`
     * (`html[data-theme="dark"]`): custom properties are declared on
     * `:root`, so a `$`-alias `var()` is computed there and every override
     * is seen by its aliases. `"element"` drops the `html` anchor
     * (`[data-theme="dark"]`) so the attribute can sit on any element for a
     * scoped theme; a `$`-alias holder is then still computed where it is
     * declared, so `generate()` rejects a variant that overrides an alias
     * target without re-declaring each holder of it (a holder written in
     * the base theme or in any other variant of any axis).
     * @default "root"
     */
    scope?: "root" | "element";
  };
}
