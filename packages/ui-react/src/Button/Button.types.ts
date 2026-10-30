import type { UiCn } from "../shared/cn";
import type { BodyRecipe } from "../shared/splitStyleProps";

export interface ButtonDeps {
  readonly cn: UiCn;
  readonly spacing: readonly string[];
  readonly button: BodyRecipe;
}
