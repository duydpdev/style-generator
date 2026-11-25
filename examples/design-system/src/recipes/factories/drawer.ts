import { createVariantMapper } from "@duydpdev/style-generator/cva";
import {
  pick,
  recipeFromTables,
  type RecipeTables,
} from "@duydpdev/style-generator/ui";

import type { OverlayTokens } from "./dialog";

/** Drawer roles: the scrim (a `<colour>/<step>` key and a blur), the panel's fill, border and shadow, the two stacking keys, the motion keys and the text of each slot. */
export interface DrawerPreset {
  readonly scrim: string;
  readonly blur: string;
  readonly surface: string;
  readonly border: string;
  readonly borderWidth: string;
  readonly shadow: string;
  readonly overlayLayer: string;
  readonly modalLayer: string;
  readonly duration: string;
  readonly easing: string;
  readonly type: Readonly<Record<"body" | "title", string>>;
  readonly text: string;
  readonly description: string;
}

/** A panel docked to one edge over a blurred scrim: `slot` picks `overlay`, `content`, `title` or `description`; `side` (`left`, `right`, `bottom`) docks the panel and sets the edge it slides in from. */
export const drawerTables = (t: OverlayTokens, preset: DrawerPreset) => {
  const text = createVariantMapper("text", t.colors);
  const type = createVariantMapper("", t.typography);
  const z = createVariantMapper("z", t.zIndex);
  const motion = [
    pick(createVariantMapper("duration", t.motionDuration), preset.duration),
    pick(createVariantMapper("ease", t.motionEasing), preset.easing),
  ];
  return {
    base: "",
    variants: {
      slot: {
        overlay: [
          "fixed inset-0 transition-opacity starting:opacity-0 motion-reduce:transition-none",
          pick(
            createVariantMapper("bg", t.colors, {
              opacities: t.opacities ?? [],
            }),
            preset.scrim,
          ),
          pick(
            createVariantMapper("backdrop-blur", t.backdropBlurs),
            preset.blur,
          ),
          pick(z, preset.overlayLayer),
          ...motion,
        ],
        content: [
          "fixed flex flex-col gap-2 overflow-y-auto p-6 transition-[translate] motion-reduce:transition-none",
          pick(createVariantMapper("bg", t.colors), preset.surface),
          pick(createVariantMapper("border", t.colors), preset.border),
          pick(
            createVariantMapper("border", t.borderWidth),
            preset.borderWidth,
          ),
          pick(createVariantMapper("shadow", t.shadows), preset.shadow),
          pick(z, preset.modalLayer),
          ...motion,
          pick(type, preset.type.body),
          pick(text, preset.text),
        ],
        title: [pick(type, preset.type.title), pick(text, preset.text)],
        description: pick(text, preset.description),
      },
      side: { left: "", right: "", bottom: "" },
    },
    compoundVariants: [
      {
        slot: "content",
        side: "left",
        class:
          "inset-y-0 left-0 w-80 max-w-[calc(100%-2rem)] starting:-translate-x-full",
      },
      {
        slot: "content",
        side: "right",
        class:
          "inset-y-0 right-0 w-80 max-w-[calc(100%-2rem)] starting:translate-x-full",
      },
      {
        slot: "content",
        side: "bottom",
        class: "inset-x-0 bottom-0 max-h-[80vh] starting:translate-y-full",
      },
    ],
    defaultVariants: { slot: "content", side: "right" },
  } satisfies RecipeTables;
};

export const createDrawerRecipe = (t: OverlayTokens, preset: DrawerPreset) =>
  recipeFromTables(drawerTables(t, preset));
