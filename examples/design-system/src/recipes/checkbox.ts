import { tokens } from "../tokens";

import { intents } from "./button";
import { createCheckboxRecipe, type TogglePreset } from "./factories/checkbox";

/** Literal classes, so Tailwind's scanner sees them: the registry emits no `accent-*` utility. */
export const toggleAccent = {
  primary: "accent-primary",
  secondary: "accent-secondary",
  success: "accent-success",
  danger: "accent-danger",
} as const;

/** Checkbox (and radio) roles: the button intents, one `iconSize` key per size. */
export const checkboxPreset = {
  intents,
  accent: toggleAccent,
  size: { sm: "sm", md: "md", lg: "lg" },
  focusRing: "focus-visible:outline-focus",
  disabled: "disabled:cursor-not-allowed disabled:opacity-disabled",
} as const satisfies TogglePreset;

/** `checkboxRecipe({ color, size })` → class string. */
export const checkboxRecipe = createCheckboxRecipe(tokens, checkboxPreset);
