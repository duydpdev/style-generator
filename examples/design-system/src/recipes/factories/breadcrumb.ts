import { createVariantMapper } from "@duydpdev/style-generator/cva";
import {
  pick,
  recipeFromTables,
  type RecipeTables,
  type RecipeTokens,
} from "@duydpdev/style-generator/ui";

/** Breadcrumb roles. `hover` and `focusRing` are literal classes: the registry emits no `hover:` or `focus-visible:` variant of a theme key. */
export interface BreadcrumbPreset {
  readonly type: string;
  /** Text of the trail and its separators. */
  readonly muted: string;
  /** Text of the current page. */
  readonly current: string;
  /** Radius of a link's focus outline. */
  readonly radius: string;
  readonly hover: string;
  readonly focusRing: string;
}

/** A trail of links: `slot` picks the `list`, an `item`, a `link`, the `current` page or a `separator`. */
export const breadcrumbTables = (t: RecipeTokens, preset: BreadcrumbPreset) => {
  const text = createVariantMapper("text", t.colors);
  return {
    base: "",
    variants: {
      slot: {
        list: [
          "flex flex-wrap items-center gap-1.5",
          pick(createVariantMapper("", t.typography), preset.type),
          pick(text, preset.muted),
        ],
        item: "inline-flex items-center gap-1.5",
        link: [
          "underline-offset-4 transition-colors hover:underline",
          pick(createVariantMapper("rounded", t.borderRadius), preset.radius),
          preset.hover,
          `focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 ${preset.focusRing}`,
        ],
        current: pick(text, preset.current),
        separator: "select-none",
      },
    },
    defaultVariants: { slot: "list" },
  } satisfies RecipeTables;
};

export const createBreadcrumbRecipe = (
  t: RecipeTokens,
  preset: BreadcrumbPreset,
) => recipeFromTables(breadcrumbTables(t, preset));
