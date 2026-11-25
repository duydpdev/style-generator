import { createVariantMapper } from "@duydpdev/style-generator/cva";
import {
  pick,
  recipeFromTables,
  type RecipeTables,
  type RecipeTokens,
} from "@duydpdev/style-generator/ui";

/** Field roles: the type style of every slot and one colour key per text slot. */
export interface FieldPreset {
  readonly type: string;
  readonly label: string;
  readonly hint: string;
  readonly error: string;
}

/** A field has no prop axis: `slot` picks the class of one anatomy slot (`root`, `label`, `hint`, `error`). */
export const fieldTables = (t: RecipeTokens, preset: FieldPreset) => {
  const text = createVariantMapper("text", t.colors);
  const type = pick(createVariantMapper("", t.typography), preset.type);
  return {
    base: "",
    variants: {
      slot: {
        root: "flex flex-col gap-1.5",
        label: [type, pick(text, preset.label)],
        hint: [type, pick(text, preset.hint)],
        error: [type, pick(text, preset.error)],
      },
    },
    defaultVariants: { slot: "root" },
  } satisfies RecipeTables;
};

export const createFieldRecipe = (t: RecipeTokens, preset: FieldPreset) =>
  recipeFromTables(fieldTables(t, preset));
