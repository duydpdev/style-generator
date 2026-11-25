import { tokens } from "../tokens";

import { checkboxPreset } from "./checkbox";
import {
  createBreadcrumbRecipe,
  type BreadcrumbPreset,
} from "./factories/breadcrumb";

/** Breadcrumb roles. `hover` is a literal class, so Tailwind's scanner sees it. */
export const breadcrumbPreset = {
  type: "text14Regular",
  muted: "muted",
  current: "foreground",
  radius: "sm",
  hover: "hover:text-foreground",
  focusRing: checkboxPreset.focusRing,
} as const satisfies BreadcrumbPreset;

/** `breadcrumbRecipe({ slot })` → the class of the list, an item, a link, the current page or a separator. */
export const breadcrumbRecipe = createBreadcrumbRecipe(
  tokens,
  breadcrumbPreset,
);
