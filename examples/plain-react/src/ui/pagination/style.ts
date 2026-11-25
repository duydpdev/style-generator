import { createVariantMapper } from "@duydpdev/style-generator/cva";
import type {
  ColorVariant,
  RoundedVariant,
  TextVariant,
} from "@duydpdev/style-generator/types";
import {
  contrastText,
  pick,
  recipeFromTables,
  type RecipeTables,
} from "@duydpdev/style-generator/ui";

import { tokens, type theme } from "../../theme";

/**
 * Literal classes keyed by the theme key they name: the generator emits no `hover:`,
 * `focus-visible:` or `disabled:` variant of a theme key, so Tailwind finds these by scanning
 * this file. `satisfies` fails when a key leaves the theme.
 */
const stateClasses = {
  hover: { primarySubtle: "hover:bg-primary-subtle" },
  focus: { focus: "focus-visible:outline-focus" },
  disabled: {
    disabled: "disabled:cursor-not-allowed disabled:opacity-disabled",
  },
} as const satisfies {
  hover: Partial<Record<ColorVariant<typeof theme>, string>>;
  focus: Partial<Record<ColorVariant<typeof theme>, string>>;
  disabled: Partial<Record<keyof (typeof theme)["opacity"], string>>;
};

/** The theme keys the pages read. `pick` throws on a missing key when the module loads, so `satisfies` moves that failure to the compiler. */
const themeKeys = {
  current: "primary",
  background: "background",
  text: "foreground",
  muted: "muted",
  radius: "md",
  type: "text14Regular",
  height: { sm: "sm", md: "md", lg: "lg" },
} as const satisfies {
  current: ColorVariant<typeof theme>;
  background: ColorVariant<typeof theme>;
  text: ColorVariant<typeof theme>;
  muted: ColorVariant<typeof theme>;
  radius: RoundedVariant<typeof theme>;
  type: TextVariant<typeof theme>;
  height: Record<"sm" | "md" | "lg", keyof (typeof theme)["controlHeight"]>;
};

const text = createVariantMapper("text", tokens.colors);
const height = createVariantMapper("h-control", tokens.controlHeight);
const button = [
  "inline-flex min-w-0 shrink-0 cursor-pointer items-center justify-center px-3 transition-colors",
  pick(createVariantMapper("rounded", tokens.borderRadius), themeKeys.radius),
  pick(createVariantMapper("", tokens.typography), themeKeys.type),
  `focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 ${stateClasses.focus.focus}`,
];

/** Page buttons: `slot` picks the `list`, a `page` button, the `current` page or an `ellipsis`; `size` sets their height. */
export const paginationTables = {
  base: "",
  variants: {
    slot: {
      list: "flex flex-wrap items-center gap-1",
      page: [
        ...button,
        pick(text, themeKeys.text),
        stateClasses.hover.primarySubtle,
        stateClasses.disabled.disabled,
      ],
      current: [
        ...button,
        pick(createVariantMapper("bg", tokens.colors), themeKeys.current),
        contrastText(tokens.colors, themeKeys.current, themeKeys.background),
      ],
      ellipsis: [
        "inline-flex items-center justify-center px-2 select-none",
        pick(text, themeKeys.muted),
      ],
    },
    size: { sm: "", md: "", lg: "" },
  },
  compoundVariants: (["page", "current", "ellipsis"] as const).flatMap((slot) =>
    (["sm", "md", "lg"] as const).map((size) => ({
      slot,
      size,
      class: pick(height, themeKeys.height[size]),
    })),
  ),
  defaultVariants: { slot: "list", size: "md" },
} satisfies RecipeTables;

/** `paginationRecipe({ slot, size })` → the class of the list, a page, the current page or an ellipsis. */
export const paginationRecipe = recipeFromTables(paginationTables);
