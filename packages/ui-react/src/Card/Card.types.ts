import type { UiCn } from "../shared/cn";
import type { BodyRecipe } from "../shared/splitStyleProps";

export interface CardDeps {
  readonly cn: UiCn;
  readonly spacing: readonly string[];
  readonly card: BodyRecipe;
}
