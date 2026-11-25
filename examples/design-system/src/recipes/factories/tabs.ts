import { createVariantMapper } from "@duydpdev/style-generator/cva";
import {
  pick,
  recipeFromTables,
  type RecipeTables,
  type RecipeTokens,
} from "@duydpdev/style-generator/ui";

/** Tabs roles. `selected`, `hover` and `focusRing` are literal classes: `selected` is the `aria-selected:` line the registry emits for a `<role>Selected` key, and the registry emits no `hover:` or `focus-visible:` variant of a theme key. */
export interface TabsPreset {
  /** Colour of the list's bottom rule. */
  readonly border: string;
  /** `borderWidth` keys of the list rule and of a tab's indicator. */
  readonly ruleWidth: string;
  readonly indicatorWidth: string;
  readonly type: string;
  /** Text of an unselected tab. */
  readonly muted: string;
  /** `aria-selected:` text and indicator colour, from a `<role>Selected` key. */
  readonly selected: string;
  readonly hover: string;
  readonly focusRing: string;
}

/** `role="tablist"`, `role="tab"` and `role="tabpanel"`: `slot` picks the `list`, a `tab` or a `panel`. */
export const tabsTables = (t: RecipeTokens, preset: TabsPreset) => {
  const borderB = createVariantMapper("border-b", t.borderWidth);
  const focus = `focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 ${preset.focusRing}`;
  return {
    base: "",
    variants: {
      slot: {
        list: [
          "flex gap-1",
          pick(borderB, preset.ruleWidth),
          pick(createVariantMapper("border", t.colors), preset.border),
        ],
        tab: [
          "-mb-px inline-flex cursor-pointer items-center border-transparent px-3 py-2 transition-colors",
          pick(borderB, preset.indicatorWidth),
          pick(createVariantMapper("", t.typography), preset.type),
          pick(createVariantMapper("text", t.colors), preset.muted),
          preset.hover,
          preset.selected,
          focus,
        ],
        panel: ["pt-4", focus],
      },
    },
    defaultVariants: { slot: "list" },
  } satisfies RecipeTables;
};

export const createTabsRecipe = (t: RecipeTokens, preset: TabsPreset) =>
  recipeFromTables(tabsTables(t, preset));
