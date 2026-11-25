import { tokens } from "../tokens";

import { intents } from "./button";
import { createAlertRecipe, type AlertPreset } from "./factories/alert";

/** Alert roles: the button intents, the `md` radius and `thin` border, `text14Regular` body and `text16Medium` title. */
export const alertPreset = {
  intents,
  radius: "md",
  borderWidth: "thin",
  background: "background",
  type: { body: "text14Regular", title: "text16Medium" },
} as const satisfies AlertPreset;

/** `alertRecipe({ slot, color, variant })` → class string. */
export const alertRecipe = createAlertRecipe(tokens, alertPreset);
