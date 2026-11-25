import { createVariantMapper } from "@duydpdev/style-generator/cva";
import {
  pick,
  recipeFromTables,
  type RecipeTables,
} from "@duydpdev/style-generator/ui";

import type { OverlayTokens } from "./dialog";

/** Popover roles: the panel's fill, border, radius and shadow, its stacking key, the motion keys and its text. */
export interface PopoverPreset {
  readonly surface: string;
  readonly border: string;
  readonly borderWidth: string;
  readonly radius: string;
  readonly shadow: string;
  readonly layer: string;
  readonly duration: string;
  readonly easing: string;
  readonly type: string;
  readonly text: string;
}

/** A floating panel anchored by the app: it fades and scales in through `@starting-style`. */
export const popoverTables = (t: OverlayTokens, preset: PopoverPreset) =>
  ({
    base: [
      "flex w-72 flex-col gap-2 p-4 transition-[opacity,scale] starting:scale-95 starting:opacity-0 motion-reduce:transition-none",
      pick(createVariantMapper("bg", t.colors), preset.surface),
      pick(createVariantMapper("border", t.colors), preset.border),
      pick(createVariantMapper("border", t.borderWidth), preset.borderWidth),
      pick(createVariantMapper("rounded", t.borderRadius), preset.radius),
      pick(createVariantMapper("shadow", t.shadows), preset.shadow),
      pick(createVariantMapper("z", t.zIndex), preset.layer),
      pick(createVariantMapper("duration", t.motionDuration), preset.duration),
      pick(createVariantMapper("ease", t.motionEasing), preset.easing),
      pick(createVariantMapper("", t.typography), preset.type),
      pick(createVariantMapper("text", t.colors), preset.text),
    ],
    variants: {},
  }) satisfies RecipeTables;

export const createPopoverRecipe = (t: OverlayTokens, preset: PopoverPreset) =>
  recipeFromTables(popoverTables(t, preset));
