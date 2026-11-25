import { createVariantMapper } from "@duydpdev/style-generator/cva";
import {
  pick,
  recipeFromTables,
  type RecipeTables,
} from "@duydpdev/style-generator/ui";

import type { ButtonTokens } from "./button";

/** Avatar roles: the fallback's fill and text, the radius, the type and one `controlHeight` key per size. */
export interface AvatarPreset {
  readonly fill: string;
  readonly text: string;
  readonly radius: string;
  readonly type: string;
  readonly size: Readonly<Record<"sm" | "md" | "lg", string>>;
}

/** A square picture or initials: `slot` picks the `root` or the `image`; `size` sets the root's height (and, through `aspect-square`, its width). */
export const avatarTables = (t: ButtonTokens, preset: AvatarPreset) => {
  const height = createVariantMapper("h-control", t.controlHeight);
  return {
    base: "",
    variants: {
      slot: {
        root: [
          "inline-flex aspect-square shrink-0 items-center justify-center overflow-hidden select-none",
          pick(createVariantMapper("bg", t.colors), preset.fill),
          pick(createVariantMapper("text", t.colors), preset.text),
          pick(createVariantMapper("rounded", t.borderRadius), preset.radius),
          pick(createVariantMapper("", t.typography), preset.type),
        ],
        image: "size-full object-cover",
      },
      size: { sm: "", md: "", lg: "" },
    },
    compoundVariants: (["sm", "md", "lg"] as const).map((size) => ({
      slot: "root",
      size,
      class: pick(height, preset.size[size]),
    })),
    defaultVariants: { slot: "root", size: "md" },
  } satisfies RecipeTables;
};

export const createAvatarRecipe = (t: ButtonTokens, preset: AvatarPreset) =>
  recipeFromTables(avatarTables(t, preset));
