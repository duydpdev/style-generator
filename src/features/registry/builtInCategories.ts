import { COLOR_STATES } from "../../shared/colorStates";
import { BORDER_PREFIXES, ROUNDED_PREFIXES } from "../../shared/classPrefixes";

import type { TokenCategoryDescriptor } from "./TokenCategoryDescriptor";
import { categoryTokenMeta } from "./categoryTokenMeta";

/** `colors` — flat camelCase palette, through Tailwind's `--color-*` namespace. */
export const colorsCategory = {
  key: "colors",
  tokenKeyName: "colorKey",
  cssVarPrefix: "sg-color",
  themeNamespace: "--color-",
  classPrefixes: [
    "bg",
    "text",
    "border",
    "ring",
    "outline",
    "divide",
    "placeholder",
  ],
  opacityModifier: true,
  // A sibling key `<token><State>` (`primaryHover`) opts the token into state classes.
  states: COLOR_STATES,
} as const satisfies TokenCategoryDescriptor;

/** `typography` — named text styles (`text12Mono` → `.text-12-mono`), emitted as `@utility` by `generateTypographyCss`. */
export const typographyCategory = {
  key: "typography",
  tokenKeyName: "textKey",
  classPrefixes: [""],
  bareClassName: true,
} as const satisfies TokenCategoryDescriptor;

/** `shadows` — named `box-shadow` presets, feeds `shadow-*` utilities. */
export const shadowsCategory = {
  key: "shadows",
  tokenKeyName: "shadowKey",
  cssVarPrefix: "sg-shadow",
  themeNamespace: "--shadow-",
  classPrefixes: ["shadow"],
} as const satisfies TokenCategoryDescriptor;

/** `backdropBlurs` — named blur presets, feeds `backdrop-blur-*` (`--backdrop-blur-*`). */
// Rationale: documents/architecture.md#backdropblurscategory-why-not-the-blur-namespace
export const backdropBlursCategory = {
  key: "backdropBlurs",
  tokenKeyName: "backdropBlurKey",
  cssVarPrefix: "sg-backdrop-blur",
  themeNamespace: "--backdrop-blur-",
  classPrefixes: ["backdrop-blur"],
} as const satisfies TokenCategoryDescriptor;

/** `borderRadius` — named radius presets, responsive (`md:rounded-sm`, …). */
export const borderRadiusCategory = {
  key: "borderRadius",
  tokenKeyName: "roundedKey",
  ...categoryTokenMeta.borderRadius,
  cssVarPrefix: "sg-radius",
  themeNamespace: "--radius-",
  classPrefixes: ROUNDED_PREFIXES,
  responsive: true,
} as const satisfies TokenCategoryDescriptor;

/** `fontFamily` — named font stacks, feeds `font-*` (`--font-*`); weight names are rejected by `themeSchema.ts`. */
export const fontFamilyCategory = {
  key: "fontFamily",
  tokenKeyName: "fontFamilyKey",
  cssVarPrefix: "sg-font",
  themeNamespace: "--font-",
  classPrefixes: ["font"],
} as const satisfies TokenCategoryDescriptor;

/** `borderWidth` — named border widths (`--border-width-*`); omitted or empty falls back to Tailwind's scale. */
// Rationale: documents/architecture.md#borderwidthcategory-the-undocumented-border-width-namespace
export const borderWidthCategory = {
  key: "borderWidth",
  tokenKeyName: "borderWidthKey",
  ...categoryTokenMeta.borderWidth,
  cssVarPrefix: "sg-border-width",
  themeNamespace: "--border-width-",
  classPrefixes: BORDER_PREFIXES,
} as const satisfies TokenCategoryDescriptor;

/** `motionDuration` — feeds `duration-*` (`--transition-duration-*`; `--duration-*` makes no class). */
export const motionDurationCategory = {
  key: "motionDuration",
  tokenKeyName: "motionDurationKey",
  cssVarPrefix: "sg-duration",
  themeNamespace: "--transition-duration-",
  classPrefixes: ["duration"],
  literalScale: true,
} as const satisfies TokenCategoryDescriptor;

