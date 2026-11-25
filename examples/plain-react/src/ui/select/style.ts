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

/** Literal classes keyed by the theme key they name: the generator emits no `focus-visible:`/`aria-invalid:`/`disabled:` variant of a theme key, so Tailwind finds these by scanning this file. `satisfies` fails when a key leaves the theme. */
const stateClasses = {
  focus: { focus: "focus-visible:border-focus" },
  // The invalid look follows the attribute, so it is also the accessible state.
  invalid: {
    danger:
      "aria-invalid:border-danger aria-invalid:focus-visible:border-danger",
  },
  disabled: {
    disabled: "disabled:cursor-not-allowed disabled:opacity-disabled",
  },
} as const satisfies {
  focus: Partial<Record<ColorVariant<typeof theme>, string>>;
  invalid: Partial<Record<ColorVariant<typeof theme>, string>>;
  disabled: Partial<Record<keyof (typeof theme)["opacity"], string>>;
};

/** The other theme keys the select reads: the text-field keys and one `controlHeight` key per size. `pick` throws on a missing key when the module loads, so `satisfies` moves that failure to the compiler. */
const themeKeys = {
  background: "surface",
  text: "foreground",
  border: "muted",
  borderWidth: "thin",
  radius: "md",
  placeholder: "muted",
  type: { sm: "text12Mono", md: "text14Regular", lg: "text16Medium" },
  height: { sm: "sm", md: "md", lg: "lg" },
} as const satisfies {
  background: ColorVariant<typeof theme>;
  text: ColorVariant<typeof theme>;
  border: ColorVariant<typeof theme>;
  borderWidth: keyof (typeof theme)["borderWidth"];
  radius: RoundedVariant<typeof theme>;
  placeholder: ColorVariant<typeof theme>;
  type: Record<"sm" | "md" | "lg", TextVariant<typeof theme>>;
  height: Record<"sm" | "md" | "lg", keyof (typeof theme)["controlHeight"]>;
};

const type = createVariantMapper("", tokens.typography);
const height = createVariantMapper("h-control", tokens.controlHeight);

/** A styled native `<select>`: `size` sets the height, padding and type style; the browser draws the arrow. */
export const selectTables = {
  base: [
    "cursor-pointer",
    "w-full outline-none transition-colors duration-150",
    pick(createVariantMapper("bg", tokens.colors), themeKeys.background),
    pick(createVariantMapper("text", tokens.colors), themeKeys.text),
    pick(createVariantMapper("border", tokens.colors), themeKeys.border),
    pick(
      createVariantMapper("border", tokens.borderWidth),
      themeKeys.borderWidth,
    ),
    pick(createVariantMapper("rounded", tokens.borderRadius), themeKeys.radius),
    pick(
      createVariantMapper("placeholder", tokens.colors),
      themeKeys.placeholder,
    ),
    stateClasses.focus.focus,
    stateClasses.invalid.danger,
    stateClasses.disabled.disabled,
  ],
  variants: {
    size: {
      sm: [
        pick(height, themeKeys.height.sm),
        "px-2",
        pick(type, themeKeys.type.sm),
      ],
      md: [
        pick(height, themeKeys.height.md),
        "px-2.5",
        pick(type, themeKeys.type.md),
      ],
      lg: [
        pick(height, themeKeys.height.lg),
        "px-3",
        pick(type, themeKeys.type.lg),
      ],
    },
  },
  defaultVariants: { size: "md" },
} satisfies RecipeTables;

/** `selectRecipe({ size })` → class string. */
export const selectRecipe = recipeFromTables(selectTables);
