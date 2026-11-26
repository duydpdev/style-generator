/**
 * Subpath `@duydpdev/style-generator/ui`: styleless, framework-free kit of recipes, a theme-aware `cn` and prop splitters.
 * Its runtime imports (`class-variance-authority`, `clsx`, `tailwind-merge`) are optional peers; not re-exported from the root.
 */
export { contrastText, pick, recipeFromTables } from "../features/ui/recipe";
export type {
  RecipeFn,
  RecipeProps,
  RecipeVariantProps,
  RecipeTables,
  RecipeTokens,
  VariantTable,
} from "../features/ui/recipe";
export { createCn } from "../features/ui/cn";
export type { Cn } from "../features/ui/cn";
export { mergeStyle, splitLayout, splitSpacing } from "../features/ui/layout";
export type {
  SplitLayoutOptions,
  Split,
  StyleRecord,
  ThemeSpacingProps,
} from "../features/ui/layout";
