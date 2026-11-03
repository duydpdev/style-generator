/**
 * Subpath: `@duydpdev/style-generator/ui`
 *
 * The styleless kit for building components over a theme: recipes from
 * plain class tables (`class-variance-authority`), a theme-aware `cn`
 * (`clsx` + `tailwind-merge`) and the layout/spacing prop splitters.
 * Browser-safe and framework-free; React types live in `./ui-react`.
 * Its three runtime imports are optional peer dependencies the app
 * installs. Not re-exported from the root.
 */
export { contrastText, pick, recipeFromTables } from "../features/ui/recipe";
export type {
  RecipeFn,
  RecipeProps,
  RecipeTables,
  RecipeTokens,
  VariantTable,
} from "../features/ui/recipe";
export { createCn } from "../features/ui/cn";
export type { Cn } from "../features/ui/cn";
export { mergeStyle, splitLayout, splitSpacing } from "../features/ui/layout";
export type {
  Split,
  StyleRecord,
  ThemeSpacingProps,
} from "../features/ui/layout";