/** `motionEasing` — named timing functions, feeds `ease-*` (`--ease-*`). */
export const motionEasingCategory = {
  key: "motionEasing",
  tokenKeyName: "motionEasingKey",
  cssVarPrefix: "sg-ease",
  themeNamespace: "--ease-",
  classPrefixes: ["ease"],
  literalScale: true,
} as const satisfies TokenCategoryDescriptor;

/** `controlHeight` — control heights, `h-control-<key>` (`--height-control-*`). */
export const controlHeightCategory = {
  key: "controlHeight",
  tokenKeyName: "controlHeightKey",
  cssVarPrefix: "sg-control",
  themeNamespace: "--height-control-",
  classPrefixes: ["h-control"],
  literalScale: true,
} as const satisfies TokenCategoryDescriptor;

/** `iconSize` — icon box sizes, `size-icon-<key>` (`--size-icon-*`). */
export const iconSizeCategory = {
  key: "iconSize",
  tokenKeyName: "iconSizeKey",
  cssVarPrefix: "sg-icon",
  themeNamespace: "--size-icon-",
  classPrefixes: ["size-icon"],
  literalScale: true,
} as const satisfies TokenCategoryDescriptor;

/** `opacity` — named element opacities, feeds `opacity-*` (`--opacity-*`). */
export const opacityCategory = {
  key: "opacity",
  tokenKeyName: "opacityKey",
  cssVarPrefix: "sg-opacity",
  themeNamespace: "--opacity-",
  classPrefixes: ["opacity"],
  literalScale: true,
  themeValue: "percent",
} as const satisfies TokenCategoryDescriptor;

/** `zIndex` — stacking levels, feeds `z-*` (`--z-index-*`; `--z-*` makes no class). */
export const zIndexCategory = {
  key: "zIndex",
  tokenKeyName: "zIndexKey",
  cssVarPrefix: "sg-z",
  themeNamespace: "--z-index-",
  classPrefixes: ["z"],
  literalScale: true,
} as const satisfies TokenCategoryDescriptor;

/** All built-in token category descriptors, in theme-key declaration order. */
export const builtInCategories = [
  colorsCategory,
  typographyCategory,
  shadowsCategory,
  backdropBlursCategory,
  borderRadiusCategory,
  fontFamilyCategory,
  borderWidthCategory,
  motionDurationCategory,
  motionEasingCategory,
  controlHeightCategory,
  iconSizeCategory,
  opacityCategory,
  zIndexCategory,
] as const satisfies readonly TokenCategoryDescriptor[];

/** One built-in category descriptor (a union of the literal descriptors). */
export type BuiltInCategory = (typeof builtInCategories)[number];

/** Every built-in category key — the `ThemeConfig` field of each descriptor. */
export type CategoryKey = BuiltInCategory["key"];

/** Keys of the categories with a `--sg-*` CSS variable (`cssVarPrefix` set). */
export type CssVarCategoryKey = Extract<
  BuiltInCategory,
  { cssVarPrefix: string }
>["key"];

/** Keys of the categories with `opacityModifier`: only they accept `coverage.<key>.opacities`. */
export type OpacityCategoryKey = Extract<
  BuiltInCategory,
  { opacityModifier: true }
>["key"];

/** Every non-empty utility class prefix a built-in category feeds. */
export type RegistryPrefix = Exclude<
  BuiltInCategory["classPrefixes"][number],
  ""
>;

/** A `TokenCategoryDescriptor` that maps into `--sg-*` variables. */
export interface CssVarCategoryDescriptor extends TokenCategoryDescriptor<CssVarCategoryKey> {
  cssVarPrefix: string;
}

/**
 * Type guard: a descriptor with a `cssVarPrefix` is a CSS-var category.
 * @param {TokenCategoryDescriptor} descriptor - Any category descriptor
 * @returns {boolean} `true` for a CSS-var category
 */
export const isCssVarCategory = (
  descriptor: TokenCategoryDescriptor,
): descriptor is CssVarCategoryDescriptor =>
  descriptor.cssVarPrefix !== undefined;

const allCategories: readonly TokenCategoryDescriptor[] = builtInCategories;

/** Built-in categories with `--sg-*` variables (all but `typography`), in declaration order. */
export const cssVarCategories: readonly CssVarCategoryDescriptor[] =
  allCategories.filter(isCssVarCategory);
