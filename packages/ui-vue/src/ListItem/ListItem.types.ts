import type { Cn, RecipeFn } from "design-system-example/recipes";

export interface ListItemDeps {
  readonly cn: Cn;
  readonly spacing: readonly string[];
  readonly layout: RecipeFn;
}
