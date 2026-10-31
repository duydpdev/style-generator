import type { UiCn } from "../shared/cn";
import type { BodyRecipe } from "../shared/splitStyleProps";

export interface DialogDeps {
  readonly cn: UiCn;
  readonly overlay: BodyRecipe;
  readonly dialog: BodyRecipe;
}
