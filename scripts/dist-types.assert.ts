/**
 * Consumer-facing type assertions, compiled by `yarn typecheck:dist`
 * (`tsconfig.dts-check.json`) against the BUILT declarations. Imports go
 * through the package name, so they resolve via `package.json#exports` to
 * `dist/*.d.ts` — exactly what a consumer's editor sees, including what
 * `vite-plugin-dts` rolled up and under the `typescript` peer leg.
 *
 * Nothing here runs: a wrong assertion is a compile error. `Eq` is the strict
 * identity check (`any` and unions do not slip through).
 */
import {
  generate,
  defineOptions,
  defineTheme,
  borderProperties,
} from "@duydpdev/style-generator";
import {
  COLOR_STATES,
  createVariantMapper,
  toKebabCase,
} from "@duydpdev/style-generator/cva";
import {
  createTailwindMergeExtension,
  splitSpacingProps,
  themeAxisAttributes,
  type SpacingProps,
  type TailwindMergeExtension,
} from "@duydpdev/style-generator/recipes";
import {
  createDesignTokens,
  type Breakpoint,
} from "@duydpdev/style-generator/tokens";
import type {
  CategoryTokenKey,
  DefaultRoundedValue,
  DesignTokensWeb,
  RoundedVariant,
  StyleGeneratorOptions,
  ThemeAxesState,
  ThemeConfig,
} from "@duydpdev/style-generator/types";

type Eq<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Assert<T extends true> = T;

const theme = defineTheme({
  colors: { primary: "#3B82F6", "blue-500": "#3B82F6" },
  borderRadius: { pill: "999px", "2xl": "16px" },
  themeAxes: {
    theme: { dark: { colors: { primary: "#fff" } } },
    palette: { forest: { colors: { primary: "#0f0" } } },
  },
});

const options = defineOptions({
  breakpoints: ["md", "xl"],
  screens: { "3xl": "1920px" },
  spacing: { properties: { inset: ["inset"] } },
});

const web = generate(theme, options).tokens.Web;
const defaulted = createDesignTokens(theme).DesignTokens.Web;
const annotatedOptions: StyleGeneratorOptions = { breakpoints: ["md"] };
const widened = createDesignTokens(theme, annotatedOptions).DesignTokens.Web;
const explicit = createDesignTokens<typeof theme>(theme, {
  breakpoints: ["xl"],
}).DesignTokens.Web;
const aliased = createDesignTokens({
  colors: { blue500: "#00f", primary: "$blue500", accent: "#f00" },
  themeAxes: { theme: { dark: { colors: { accent: "$blue500" } } } },
}).DesignTokens.Web;

const borderMap = createVariantMapper(borderProperties, ["thin"] as const);
const numeric = createDesignTokens({
  colors: { 500: "$primary", primary: "#000" },
  borderWidth: { 2: "2px" },
}).DesignTokens.Web;
// @ts-expect-error `screnes` is not an option: a typo must not compile
generate(theme, { screnes: {} });

const mergeExtension = createTailwindMergeExtension(web);
const split = splitSpacingProps(
  {} as SpacingProps<"md" | "xl", "inset"> & { id: string },
  web.spacingProperties,
);
const axisAttributes = themeAxisAttributes<typeof theme>({ theme: "dark" });

const states = createVariantMapper(
  "bg",
  ["primary", "primaryHover", "primaryActive"] as const,
  { states: COLOR_STATES },
);

interface BareTheme {
  colors: { primary: string };
}

export type DistTypeChecks = [
  // Options flow into the token types as readonly literals.
  Assert<Eq<typeof web.breakpoints, readonly ("md" | "xl")[]>>,
  Assert<Eq<typeof web.spacingProperties, readonly "inset"[]>>,
  Assert<Eq<keyof typeof web.screens, Breakpoint | "3xl">>,
  Assert<Eq<typeof web.colors, readonly ("primary" | "blue500")[]>>,
  Assert<Eq<typeof web.borderRadius, readonly ("pill" | "2xl")[]>>,
  Assert<Eq<typeof web.aliasedColors, readonly never[]>>,
  Assert<Eq<typeof aliased.aliasedColors, readonly ("primary" | "accent")[]>>,
  // An explicit type argument leaves `O` at its default, so it widens.
  Assert<Eq<typeof explicit.breakpoints, readonly string[]>>,
  // Omitted options fall back to the library defaults; annotated ones widen.
  Assert<Eq<typeof defaulted.breakpoints, readonly ("md" | "lg")[]>>,
  Assert<Eq<typeof widened.breakpoints, readonly string[]>>,
  Assert<Eq<typeof widened.spacingProperties, readonly string[]>>,
  // An annotated `ThemeConfig` is `string`; an absent category is the defaults.
  Assert<Eq<RoundedVariant<ThemeConfig>, string>>,
  Assert<Eq<RoundedVariant<BareTheme>, DefaultRoundedValue>>,
  Assert<Eq<CategoryTokenKey<ThemeConfig, "colors">, string>>,
  // Theme axes are a closed, optional map of variants.
  Assert<
    Eq<
      ThemeAxesState<typeof theme>,
      {
        readonly theme?: "dark" | "base";
        readonly palette?: "forest" | "base";
      }
    >
  >,
  // Token arrays are what `DesignTokensWeb` says they are.
  Assert<Eq<typeof web, DesignTokensWeb<typeof theme, typeof options>>>,
  // The mapper chains sibling states into one literal class string.
  Assert<
    Eq<
      typeof states.primary,
      "bg-primary hover:bg-primary-hover active:bg-primary-active"
    >
  >,
  Assert<Eq<typeof states.primaryHover, "bg-primary-hover">>,
  Assert<Eq<typeof toKebabCase, (str: string) => string>>,
  // Recipes: the tokens feed the tailwind-merge extension, whose type names no
  // `tailwind-merge` import; spacing props split into `rest`.
  Assert<Eq<typeof mergeExtension, TailwindMergeExtension>>,
  Assert<Eq<typeof split.rest, { id: string }>>,
  Assert<Eq<typeof split.spacing.className, string>>,
  Assert<Eq<typeof axisAttributes, Readonly<Record<string, string>>>>,
  // Documented 5.0 call: the exported prefix lists feed the mapper as they are.
  Assert<Eq<(typeof borderMap)["border-x"]["thin"], "border-x-thin">>,
  // Numeric theme keys are the stringified keys the runtime sees.
  Assert<Eq<typeof numeric.borderWidth, readonly "2"[]>>,
  Assert<Eq<typeof numeric.aliasedColors, readonly "500"[]>>,
];
