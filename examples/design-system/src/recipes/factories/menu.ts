import { createVariantMapper } from "@duydpdev/style-generator/cva";
import {
  pick,
  recipeFromTables,
  type RecipeTables,
} from "@duydpdev/style-generator/ui";

import type { OverlayTokens } from "./dialog";

/** Menu roles: the panel's fill, border, radius and shadow, its stacking key and motion, an item's radius, type and text, and the separator. `highlight` and `disabled` are literal classes: the registry emits no `hover:`/`focus-visible:` fill or `disabled:` variant. */
export interface MenuPreset {
  readonly surface: string;
  readonly border: string;
  readonly borderWidth: string;
  readonly radius: string;
  readonly shadow: string;
  readonly layer: string;
  readonly duration: string;
  readonly easing: string;
  readonly itemRadius: string;
  readonly type: string;
  readonly text: string;
  readonly highlight: string;
  readonly disabled: string;
}

/** A list of actions: `slot` picks `content`, `item` or `separator`. An item shows hover and keyboard focus with the same fill. */
export const menuTables = (t: OverlayTokens, preset: MenuPreset) => {
  const border = createVariantMapper("border", t.colors);
  return {
    base: "",
    variants: {
      slot: {
        content: [
          "flex min-w-48 flex-col p-1 transition-[opacity,scale] starting:scale-95 starting:opacity-0 motion-reduce:transition-none",
          pick(createVariantMapper("bg", t.colors), preset.surface),
          pick(border, preset.border),
          pick(
            createVariantMapper("border", t.borderWidth),
            preset.borderWidth,
          ),
          pick(createVariantMapper("rounded", t.borderRadius), preset.radius),
          pick(createVariantMapper("shadow", t.shadows), preset.shadow),
          pick(createVariantMapper("z", t.zIndex), preset.layer),
          pick(
            createVariantMapper("duration", t.motionDuration),
            preset.duration,
          ),
          pick(createVariantMapper("ease", t.motionEasing), preset.easing),
        ],
        item: [
          "flex w-full cursor-pointer items-center gap-2 px-2 py-1.5 text-start outline-hidden transition-colors",
          pick(
            createVariantMapper("rounded", t.borderRadius),
            preset.itemRadius,
          ),
          pick(createVariantMapper("", t.typography), preset.type),
          pick(createVariantMapper("text", t.colors), preset.text),
          preset.highlight,
          preset.disabled,
        ],
        separator: [
          "-mx-1 my-1",
          pick(
            createVariantMapper("border-t", t.borderWidth),
            preset.borderWidth,
          ),
          pick(border, preset.border),
        ],
      },
    },
    defaultVariants: { slot: "content" },
  } satisfies RecipeTables;
};

export const createMenuRecipe = (t: OverlayTokens, preset: MenuPreset) =>
  recipeFromTables(menuTables(t, preset));
