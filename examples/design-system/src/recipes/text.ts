import { cva, type VariantProps } from "class-variance-authority";
import { createVariantMapper } from "@duydpdev/style-generator/cva";
import type {
  ColorVariant,
  TextVariant,
} from "@duydpdev/style-generator/types";

import { tokens, type Theme } from "../tokens";

export const textAlign = ["left", "center", "right"] as const;
export const textDecoration = ["underline", "lineThrough", "none"] as const;

/**
 * Headless text recipe: `textRecipe({ type, color, decoration, align })`.
 * `type` is a typography utility (`text-16-medium`), `color` a `text-*` color.
 */
export const textRecipe = cva("wrap-anywhere whitespace-pre-wrap", {
  variants: {
    type: createVariantMapper("", tokens.typography),
    decoration: {
      underline: "underline",
      lineThrough: "line-through",
      none: "no-underline",
    },
    align: {
      center: "text-center",
      left: "text-left",
      right: "text-right",
    },
    color: createVariantMapper("text", tokens.colors),
  },
});

export type TextVariants = VariantProps<typeof textRecipe>;

/** Props a framework `Text` component adds on top of the element's own props. */
export interface TextStyleProps {
  type?: TextVariant<Theme>;
  color?: ColorVariant<Theme>;
  decoration?: (typeof textDecoration)[number];
  align?: (typeof textAlign)[number];
}
