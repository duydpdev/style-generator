import { tokens } from "../tokens";

import { createSelectRecipe, type SelectPreset } from "./factories/select";
import { textFieldPreset } from "./textarea";

/** Select roles: the text-field roles plus one `controlHeight` key per size. */
export const selectPreset = {
  ...textFieldPreset,
  height: { sm: "sm", md: "md", lg: "lg" },
} as const satisfies SelectPreset;

/** `selectRecipe({ size })` → class string. */
export const selectRecipe = createSelectRecipe(tokens, selectPreset);
