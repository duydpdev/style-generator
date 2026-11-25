import { createVariantMapper } from "@duydpdev/style-generator/cva";
import type { ColorVariant } from "@duydpdev/style-generator/types";
import {
  recipeFromTables,
  type RecipeTables,
} from "@duydpdev/style-generator/ui";

import { tokens, type theme } from "../../theme";

const type = createVariantMapper("", tokens.typography);
const height = createVariantMapper("h-control", tokens.controlHeight);

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

export const inputTables = {
  base: [
    "w-full outline-none transition-colors duration-150",
    createVariantMapper("bg", tokens.colors).surface,
    createVariantMapper("text", tokens.colors).foreground,
    createVariantMapper("border", tokens.colors).muted,
    createVariantMapper("border", tokens.borderWidth).thin,
    createVariantMapper("rounded", tokens.borderRadius).md,
    stateClasses.focus.focus,
    stateClasses.invalid.danger,
    stateClasses.disabled.disabled,
  ],
  variants: {
    size: {
      sm: [height.sm, "px-2.5", type.text12Mono],
      md: [height.md, "px-3", type.text14Regular],
      lg: [height.lg, "px-4", type.text16Medium],
    },
    placeholderColor: createVariantMapper("placeholder", tokens.colors, {
      opacities: tokens.opacities,
    }),
  },
  defaultVariants: { size: "md", placeholderColor: "muted" },
} satisfies RecipeTables;

/** `inputRecipe({ size, placeholderColor })` → class string. */
export const inputRecipe = recipeFromTables(inputTables);
