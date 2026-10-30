import { createContainerRecipe } from "./factories/container";

/** Headless container recipe: `containerRecipe()` → `"mx-auto w-full"`. */
export const containerRecipe: () => string = createContainerRecipe();
