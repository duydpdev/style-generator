import { cva, type VariantProps } from "class-variance-authority";
import { createVariantMapper } from "@duydpdev/style-generator/cva";

import { tokens } from "../tokens";

import { intents, type Intent } from "./button";

const bg = createVariantMapper("bg", tokens.colors);
const text = createVariantMapper("text", tokens.colors);
const rounded = createVariantMapper("rounded", tokens.borderRadius);
const borderWidth = createVariantMapper("border", tokens.borderWidth);
const type = createVariantMapper("", tokens.typography);

// Opacity-modified classes (`bg-primary/10`) stay literal: the registry's
// `@source inline` coverage has none, Tailwind's scanner reads them here.
const soft = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/10 text-secondary",
  success: "bg-success/10 text-success",
  danger: "bg-danger/10 text-danger",
} as const satisfies Record<Intent, string>;

const solid = {
  primary: [bg.primary, text.onPrimary],
  secondary: [bg.secondary, text.background],
  success: [bg.success, text.background],
  danger: [bg.danger, text.background],
} as const satisfies Record<Intent, readonly string[]>;

const outline = {
  primary: "border-primary text-primary",
  secondary: "border-secondary text-secondary",
  success: "border-success text-success",
  danger: "border-danger text-danger",
} as const satisfies Record<Intent, string>;

/** Headless badge recipe: `badgeRecipe({ color, variant })`. */
export const badgeRecipe = cva(
  [
    "inline-flex items-center gap-1 whitespace-nowrap px-2 py-0.5",
    rounded.pill,
    borderWidth.thin,
    type.text12Mono,
  ],
  {
    variants: {
      color: { primary: "", secondary: "", success: "", danger: "" },
      variant: {
        soft: "border-transparent",
        solid: "border-transparent",
        outline: "bg-transparent",
      },
    },
    compoundVariants: intents.flatMap((color) => [
      { color, variant: "soft" as const, class: soft[color] },
      { color, variant: "solid" as const, class: [...solid[color]] },
      { color, variant: "outline" as const, class: outline[color] },
    ]),
    defaultVariants: {
      color: "primary",
      variant: "soft",
    },
  },
);

export type BadgeVariants = VariantProps<typeof badgeRecipe>;
