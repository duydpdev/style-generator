import { tokens } from "../tokens";

import { checkboxPreset } from "./checkbox";
import {
  createAccordionRecipe,
  type AccordionPreset,
} from "./factories/accordion";

/** Accordion roles: a `thin` rule under each item, the `fast` chevron turn. */
export const accordionPreset = {
  border: "border",
  borderWidth: "thin",
  type: { title: "text16Medium", body: "text14Regular" },
  title: "foreground",
  body: "muted",
  icon: "sm",
  duration: "fast",
  easing: "standard",
  focusRing: checkboxPreset.focusRing,
} as const satisfies AccordionPreset;

/** `accordionRecipe({ slot })` → the class of the root, an item, its trigger, the chevron or the content. */
export const accordionRecipe = createAccordionRecipe(tokens, accordionPreset);
