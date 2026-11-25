import { createVariantMapper } from "@duydpdev/style-generator/cva";
import type {
  ColorVariant,
  RoundedVariant,
  TextVariant,
} from "@duydpdev/style-generator/types";
import {
  pick,
  recipeFromTables,
  type RecipeTables,
} from "@duydpdev/style-generator/ui";

import { tokens, type theme } from "../../theme";

/**
 * Literal classes keyed by the theme key they name: the generator emits no `hover:` or
 * `focus-visible:` variant of a theme key, so Tailwind finds these by scanning this file.
 * `satisfies` fails when a key leaves the theme.
 */
const stateClasses = {
  hover: { foreground: "hover:text-foreground" },
  focus: { focus: "focus-visible:outline-focus" },
} as const satisfies {
  hover: Partial<Record<ColorVariant<typeof theme>, string>>;
  focus: Partial<Record<ColorVariant<typeof theme>, string>>;
};

/** The theme keys the trail reads. `pick` throws on a missing key when the module loads, so `satisfies` moves that failure to the compiler. */
const themeKeys = {
  type: "text14Regular",
  muted: "muted",
  current: "foreground",
  radius: "sm",
} as const satisfies {
  type: TextVariant<typeof theme>;
  muted: ColorVariant<typeof theme>;
  current: ColorVariant<typeof theme>;
  radius: RoundedVariant<typeof theme>;
};

const text = createVariantMapper("text", tokens.colors);

/** A trail of links: `slot` picks the `list`, an `item`, a `link`, the `current` page or a `separator`. */
export const breadcrumbTables = {
  base: "",
  variants: {
    slot: {
      list: [
        "flex flex-wrap items-center gap-1.5",
        pick(createVariantMapper("", tokens.typography), themeKeys.type),
        pick(text, themeKeys.muted),
      ],
      item: "inline-flex items-center gap-1.5",
      link: [
        "underline-offset-4 transition-colors hover:underline",
        pick(
          createVariantMapper("rounded", tokens.borderRadius),
          themeKeys.radius,
        ),
        stateClasses.hover.foreground,
        `focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 ${stateClasses.focus.focus}`,
      ],
      current: pick(text, themeKeys.current),
      separator: "select-none",
    },
  },
  defaultVariants: { slot: "list" },
} satisfies RecipeTables;

/** `breadcrumbRecipe({ slot })` → the class of the list, an item, a link, the current page or a separator. */
export const breadcrumbRecipe = recipeFromTables(breadcrumbTables);
