import type { Cn, RecipeFn } from "design-system-example/recipes";

export interface ContainerDeps {
  readonly cn: Cn;
  readonly spacing: readonly string[];
  readonly layout: RecipeFn;
  readonly container: RecipeFn;
}
