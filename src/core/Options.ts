import type {
  BuiltInCategory,
  CategoryKey,
  OpacityCategoryKey,
  RegistryPrefix,
} from "../features/registry/builtInCategories";

/** Tailwind's default breakpoint keys; a const object, so `"md"` is assignable to `Breakpoint`. */
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

/** Spacing key → the CSS properties its `sp-<key>` utility sets (`p: ["padding"]`). */
export type SpacingPropertyMap = Readonly<Record<string, readonly string[]>>;

/**
 * How much of one token category's `@source inline` coverage to emit; it
 * never changes the `@theme inline` mapping or the `@utility` blocks.
 * @template P Class prefixes the category accepts
 */
export interface CoverageRule<P extends string = RegistryPrefix> {
  /** Keep only these class prefixes of the category (state lines included). */
  prefixes?: readonly [P, ...P[]];
  /** `"aliased"` keeps only the keys holding a `$<key>` alias (base or any override); default `"all"`. */
  keys?: "aliased" | "all";
}

/** The class prefixes of one built-in category (none for `typography`). */
type CategoryPrefix<K extends CategoryKey> = Exclude<
  Extract<BuiltInCategory, { key: K }>["classPrefixes"][number],
  ""
>;

// A plain opacity step, or a group with its own prefixes and color keys.
type OpacityEntry<P extends string> =
  | number
  | {
      steps: readonly [number, ...number[]];
      prefixes?: readonly [P, ...P[]];
      keys?: readonly [string, ...string[]];
    };

// The opacity-modifier part of a `coverage` rule (`colors` only).
interface OpacityCoverage<P extends string> {
  /**
   * Also cover `<prefix>-<key>/<n>` for each step (distinct integers 1–100),
   * plus one line per `{ steps, prefixes?, keys? }` group. Not crossed with
   * the state lines; every step adds `prefixes × keys` classes.
   */
  opacities?: readonly [OpacityEntry<P>, ...OpacityEntry<P>[]];
}

// The `coverage` rule of category `K`, limited to what that category supports.
type CategoryCoverageRule<K extends CategoryKey> = [CategoryPrefix<K>] extends [
  never,
]
  ? { prefixes?: never; keys?: "all"; opacities?: never }
  : CoverageRule<CategoryPrefix<K>> &
      ([K] extends [OpacityCategoryKey]
        ? OpacityCoverage<CategoryPrefix<K>>
        : { opacities?: never });

/** Options of `generate()` and `createDesignTokens()`; `defineOptions`, `style-gen.config.json` and the Vite/Next plugins take the same shape. Unknown keys are rejected. */
export interface StyleGeneratorOptions {
  // Rationale: documents/architecture.md#stylegeneratoroptions-why-each-option-is-declared-in-four-files
  /**
   * Breakpoint keys for responsive classes: a `Breakpoint` or a `screens` key.
   * @default ["md", "lg"]
   */
  breakpoints?: readonly (Breakpoint | (string & {}))[];

  /** Screens merged over `defaultScreens`: one px/rem/em length each, one unit overall. */
  screens?: Record<string, string>;

  /**
   * Responsive `@media` chains in the spacing utilities.
   * @default true
   */
  enableResponsive?: boolean;

  typography?: {
    /**
     * Emit typography tokens as `:root` vars that the utilities read.
     * @default false
     */
    cssVarDriven?: boolean;
  };

  /** One `@utility sp-<key>` per spacing key, reading `var(--sg-sp-<key>)`. */
  spacing?: {
    /** Disable spacing CSS rule generation entirely. Defaults to true. */
    enabled?: boolean;
    /** Spacing key → CSS properties; REPLACES the defaults (spread `DEFAULT_SPACING_PROPERTIES`). */
    properties?: SpacingPropertyMap;
  };

  /**
   * Trim or extend the `@source inline(...)` coverage per category: `false`
   * drops it, a {@link CoverageRule} narrows it, `colors.opacities` adds
   * `/<n>` classes (plain steps become `DesignTokens.Web.opacities`).
   */
  coverage?: { [K in CategoryKey]?: boolean | CategoryCoverageRule<K> };

  /**
   * Tailwind default namespaces to clear (`--color-*: initial;` …) at the top
   * of `@theme inline`; each needs a non-empty replacement in the theme.
   * @default []
   */
  resetTailwindDefaults?: readonly ("colors" | "radius" | "shadow")[];
}

/** `O` with `never` for unknown keys: restores the excess-property check a `const O` parameter skips. */
export type ExactOptions<O> = O &
  Readonly<Record<Exclude<keyof O, keyof StyleGeneratorOptions>, never>>;
