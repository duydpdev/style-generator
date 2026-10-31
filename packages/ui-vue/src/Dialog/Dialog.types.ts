import type { Cn, RecipeFn } from "design-system-example/recipes";

export interface DialogDeps {
  readonly cn: Cn;
  readonly overlay: RecipeFn;
  readonly dialog: RecipeFn;
}
