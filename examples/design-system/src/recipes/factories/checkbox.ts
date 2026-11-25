import { createVariantMapper } from "@duydpdev/style-generator/cva";
import {
  pick,
  recipeFromTables,
  type RecipeTables,
  type RecipeTokens,
} from "@duydpdev/style-generator/ui";

/** The tokens a native toggle reads: the recipe tokens plus the `iconSize` keys. */
export interface ToggleTokens extends RecipeTokens {
  readonly iconSize: readonly string[];
}

/** Roles of a native checkbox, radio or slider. `accent`, `focusRing` and `disabled` are literal classes: the registry emits no `accent-*` utility and no `focus-visible:` or `disabled:` variant of a theme key. */
export interface TogglePreset {
  /** Colour keys offered as `color`. */
  readonly intents: readonly string[];
  /** Per intent: the `accent-<intent>` class that colours the native control. */
  readonly accent: Readonly<Record<string, string>>;
  /** Theme key per size (`iconSize` for a checkbox or radio, `controlHeight` for a slider). */
  readonly size: Readonly<Record<"sm" | "md" | "lg", string>>;
  readonly focusRing: string;
  readonly disabled: string;
}

/** `color` and `size` of a native toggle; `sizeMapper` turns the preset's size keys into classes. */
export const toggleTables = (
  base: string,
  sizeMapper: Record<string, string>,
  preset: TogglePreset,
) =>
  ({
    base: [
      base,
      `cursor-pointer focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 ${preset.focusRing}`,
      preset.disabled,
    ],
    variants: {
      color: Object.fromEntries(
        preset.intents.map((intent) => [intent, pick(preset.accent, intent)]),
      ),
      size: {
        sm: pick(sizeMapper, preset.size.sm),
        md: pick(sizeMapper, preset.size.md),
        lg: pick(sizeMapper, preset.size.lg),
      },
    },
    defaultVariants: { color: preset.intents[0], size: "md" },
  }) satisfies RecipeTables;

/** A native checkbox: `color` sets the accent colour, `size` the box (`size-icon-*`). */
export const checkboxTables = (t: ToggleTokens, preset: TogglePreset) =>
  toggleTables(
    "shrink-0",
    createVariantMapper("size-icon", t.iconSize),
    preset,
  );

export const createCheckboxRecipe = (t: ToggleTokens, preset: TogglePreset) =>
  recipeFromTables(checkboxTables(t, preset));
