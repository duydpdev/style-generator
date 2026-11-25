import { createVariantMapper } from "@duydpdev/style-generator/cva";
import {
  pick,
  recipeFromTables,
  type RecipeTables,
} from "@duydpdev/style-generator/ui";

import type { MotionTokens } from "./toast";

/** Progress roles: intents, the track fill, the radius and the motion of the indicator. */
export interface ProgressPreset {
  /** Colour keys offered as `color`: the indicator fill. */
  readonly intents: readonly string[];
  readonly track: string;
  readonly radius: string;
  readonly duration: string;
  readonly easing: string;
}

/** A determinate bar: `slot` picks `track` or `indicator`; `color` fills the indicator, `size` sets the track height. */
export const progressTables = (t: MotionTokens, preset: ProgressPreset) => {
  const bg = createVariantMapper("bg", t.colors);
  const rounded = pick(
    createVariantMapper("rounded", t.borderRadius),
    preset.radius,
  );
  return {
    base: "",
    variants: {
      slot: {
        track: [
          "block w-full overflow-hidden",
          pick(bg, preset.track),
          rounded,
        ],
        indicator: [
          "block h-full transition-[width] motion-reduce:transition-none",
          rounded,
          pick(
            createVariantMapper("duration", t.motionDuration),
            preset.duration,
          ),
          pick(createVariantMapper("ease", t.motionEasing), preset.easing),
        ],
      },
      color: Object.fromEntries(preset.intents.map((intent) => [intent, ""])),
      size: { sm: "", md: "", lg: "" },
    },
    compoundVariants: [
      ...preset.intents.map((intent) => ({
        slot: "indicator",
        color: intent,
        class: pick(bg, intent),
      })),
      { slot: "track", size: "sm", class: "h-1" },
      { slot: "track", size: "md", class: "h-2" },
      { slot: "track", size: "lg", class: "h-3" },
    ],
    defaultVariants: { slot: "track", color: preset.intents[0], size: "md" },
  } satisfies RecipeTables;
};

export const createProgressRecipe = (t: MotionTokens, preset: ProgressPreset) =>
  recipeFromTables(progressTables(t, preset));
