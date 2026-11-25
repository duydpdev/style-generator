import { createVariantMapper } from "@duydpdev/style-generator/cva";
import type {
  ColorVariant,
  TextVariant,
} from "@duydpdev/style-generator/types";
import {
  pick,
  recipeFromTables,
  type RecipeTables,
} from "@duydpdev/style-generator/ui";

import { tokens, type theme } from "../../theme";

/**
 * Literal classes keyed by the theme key they name. `selected` is the `aria-selected:` line the
 * generator emits for the `primarySelected` key (`COLOR_STATES`); the generator emits no `hover:` or
 * `focus-visible:` variant of a theme key, so Tailwind finds those by scanning this file.
 * `satisfies` fails when a key leaves the theme.
 */
const stateClasses = {
  selected: {
    primarySelected:
      "aria-selected:border-primary-selected aria-selected:text-primary-selected",
  },
  hover: { foreground: "hover:text-foreground" },
  focus: { focus: "focus-visible:outline-focus" },
} as const satisfies {
  selected: Partial<Record<ColorVariant<typeof theme>, string>>;
  hover: Partial<Record<ColorVariant<typeof theme>, string>>;
  focus: Partial<Record<ColorVariant<typeof theme>, string>>;
};

/** The theme keys the tabs read: the list rule and a tab's indicator. `pick` throws on a missing key when the module loads, so `satisfies` moves that failure to the compiler. */
const themeKeys = {
  border: "border",
  // A tab overlaps the rule with `-mb-px`, so this key must be 1px.
  ruleWidth: "thin",
  indicatorWidth: "thick",
  type: "text14Regular",
  muted: "muted",
} as const satisfies {
  border: ColorVariant<typeof theme>;
  ruleWidth: keyof (typeof theme)["borderWidth"];
  indicatorWidth: keyof (typeof theme)["borderWidth"];
  type: TextVariant<typeof theme>;
  muted: ColorVariant<typeof theme>;
};

const borderB = createVariantMapper("border-b", tokens.borderWidth);
const focus = `focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 ${stateClasses.focus.focus}`;

/** `role="tablist"`, `role="tab"` and `role="tabpanel"`: `slot` picks the `list`, a `tab` or a `panel`. */
export const tabsTables = {
  base: "",
  variants: {
    slot: {
      list: [
        "flex gap-1",
        pick(borderB, themeKeys.ruleWidth),
        pick(createVariantMapper("border", tokens.colors), themeKeys.border),
      ],
      tab: [
        "-mb-px inline-flex cursor-pointer items-center border-transparent px-3 py-2 transition-colors",
        pick(borderB, themeKeys.indicatorWidth),
        pick(createVariantMapper("", tokens.typography), themeKeys.type),
        pick(createVariantMapper("text", tokens.colors), themeKeys.muted),
        stateClasses.hover.foreground,
        stateClasses.selected.primarySelected,
        focus,
      ],
      panel: ["pt-4", focus],
    },
  },
  defaultVariants: { slot: "list" },
} satisfies RecipeTables;

/** `tabsRecipe({ slot })` → the class of the list, a tab or a panel. */
export const tabsRecipe = recipeFromTables(tabsTables);
