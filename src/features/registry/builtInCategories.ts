import {
  DEFAULT_BORDER_VALUES,
  DEFAULT_ROUNDED_VALUES,
} from "../../shared/defaultOption";
import {
  borderProperties,
  roundedProperties,
} from "../../shared/safelistProperties";

import {
  defineCategory,
  TokenCategoryDescriptor,
} from "./TokenCategoryDescriptor";

/**
 * `colors` — flat camelCase palette. Feeds `bg-*`/`text-*`/`border-*`
 * utilities through Tailwind v4's `--color-*` `@theme` namespace.
 */
export const colorsCategory = defineCategory({
  key: "colors",
  cssVarPrefix: "sg",
  themeNamespace: "--color-",
  classPrefixes: ["bg", "text", "border"],
});

/**
 * `typography` — custom named text styles (e.g. `text12Mono` →
 * `.text-12-mono`). Has no Tailwind `@theme` namespace of its own — the
 * token key already carries the full class name, so `classPrefixes` is a
 * single empty-string entry and the CSS is emitted as `@utility <key> {…}`
 * by `generateTypographyCss` rather than through `flattenByCategory`.
 */
export const typographyCategory = defineCategory({
  key: "typography",
  classPrefixes: [""],
});

/** `shadows` — named `box-shadow` presets, feeds `shadow-*` utilities. */
export const shadowsCategory = defineCategory({
  key: "shadows",
  cssVarPrefix: "sg-shadow",
  themeNamespace: "--shadow-",
  classPrefixes: ["shadow"],
});

/**
 * `backDropBlurs` — named blur presets.
 *
 * Maps into `--backdrop-blur-*`, which Tailwind v4's `backdrop-blur-*`
 * utility resolves (the DEV.1 baseline fixture compiles
 * `.backdrop-blur-sm` to `blur(var(--sg-backdrop-blur-sm))`). `--blur-*`
 * is deliberately NOT used: it would also redefine the `blur-*` filter
 * scale and override Tailwind's default `--blur-sm`/`md`/`lg` values.
 */
export const backDropBlursCategory = defineCategory({
  key: "backDropBlurs",
  cssVarPrefix: "sg-backdrop-blur",
  themeNamespace: "--backdrop-blur-",
  classPrefixes: ["backdrop-blur"],
});

/**
 * `borderRadius` — named radius presets, responsive (`md:rounded-sm`, …)
 * to match the pre-registry `responsiveModules` default of
 * `["layout", "rounded"]`.
 */
export const borderRadiusCategory = defineCategory({
  key: "borderRadius",
  cssVarPrefix: "sg-radius",
  themeNamespace: "--radius-",
  classPrefixes: roundedProperties,
  responsive: true,
  defaultValues: DEFAULT_ROUNDED_VALUES,
});

/**
 * `border` — border widths. Unlike the other categories this has no CSS
 * variable / `@theme` representation: Tailwind v4's border-width utilities
 * (`border-2`, `border-4`, …) already resolve to a fixed built-in scale,
 * not a theme-configurable namespace. The descriptor exists purely as
 * registry metadata (class prefixes + default width values) for future
 * `@source inline` emission (DEV.5); `flattenByCategory` returns `{}` for
 * it since there is nothing to flatten into a CSS variable.
 */
export const borderCategory = defineCategory({
  key: "border",
  classPrefixes: borderProperties,
  defaultValues: DEFAULT_BORDER_VALUES,
});

/** All built-in token category descriptors, in theme-key declaration order. */
export const builtInCategories: readonly TokenCategoryDescriptor[] = [
  colorsCategory,
  typographyCategory,
  shadowsCategory,
  backDropBlursCategory,
  borderRadiusCategory,
  borderCategory,
];
