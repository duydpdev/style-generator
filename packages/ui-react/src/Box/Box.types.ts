import type { UiCn } from "../shared/cn";
import type { BodyRecipe } from "../shared/splitStyleProps";

export interface BoxDeps {
  readonly cn: UiCn;
  readonly spacing: readonly string[];
  readonly box: BodyRecipe;
}
