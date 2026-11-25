import { tokens } from "../tokens";

import { createFieldRecipe, type FieldPreset } from "./factories/field";

/** Field roles: one type style; label, hint and error colours. */
export const fieldPreset = {
  type: "text14Regular",
  label: "foreground",
  hint: "muted",
  error: "danger",
} as const satisfies FieldPreset;

/** `fieldRecipe({ slot })` → the class of one field slot (`root`, `label`, `hint`, `error`). */
export const fieldRecipe = createFieldRecipe(tokens, fieldPreset);
