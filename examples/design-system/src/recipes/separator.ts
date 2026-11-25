import { tokens } from "../tokens";

import {
  createSeparatorRecipe,
  type SeparatorPreset,
} from "./factories/separator";

/** Separator roles: a `thin` rule in the `border` colour. */
export const separatorPreset = {
  color: "border",
  width: "thin",
} as const satisfies SeparatorPreset;

/** `separatorRecipe({ orientation })` → class string. */
export const separatorRecipe = createSeparatorRecipe(tokens, separatorPreset);
