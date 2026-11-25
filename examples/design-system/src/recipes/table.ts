import { tokens } from "../tokens";

import { createTableRecipe, type TablePreset } from "./factories/table";

/** Table roles: body text on `foreground`, monospace `muted` headers, a `thin` rule under each row. */
export const tablePreset = {
  type: { body: "text14Regular", header: "text12Mono" },
  text: "foreground",
  muted: "muted",
  border: "border",
  borderWidth: "thin",
} as const satisfies TablePreset;

/** `tableRecipe({ slot, align })` → class string. */
export const tableRecipe = createTableRecipe(tokens, tablePreset);
