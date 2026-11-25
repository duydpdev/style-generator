import { tokens } from "../tokens";

import { checkboxPreset } from "./checkbox";
import {
  createPaginationRecipe,
  type PaginationPreset,
} from "./factories/pagination";

/** Pagination roles. `hover` is a literal class, so Tailwind's scanner sees it. */
export const paginationPreset = {
  current: "primary",
  background: "background",
  text: "foreground",
  muted: "muted",
  radius: "md",
  type: "text14Regular",
  height: { sm: "sm", md: "md", lg: "lg" },
  hover: "hover:bg-primary-subtle",
  focusRing: checkboxPreset.focusRing,
  disabled: checkboxPreset.disabled,
} as const satisfies PaginationPreset;

/** `paginationRecipe({ slot, size })` → the class of the list, a page, the current page or an ellipsis. */
export const paginationRecipe = createPaginationRecipe(
  tokens,
  paginationPreset,
);
