import { createVariantMapper } from "@duydpdev/style-generator/cva";
import {
  pick,
  recipeFromTables,
  type RecipeTables,
} from "@duydpdev/style-generator/ui";

import type { MotionTokens } from "./toast";

/** The tokens an overlay part reads: the motion tokens plus the stacking keys (`z-<key>`). */
export interface OverlayTokens extends MotionTokens {
  readonly zIndex: readonly string[];
}

/** Dialog roles: the scrim (a `<colour>/<step>` key and a blur), the panel's fill, border, radius and shadow, the two stacking keys, the motion keys and the text of each slot. */
export interface DialogPreset {
  readonly scrim: string;
  readonly blur: string;
  readonly surface: string;
  readonly border: string;
  readonly borderWidth: string;
  readonly radius: string;
  readonly shadow: string;
  readonly overlayLayer: string;
  readonly modalLayer: string;
  readonly duration: string;
  readonly easing: string;
  readonly type: Readonly<Record<"body" | "title", string>>;
  readonly text: string;
  readonly description: string;
}

/** A centred modal panel over a blurred scrim: `slot` picks `overlay`, `content`, `title` or `description`; `size` sets the panel's maximum width. Both fade in through `@starting-style`. */
export const dialogTables = (t: OverlayTokens, preset: DialogPreset) => {
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
          "fixed top-1/2 left-1/2 flex max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-2 overflow-y-auto p-6 transition-[opacity,scale] starting:scale-95 starting:opacity-0 motion-reduce:transition-none",
          pick(createVariantMapper("bg", t.colors), preset.surface),
          pick(createVariantMapper("border", t.colors), preset.border),
          pick(
            createVariantMapper("border", t.borderWidth),
            preset.borderWidth,
          ),
          pick(createVariantMapper("rounded", t.borderRadius), preset.radius),
          pick(createVariantMapper("shadow", t.shadows), preset.shadow),
          pick(z, preset.modalLayer),
          ...motion,
          pick(type, preset.type.body),
          pick(text, preset.text),
        ],
        title: [pick(type, preset.type.title), pick(text, preset.text)],
        description: pick(text, preset.description),
      },
      size: { sm: "", md: "", lg: "" },
    },
    compoundVariants: [
      { slot: "content", size: "sm", class: "max-w-sm" },
      { slot: "content", size: "md", class: "max-w-lg" },
      { slot: "content", size: "lg", class: "max-w-2xl" },
    ],
    defaultVariants: { slot: "content", size: "md" },
  } satisfies RecipeTables;
};

export const createDialogRecipe = (t: OverlayTokens, preset: DialogPreset) =>
  recipeFromTables(dialogTables(t, preset));
