import { tokens } from "../tokens";

import {
  createTextareaRecipe,
  type TextFieldPreset,
} from "./factories/textarea";

/** Text-field roles shared by the textarea and the select. `focus`, `invalid` and `disabled` are literal classes, so Tailwind's scanner sees them. */
export const textFieldPreset = {
  background: "surface",
  text: "foreground",
  border: "muted",
  borderWidth: "thin",
  radius: "md",
  placeholder: "muted",
  type: { sm: "text12Mono", md: "text14Regular", lg: "text16Medium" },
  focus: "focus-visible:border-focus",
  invalid:
    "aria-invalid:border-danger aria-invalid:focus-visible:border-danger",
  disabled: "disabled:cursor-not-allowed disabled:opacity-disabled",
} as const satisfies TextFieldPreset;

/** `textareaRecipe({ size })` → class string. */
export const textareaRecipe = createTextareaRecipe(tokens, textFieldPreset);
