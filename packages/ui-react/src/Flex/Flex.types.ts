import type { UiCn } from "../shared/cn";
import type { BodyRecipe } from "../shared/splitStyleProps";

export interface FlexDeps {
  readonly cn: UiCn;
  readonly spacing: readonly string[];
  readonly layout: BodyRecipe;
  readonly stack: BodyRecipe;
}
