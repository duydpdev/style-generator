import { tokens } from "../tokens";

import {
  createSkeletonRecipe,
  type SkeletonPreset,
} from "./factories/skeleton";

/** Skeleton roles: the `border` colour as fill, the `md` radius. */
export const skeletonPreset = {
  fill: "border",
  radius: "md",
} as const satisfies SkeletonPreset;

/** `skeletonRecipe()` → class string. */
export const skeletonRecipe = createSkeletonRecipe(tokens, skeletonPreset);
