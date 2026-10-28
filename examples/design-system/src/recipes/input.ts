import { cva, type VariantProps } from "class-variance-authority";
import { createVariantMapper } from "@duydpdev/style-generator/cva";

import { tokens } from "../tokens";

const bg = createVariantMapper("bg", tokens.colors);
const text = createVariantMapper("text", tokens.colors);
const borderColor = createVariantMapper("border", tokens.colors);
const borderWidth = createVariantMapper("border", tokens.borderWidth);
const rounded = createVariantMapper("rounded", tokens.borderRadius);
const type = createVariantMapper("", tokens.typography);

/** Headless text-input recipe: `inputRecipe({ size, invalid })`. */
export const inputRecipe = cva(
  [
    "w-full outline-none transition-colors duration-150",
    "placeholder:text-muted",
    "focus-visible:border-primary",
    "disabled:cursor-not-allowed disabled:opacity-50",
    bg.surface,
    text.foreground,
    borderWidth.thin,
    rounded.md,
    type.text14Regular,
  ],
  {
    variants: {
      size: {
        sm: "h-8 px-2.5",
        md: "h-9 px-3",
        lg: "h-11 px-4",
      },
      invalid: {
        true: borderColor.danger,
        false: borderColor.muted,
      },
    },
    defaultVariants: {
      size: "md",
      invalid: false,
    },
  },
);

export type InputVariants = VariantProps<typeof inputRecipe>;
