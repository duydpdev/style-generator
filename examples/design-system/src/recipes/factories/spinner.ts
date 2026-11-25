import { createVariantMapper } from "@duydpdev/style-generator/cva";
import {
  pick,
  recipeFromTables,
  type RecipeTables,
} from "@duydpdev/style-generator/ui";

import type { ToggleTokens } from "./checkbox";

/** Spinner roles: intents, the ring width and radius, one `iconSize` key per size. */
export interface SpinnerPreset {
  /** Colour keys offered as `color`: the ring colour. */
  readonly intents: readonly string[];
  readonly borderWidth: string;
  readonly radius: string;
  readonly size: Readonly<Record<"sm" | "md" | "lg", string>>;
}

/** A spinning ring with one open side: `color` sets its colour, `size` its box (`size-icon-*`). It stops under `prefers-reduced-motion`. */
export const spinnerTables = (t: ToggleTokens, preset: SpinnerPreset) => {
  const text = createVariantMapper("text", t.colors);
  const icon = createVariantMapper("size-icon", t.iconSize);
  return {
    base: [
      "inline-block shrink-0 animate-spin border-solid border-current border-r-transparent motion-reduce:animate-none",
      pick(createVariantMapper("border", t.borderWidth), preset.borderWidth),
      pick(createVariantMapper("rounded", t.borderRadius), preset.radius),
    ],
    variants: {
      color: Object.fromEntries(
        preset.intents.map((intent) => [intent, pick(text, intent)]),
      ),
      size: {
        sm: pick(icon, preset.size.sm),
        md: pick(icon, preset.size.md),
        lg: pick(icon, preset.size.lg),
      },
    },
    defaultVariants: { color: preset.intents[0], size: "md" },
  } satisfies RecipeTables;
};

export const createSpinnerRecipe = (t: ToggleTokens, preset: SpinnerPreset) =>
  recipeFromTables(spinnerTables(t, preset));
