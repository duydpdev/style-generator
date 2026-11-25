import { createVariantMapper } from "@duydpdev/style-generator/cva";
import {
  pick,
  recipeFromTables,
  type RecipeTables,
  type RecipeTokens,
} from "@duydpdev/style-generator/ui";

/** Skeleton roles: the placeholder fill and radius. */
export interface SkeletonPreset {
  readonly fill: string;
  readonly radius: string;
}

/** A pulsing placeholder with no prop axis: the app sets its width and height. It stops pulsing under `prefers-reduced-motion`. */
export const skeletonTables = (t: RecipeTokens, preset: SkeletonPreset) =>
  ({
    base: [
      "block animate-pulse motion-reduce:animate-none",
      pick(createVariantMapper("bg", t.colors), preset.fill),
      pick(createVariantMapper("rounded", t.borderRadius), preset.radius),
    ],
    variants: {},
  }) satisfies RecipeTables;

export const createSkeletonRecipe = (t: RecipeTokens, preset: SkeletonPreset) =>
  recipeFromTables(skeletonTables(t, preset));
