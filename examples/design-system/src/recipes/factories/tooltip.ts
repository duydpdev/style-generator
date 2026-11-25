import { createVariantMapper } from "@duydpdev/style-generator/cva";
import {
  pick,
  recipeFromTables,
  type RecipeTables,
} from "@duydpdev/style-generator/ui";

import type { OverlayTokens } from "./dialog";

/** Tooltip roles: an inverted fill and text, the radius, the stacking key, the motion keys and the type style. */
export interface TooltipPreset {
  readonly fill: string;
  readonly text: string;
  readonly radius: string;
  readonly layer: string;
  readonly duration: string;
  readonly easing: string;
  readonly type: string;
}

/** A short label placed by the app; it fades in through `@starting-style`. */
export const tooltipTables = (t: OverlayTokens, preset: TooltipPreset) =>
  ({
    base: [
      "max-w-xs px-2 py-1 transition-opacity starting:opacity-0 motion-reduce:transition-none",
      pick(createVariantMapper("bg", t.colors), preset.fill),
      pick(createVariantMapper("text", t.colors), preset.text),
      pick(createVariantMapper("rounded", t.borderRadius), preset.radius),
      pick(createVariantMapper("z", t.zIndex), preset.layer),
      pick(createVariantMapper("duration", t.motionDuration), preset.duration),
      pick(createVariantMapper("ease", t.motionEasing), preset.easing),
      pick(createVariantMapper("", t.typography), preset.type),
    ],
    variants: {},
  }) satisfies RecipeTables;

export const createTooltipRecipe = (t: OverlayTokens, preset: TooltipPreset) =>
  recipeFromTables(tooltipTables(t, preset));
