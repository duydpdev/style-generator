import { tokens } from "../tokens";

import { checkboxPreset } from "./checkbox";
import { createSwitchRecipe, type SwitchPreset } from "./factories/switch";

/** Switch roles. `checked`, `track` and `travel` are literal classes, so Tailwind's scanner sees them; `track` and `travel` read the `--sg-icon-*` theme variables. */
export const switchPreset = {
  intents: checkboxPreset.intents,
  off: "muted",
  thumb: "surface",
  radius: "pill",
  checked: {
    primary: "aria-checked:bg-primary",
    secondary: "aria-checked:bg-secondary",
    success: "aria-checked:bg-success",
    danger: "aria-checked:bg-danger",
  },
  size: { sm: "sm", md: "md", lg: "lg" },
  track: {
    sm: "h-[calc(var(--sg-icon-sm)+0.25rem)] w-[calc(var(--sg-icon-sm)*2+0.25rem)]",
    md: "h-[calc(var(--sg-icon-md)+0.25rem)] w-[calc(var(--sg-icon-md)*2+0.25rem)]",
    lg: "h-[calc(var(--sg-icon-lg)+0.25rem)] w-[calc(var(--sg-icon-lg)*2+0.25rem)]",
  },
  travel: {
    sm: "group-aria-checked:translate-x-(--sg-icon-sm)",
    md: "group-aria-checked:translate-x-(--sg-icon-md)",
    lg: "group-aria-checked:translate-x-(--sg-icon-lg)",
  },
  focusRing: checkboxPreset.focusRing,
  disabled: checkboxPreset.disabled,
} as const satisfies SwitchPreset;

/** `switchRecipe({ slot, color, size })` → the class of the track or the thumb. */
export const switchRecipe = createSwitchRecipe(tokens, switchPreset);
