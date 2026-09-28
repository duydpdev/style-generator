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
 * Tailwind v4's real theme namespace for blur is `--blur-*`, NOT
 * `--backdrop-blur-*`: mapping into `--blur-<key>` makes Tailwind
 * auto-generate BOTH `.blur-<key>` (`filter: blur(...)`) AND
 * `.backdrop-blur-<key>` (`backdrop-filter: blur(...)`) from the same
 * declaration (see https://tailwindcss.com/docs/backdrop-filter-blur —
 * "Once defined, Tailwind automatically generates both sets of
 * utilities"). The pre-registry code mapped into a `--backdrop-blur-*`
 * namespace that Tailwind does not natively recognize for utility
 * generation, so this is a deliberate behavior improvement over the
 * DEV.1 baseline, not a pure refactor — declared as an explicit
 * additional difference in `registry-refactor-parity.test.ts`.
 */
export const backDropBlursCategory = defineCategory({
  key: "backDropBlurs",
  cssVarPrefix: "sg-backdrop-blur",
  themeNamespace: "--blur-",
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
