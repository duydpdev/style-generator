import { cva, type VariantProps } from "class-variance-authority";
import { createVariantMapper } from "@duydpdev/style-generator/cva";

import { tokens } from "../tokens";

const bg = createVariantMapper("bg", tokens.colors);
const text = createVariantMapper("text", tokens.colors);
const borderColor = createVariantMapper("border", tokens.colors);
const borderWidth = createVariantMapper("border", tokens.borderWidth);
const rounded = createVariantMapper("rounded", tokens.borderRadius);
const shadow = createVariantMapper("shadow", tokens.shadows);

/** Headless card recipe: `cardRecipe({ tone, padding })`. */
export const cardRecipe = cva(
  ["relative flex flex-col", text.foreground, rounded.lg, borderWidth.thin],
  {
    variants: {
      tone: {
        surface: [bg.surface, borderColor.muted, shadow.sm],
        muted: [bg.background, borderColor.muted],
        outline: ["bg-transparent", borderColor.foreground],
      },
      padding: {
        none: "p-0",
        sm: "p-3",
        md: "p-5",
        lg: "p-8",
      },
    },
    defaultVariants: {
      tone: "surface",
      padding: "md",
    },
  },
);

export type CardVariants = VariantProps<typeof cardRecipe>;
