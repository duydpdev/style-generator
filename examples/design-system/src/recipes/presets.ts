import { badgePreset } from "./badge";
import { boxPreset } from "./box";
import { buttonPreset } from "./button";
import { cardPreset } from "./card";
import { dialogPreset } from "./dialog";
import { inputPreset } from "./input";
import { selectPreset } from "./select";
import { textPreset } from "./text";

/** The design-system's role map: `createUi(tokens, presets)` in react-v4, next-v4 and nuxt-v4. */
export const presets = {
  box: boxPreset,
  text: textPreset,
  button: buttonPreset,
  badge: badgePreset,
  card: cardPreset,
  input: inputPreset,
  select: selectPreset,
  dialog: dialogPreset,
} as const;
