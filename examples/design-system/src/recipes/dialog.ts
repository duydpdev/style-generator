import { cva, type VariantProps } from "class-variance-authority";
import { createVariantMapper } from "@duydpdev/style-generator/cva";

import { tokens } from "../tokens";

const bg = createVariantMapper("bg", tokens.colors);
const text = createVariantMapper("text", tokens.colors);
const borderColor = createVariantMapper("border", tokens.colors);
const borderWidth = createVariantMapper("border", tokens.borderWidth);
const rounded = createVariantMapper("rounded", tokens.borderRadius);
const shadow = createVariantMapper("shadow", tokens.shadows);
const blur = createVariantMapper("backdrop-blur", tokens.backDropBlurs);

/** Headless dialog backdrop recipe: `dialogOverlayRecipe({ blur })`. */
export const dialogOverlayRecipe = cva(
  "fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4",
  {
    variants: {
      blur: {
        none: "",
        sm: blur.sm,
        md: blur.md,
        lg: blur.lg,
      },
    },
    defaultVariants: {
      blur: "md",
    },
  },
);

/** Headless dialog panel recipe: `dialogRecipe({ size })`. */
export const dialogRecipe = cva(
  [
    "relative flex w-full flex-col gap-4 p-6",
    bg.surface,
    text.foreground,
    borderColor.muted,
    borderWidth.thin,
    rounded.lg,
    shadow.lg,
  ],
  {
    variants: {
      size: {
        sm: "max-w-sm",
        md: "max-w-md",
        lg: "max-w-lg",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

export type DialogOverlayVariants = VariantProps<typeof dialogOverlayRecipe>;
export type DialogVariants = VariantProps<typeof dialogRecipe>;
