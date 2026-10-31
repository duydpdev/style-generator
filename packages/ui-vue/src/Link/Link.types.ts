import type { Cn, RecipeFn } from "design-system-example/recipes";

export interface LinkDeps {
  readonly cn: Cn;
  readonly spacing: readonly string[];
  readonly link: RecipeFn;
}
