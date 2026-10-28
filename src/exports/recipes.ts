/**
 * Subpath: `@duydpdev/style-generator/recipes`
 *
 * Browser-safe integration recipes for component code: a `tailwind-merge`
 * extension for the theme's custom tokens, typed spacing props, and the DOM
 * attributes of the active theme axes. Not re-exported from the root.
 * `tailwind-merge` is the app's own dependency — nothing here imports it.
 */
export { createTailwindMergeExtension } from "../features/recipes/extendTailwindMerge";
export type {
  TailwindMergeExtension,
  TailwindMergeTokens,
} from "../features/recipes/extendTailwindMerge";
export { splitSpacingProps } from "../features/recipes/spacingProps";
export type { SpacingProps } from "../features/recipes/spacingProps";
export { themeAxisAttributes } from "../features/recipes/themeAxisAttributes";
