import { cva, type VariantProps } from "class-variance-authority";
import {
  COLOR_STATES,
  createVariantMapper,
} from "@duydpdev/style-generator/cva";
import type { ColorVariant } from "@duydpdev/style-generator/types";

import { tokens, type Theme } from "../tokens";

/**
 * The semantic intents the components expose. `satisfies` is the DX anchor:
 * rename or remove one of these colors in `theme.json` and the compiler fails
 * here, on the exact line, instead of silently shipping a class that no
 * longer exists (an `Extract<…>` would silently drop it).
 */
export const intents = [
  "primary",
  "secondary",
  "success",
  "danger",
] as const satisfies readonly ColorVariant<Theme>[];

export type Intent = (typeof intents)[number];

// `bg-primary hover:bg-primary-hover active:bg-primary-active`: the state
// siblings (`primaryHover`, `primaryActive`) declared in theme.json collapse
// into one chained class per color.
const bg = createVariantMapper("bg", tokens.colors, { states: COLOR_STATES });
const text = createVariantMapper("text", tokens.colors);

const fill = {
  primary: [bg.primary, text.onPrimary],
  secondary: [bg.secondary, "text-background hover:opacity-90"],
  success: [bg.success, "text-background hover:opacity-90"],
  danger: [bg.danger, "text-background hover:opacity-90"],
} satisfies Record<Intent, string[]>;

// Opacity-modified classes are not part of the registry's `@source inline`
// coverage; they stay literal so Tailwind's scanner finds them in this file.
const tint = {
  primary: {
    outline: "border-primary text-primary hover:bg-primary/10",
    soft: "bg-primary/10 text-primary hover:bg-primary/15",
    ghost: "text-primary hover:bg-primary/10",
    link: "text-primary",
  },
  secondary: {
    outline: "border-secondary text-secondary hover:bg-secondary/10",
    soft: "bg-secondary/10 text-secondary hover:bg-secondary/15",
    ghost: "text-secondary hover:bg-secondary/10",
    link: "text-secondary",
  },
  success: {
    outline: "border-success text-success hover:bg-success/10",
    soft: "bg-success/10 text-success hover:bg-success/15",
    ghost: "text-success hover:bg-success/10",
    link: "text-success",
  },
  danger: {
    outline: "border-danger text-danger hover:bg-danger/10",
    soft: "bg-danger/10 text-danger hover:bg-danger/15",
    ghost: "text-danger hover:bg-danger/10",
    link: "text-danger",
  },
} as const satisfies Record<
  Intent,
  Record<"outline" | "soft" | "ghost" | "link", string>
>;

const tintedVariants = ["outline", "soft", "ghost", "link"] as const;

/**
 * Headless button recipe: `buttonRecipe({ variant, color, size })` → class
 * string. The framework components (`Button.tsx`, `Button.vue`) wrap it with
 * their own markup and `cn(buttonRecipe(…), className)`.
 */
export const buttonRecipe = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-1.5",
    "rounded-md border",
    "cursor-pointer text-16-medium whitespace-nowrap outline-none select-none",
    "transition-[background-color,color,opacity] duration-150",
    "disabled:cursor-not-allowed disabled:opacity-50",
  ],
  {
    variants: {
      variant: {
        fill: "border-transparent active:scale-[0.98]",
        outline: "bg-background active:scale-[0.98]",
        soft: "border-transparent active:scale-[0.98]",
        ghost: "border-transparent active:scale-[0.98]",
        link: "border-transparent underline-offset-4 hover:underline",
      },
      color: {
        primary: "",
        secondary: "",
        success: "",
        danger: "",
      },
      size: {
        sm: "h-7 px-2.5",
        md: "h-9 px-3.5",
        lg: "h-11 px-5 text-32-bold",
      },
    },
    compoundVariants: intents.flatMap((color) => [
      { color, variant: "fill" as const, class: fill[color] },
      ...tintedVariants.map((variant) => ({
        color,
        variant,
        class: tint[color][variant],
      })),
    ]),
    defaultVariants: {
      variant: "fill",
      color: "primary",
      size: "md",
    },
  },
);

export type ButtonVariants = VariantProps<typeof buttonRecipe>;
