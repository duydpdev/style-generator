import { createListRecipe } from "design-system-example/recipes";

import type { ListDeps } from "./List.types";

export const createListStyles = (): Pick<ListDeps, "list"> => ({
  list: createListRecipe(),
});
