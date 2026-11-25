import { tokens } from "../tokens";

import { checkboxPreset } from "./checkbox";
import { createTabsRecipe, type TabsPreset } from "./factories/tabs";

/** Tabs roles. `selected` and `hover` are literal classes, so Tailwind's scanner sees them; `selected` reads the `primarySelected` key. */
export const tabsPreset = {
  border: "border",
  ruleWidth: "thin",
  indicatorWidth: "thick",
  type: "text14Regular",
  muted: "muted",
  selected:
    "aria-selected:border-primary-selected aria-selected:text-primary-selected",
  hover: "hover:text-foreground",
  focusRing: checkboxPreset.focusRing,
} as const satisfies TabsPreset;

/** `tabsRecipe({ slot })` → the class of the list, a tab or a panel. */
export const tabsRecipe = createTabsRecipe(tokens, tabsPreset);
