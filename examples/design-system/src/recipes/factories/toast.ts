import { createVariantMapper } from "@duydpdev/style-generator/cva";
import {
  pick,
  recipeFromTables,
  type RecipeTables,
  type RecipeTokens,
} from "@duydpdev/style-generator/ui";

/** The tokens a moving part reads: the recipe tokens plus the motion keys. */
export interface MotionTokens extends RecipeTokens {
  readonly motionDuration: readonly string[];
  readonly motionEasing: readonly string[];
}

/** Toast roles: the panel's fill, border, radius, shadow and motion, and the text of each slot. */
export interface ToastPreset {
  readonly surface: string;
  readonly border: string;
  readonly borderWidth: string;
  readonly radius: string;
  readonly shadow: string;
  readonly duration: string;
  readonly easing: string;
  readonly type: Readonly<Record<"body" | "title", string>>;
  readonly title: string;
  readonly description: string;
}

/** A static notification panel: `slot` picks `root`, `title` or `description`. It enters from below through `@starting-style`; the app positions it. */
export const toastTables = (t: MotionTokens, preset: ToastPreset) => {
  const text = createVariantMapper("text", t.colors);
  const type = createVariantMapper("", t.typography);
  return {
    base: "",
    variants: {
      slot: {
        root: [
          "flex w-full max-w-sm flex-col gap-1 p-4 transition-[opacity,translate] starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none",
          pick(createVariantMapper("bg", t.colors), preset.surface),
          pick(createVariantMapper("border", t.colors), preset.border),
          pick(
            createVariantMapper("border", t.borderWidth),
            preset.borderWidth,
          ),
          pick(createVariantMapper("rounded", t.borderRadius), preset.radius),
          pick(createVariantMapper("shadow", t.shadows), preset.shadow),
          pick(
            createVariantMapper("duration", t.motionDuration),
            preset.duration,
          ),
          pick(createVariantMapper("ease", t.motionEasing), preset.easing),
          pick(type, preset.type.body),
        ],
        title: [pick(type, preset.type.title), pick(text, preset.title)],
        description: pick(text, preset.description),
      },
    },
    defaultVariants: { slot: "root" },
  } satisfies RecipeTables;
};

export const createToastRecipe = (t: MotionTokens, preset: ToastPreset) =>
  recipeFromTables(toastTables(t, preset));
