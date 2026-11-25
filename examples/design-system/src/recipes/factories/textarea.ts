import { createVariantMapper } from "@duydpdev/style-generator/cva";
import {
  pick,
  recipeFromTables,
  type RecipeTables,
  type RecipeTokens,
} from "@duydpdev/style-generator/ui";

/** Text-field roles shared by `textarea` and `select`. `focus`, `invalid` and `disabled` are literal classes: the registry emits no `focus-visible:`, `aria-invalid:` or `disabled:` variant of a theme key. */
export interface TextFieldPreset {
  readonly background: string;
  readonly text: string;
  readonly border: string;
  readonly borderWidth: string;
  readonly radius: string;
  readonly placeholder: string;
  /** Type style per size. */
  readonly type: Readonly<Record<"sm" | "md" | "lg", string>>;
  readonly focus: string;
  readonly invalid: string;
  readonly disabled: string;
}

/** The base classes of a text field: fill, text, border, radius and the focus, invalid and disabled states. */
export const textFieldBase = (
  t: RecipeTokens,
  preset: TextFieldPreset,
): string[] => [
  "w-full outline-none transition-colors duration-150",
  pick(createVariantMapper("bg", t.colors), preset.background),
  pick(createVariantMapper("text", t.colors), preset.text),
  pick(createVariantMapper("border", t.colors), preset.border),
  pick(createVariantMapper("border", t.borderWidth), preset.borderWidth),
  pick(createVariantMapper("rounded", t.borderRadius), preset.radius),
  pick(createVariantMapper("placeholder", t.colors), preset.placeholder),
  preset.focus,
  preset.invalid,
  preset.disabled,
];

/** A multi-line text field: `size` sets the padding and the type style; the height follows `rows`. */
export const textareaTables = (t: RecipeTokens, preset: TextFieldPreset) => {
  const type = createVariantMapper("", t.typography);
  return {
    base: ["block resize-y", ...textFieldBase(t, preset)],
    variants: {
      size: {
        sm: ["px-2.5 py-1.5", pick(type, preset.type.sm)],
        md: ["px-3 py-2", pick(type, preset.type.md)],
        lg: ["px-4 py-2.5", pick(type, preset.type.lg)],
      },
    },
    defaultVariants: { size: "md" },
  } satisfies RecipeTables;
};

export const createTextareaRecipe = (
  t: RecipeTokens,
  preset: TextFieldPreset,
) => recipeFromTables(textareaTables(t, preset));
