import { createVariantMapper } from "@duydpdev/style-generator/cva";
import {
  pick,
  recipeFromTables,
  type RecipeTables,
  type RecipeTokens,
} from "@duydpdev/style-generator/ui";

/** Table roles: the type and text of the body and the header, and the row rule. */
export interface TablePreset {
  readonly type: Readonly<Record<"body" | "header", string>>;
  readonly text: string;
  readonly muted: string;
  readonly border: string;
  readonly borderWidth: string;
}

/** A data table: `slot` picks the `root` (`<table>`), the `caption`, a `row`, a `header` or a `cell`; `align` sets a header's or cell's text alignment. */
export const tableTables = (t: RecipeTokens, preset: TablePreset) => {
  const text = createVariantMapper("text", t.colors);
  const type = createVariantMapper("", t.typography);
  const cell = "px-3 py-2 align-middle";
  return {
    base: "",
    variants: {
      slot: {
        root: [
          "w-full caption-bottom border-collapse",
          pick(type, preset.type.body),
          pick(text, preset.text),
        ],
        caption: ["mt-2", pick(text, preset.muted)],
        row: [
          pick(
            createVariantMapper("border-b", t.borderWidth),
            preset.borderWidth,
          ),
          pick(createVariantMapper("border", t.colors), preset.border),
        ],
        header: [
          cell,
          pick(type, preset.type.header),
          pick(text, preset.muted),
        ],
        cell,
      },
      align: { start: "text-start", end: "text-end" },
    },
    defaultVariants: { slot: "root", align: "start" },
  } satisfies RecipeTables;
};

export const createTableRecipe = (t: RecipeTokens, preset: TablePreset) =>
  recipeFromTables(tableTables(t, preset));
