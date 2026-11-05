import { createVariantMapper } from "@duydpdev/style-generator/cva";
import {
  recipeFromTables,
  type RecipeFn,
  type RecipeTables,
} from "@duydpdev/style-generator/ui";

import { tokens } from "../../theme";

const type = createVariantMapper("", tokens.typography);

export const inputTables = {
  base: [
    "w-full outline-none transition-colors duration-150",
    createVariantMapper("bg", tokens.colors).surface,
    createVariantMapper("text", tokens.colors).foreground,
    createVariantMapper("border", tokens.colors).muted,
    createVariantMapper("border", tokens.borderWidth).thin,
    createVariantMapper("rounded", tokens.borderRadius).md,
    "focus-visible:border-primary",
    // The invalid look follows the attribute, so it is also the accessible state.
    "aria-invalid:border-danger aria-invalid:focus-visible:border-danger",
    "disabled:cursor-not-allowed disabled:opacity-50",
  ],
  variants: {
    size: {
      sm: ["h-8 px-2.5", type.text12Mono],
      md: ["h-9 px-3", type.text14Regular],
      lg: ["h-11 px-4", type.text16Medium],
    },
    placeholderColor: createVariantMapper("placeholder", tokens.colors, {
      opacities: tokens.opacities,
    }),
  },
  defaultVariants: { size: "md", placeholderColor: "muted" },
} satisfies RecipeTables;

/** `inputRecipe({ size, placeholderColor })` → class string. */
export const inputRecipe: RecipeFn = recipeFromTables(inputTables);
