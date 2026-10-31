import { createCn, type RecipeTokens } from "design-system-example/recipes";
import type { ClassValue } from "clsx";

/** The theme's `cn`, but `undefined` when empty so React renders no `class=""`. */
export type UiCn = (...inputs: ClassValue[]) => string | undefined;

export const createUiCn = (tokens: RecipeTokens): UiCn => {
  const cn = createCn(tokens);
  return (...inputs) => {
    const merged = cn(...inputs);
    return merged === "" ? undefined : merged;
  };
};
