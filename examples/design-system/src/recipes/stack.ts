import { cva, type VariantProps } from "class-variance-authority";

/**
 * Headless flex-stack recipe: `stackRecipe({ direction, align, justify, wrap })`.
 * The gap is not a variant: pass the responsive `gap` / `gapX` / `gapY` spacing
 * props through `splitSpacingProps`.
 */
export const stackRecipe = cva("flex", {
  variants: {
    direction: {
      column: "flex-col",
      row: "flex-row",
    },
    align: {
      start: "items-start",
      center: "items-center",
      end: "items-end",
      stretch: "items-stretch",
    },
    justify: {
      start: "justify-start",
      center: "justify-center",
      end: "justify-end",
      between: "justify-between",
    },
    wrap: {
      true: "flex-wrap",
    },
  },
  defaultVariants: {
    direction: "column",
  },
});

export type StackVariants = VariantProps<typeof stackRecipe>;
