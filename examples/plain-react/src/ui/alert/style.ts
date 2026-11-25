import { createVariantMapper } from "@duydpdev/style-generator/cva";
import type {
  ColorVariant,
  RoundedVariant,
  TextVariant,
} from "@duydpdev/style-generator/types";
import {
  contrastText,
  pick,
  recipeFromTables,
  type RecipeTables,
} from "@duydpdev/style-generator/ui";

import { tokens, type theme } from "../../theme";

/** The intents `color` offers. `satisfies` fails when one leaves the theme. Each needs `<intent>Subtle` and `<intent>SubtleForeground` for `soft`. */
export const alertIntents = [
  "primary",
  "secondary",
  "success",
  "danger",
] as const satisfies readonly ColorVariant<typeof theme>[];

export type AlertIntent = (typeof alertIntents)[number];

const ALERT_VARIANTS = ["soft", "outline", "solid"] as const;

type AlertVariant = (typeof ALERT_VARIANTS)[number];

/** The theme keys the alert reads: the outline fill, radius, border width and the type styles. `pick` throws on a missing key when the module loads, so `satisfies` moves that failure to the compiler. */
const themeKeys = {
  background: "background",
  radius: "md",
  borderWidth: "thin",
  type: { body: "text14Regular", title: "text16Medium" },
} as const satisfies {
  background: ColorVariant<typeof theme>;
  radius: RoundedVariant<typeof theme>;
  borderWidth: keyof (typeof theme)["borderWidth"];
  type: Record<"body" | "title", TextVariant<typeof theme>>;
};

const bg = createVariantMapper("bg", tokens.colors);
const text = createVariantMapper("text", tokens.colors);
const border = createVariantMapper("border", tokens.colors);
const type = createVariantMapper("", tokens.typography);

/** `soft` is `<intent>Subtle` with `<intent>SubtleForeground` text, `outline` an `<intent>` border and text on `background`, `solid` an `<intent>` fill. */
const tint = (intent: AlertIntent): Record<AlertVariant, string[]> => ({
  soft: [
    "border-transparent",
    pick(bg, `${intent}Subtle`),
    pick(text, `${intent}SubtleForeground`),
  ],
  outline: [
    pick(bg, themeKeys.background),
    pick(border, intent),
    pick(text, intent),
  ],
  solid: [
    "border-transparent",
    pick(bg, intent),
    contrastText(tokens.colors, intent, themeKeys.background),
  ],
});

/** An inline message: `color` × `variant` on the `root` slot; `title` is the heading slot. */
export const alertTables = {
  base: "",
  variants: {
    slot: {
      root: [
        "flex flex-col gap-1 p-4",
        pick(
          createVariantMapper("rounded", tokens.borderRadius),
          themeKeys.radius,
        ),
        pick(
          createVariantMapper("border", tokens.borderWidth),
          themeKeys.borderWidth,
        ),
        pick(type, themeKeys.type.body),
      ],
      title: pick(type, themeKeys.type.title),
    },
    color: Object.fromEntries(alertIntents.map((intent) => [intent, ""])),
    variant: { soft: "", outline: "", solid: "" },
  },
  compoundVariants: alertIntents.flatMap((intent) => {
    const tints = tint(intent);
    return ALERT_VARIANTS.map((variant) => ({
      slot: "root",
      color: intent,
      variant,
      class: tints[variant],
    }));
  }),
  defaultVariants: { slot: "root", color: alertIntents[0], variant: "soft" },
} satisfies RecipeTables;

/** `alertRecipe({ slot, color, variant })` → class string. */
export const alertRecipe = recipeFromTables(alertTables);
