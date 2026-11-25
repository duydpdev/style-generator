import { createVariantMapper } from "@duydpdev/style-generator/cva";
import {
  contrastText,
  pick,
  recipeFromTables,
  type RecipeTables,
  type RecipeTokens,
} from "@duydpdev/style-generator/ui";

/** The fills an alert offers as `variant`. */
export const alertVariants = ["soft", "outline", "solid"] as const;

export type AlertVariant = (typeof alertVariants)[number];

/** Alert roles: intents, radius, border width, the outline fill and the type styles. */
export interface AlertPreset {
  /** Colour keys offered as `color`; `soft` reads `<intent>Subtle` and `<intent>SubtleForeground`. */
  readonly intents: readonly string[];
  readonly radius: string;
  readonly borderWidth: string;
  /** Outline fill and the solid text colour when the theme has no `<intent>Foreground`. */
  readonly background: string;
  readonly type: Readonly<Record<"body" | "title", string>>;
}

/** An inline message: `color` × `variant` on the `root` slot; `title` is the heading slot. */
export const alertTables = (t: RecipeTokens, preset: AlertPreset) => {
  const bg = createVariantMapper("bg", t.colors);
  const text = createVariantMapper("text", t.colors);
  const border = createVariantMapper("border", t.colors);
  const type = createVariantMapper("", t.typography);
  const tint = (intent: string): Record<AlertVariant, string[]> => ({
    soft: [
      "border-transparent",
      pick(bg, `${intent}Subtle`),
      pick(text, `${intent}SubtleForeground`),
    ],
    outline: [
      pick(bg, preset.background),
      pick(border, intent),
      pick(text, intent),
    ],
    solid: [
      "border-transparent",
      pick(bg, intent),
      contrastText(t.colors, intent, preset.background),
    ],
  });
  return {
    base: "",
    variants: {
      slot: {
        root: [
          "flex flex-col gap-1 p-4",
          pick(createVariantMapper("rounded", t.borderRadius), preset.radius),
          pick(
            createVariantMapper("border", t.borderWidth),
            preset.borderWidth,
          ),
          pick(type, preset.type.body),
        ],
        title: pick(type, preset.type.title),
      },
      color: Object.fromEntries(preset.intents.map((intent) => [intent, ""])),
      variant: { soft: "", outline: "", solid: "" },
    },
    compoundVariants: preset.intents.flatMap((intent) => {
      const tints = tint(intent);
      return alertVariants.map((variant) => ({
        slot: "root",
        color: intent,
        variant,
        class: tints[variant],
      }));
    }),
    defaultVariants: {
      slot: "root",
      color: preset.intents[0],
      variant: "soft",
    },
  } satisfies RecipeTables;
};

export const createAlertRecipe = (t: RecipeTokens, preset: AlertPreset) =>
  recipeFromTables(alertTables(t, preset));
