import { createVariantMapper } from "@duydpdev/style-generator/cva";
import {
  contrastText,
  pick,
  recipeFromTables,
  type RecipeTables,
} from "@duydpdev/style-generator/ui";

import type { ButtonTokens } from "./button";

/** Pagination roles. `hover`, `focusRing` and `disabled` are literal classes: the registry emits no `hover:`, `focus-visible:` or `disabled:` variant of a theme key. */
export interface PaginationPreset {
  /** Fill of the current page; its text is `contrastText` of it on `background`. */
  readonly current: string;
  readonly background: string;
  readonly text: string;
  readonly muted: string;
  readonly radius: string;
  readonly type: string;
  /** `controlHeight` key per size. */
  readonly height: Readonly<Record<"sm" | "md" | "lg", string>>;
  readonly hover: string;
  readonly focusRing: string;
  readonly disabled: string;
}

const SIZES = ["sm", "md", "lg"] as const;

/** Page buttons: `slot` picks the `list`, a `page` button, the `current` page or an `ellipsis`; `size` sets their height. */
export const paginationTables = (t: ButtonTokens, preset: PaginationPreset) => {
  const text = createVariantMapper("text", t.colors);
  const height = createVariantMapper("h-control", t.controlHeight);
  const button = [
    "inline-flex min-w-0 shrink-0 cursor-pointer items-center justify-center px-3 transition-colors",
    pick(createVariantMapper("rounded", t.borderRadius), preset.radius),
    pick(createVariantMapper("", t.typography), preset.type),
    `focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 ${preset.focusRing}`,
  ];
  return {
    base: "",
    variants: {
      slot: {
        list: "flex flex-wrap items-center gap-1",
        page: [
          ...button,
          pick(text, preset.text),
          preset.hover,
          preset.disabled,
        ],
        current: [
          ...button,
          pick(createVariantMapper("bg", t.colors), preset.current),
          contrastText(t.colors, preset.current, preset.background),
        ],
        ellipsis: [
          "inline-flex items-center justify-center px-2 select-none",
          pick(text, preset.muted),
        ],
      },
      size: { sm: "", md: "", lg: "" },
    },
    compoundVariants: (["page", "current", "ellipsis"] as const).flatMap(
      (slot) =>
        SIZES.map((size) => ({
          slot,
          size,
          class: pick(height, preset.height[size]),
        })),
    ),
    defaultVariants: { slot: "list", size: "md" },
  } satisfies RecipeTables;
};

export const createPaginationRecipe = (
  t: ButtonTokens,
  preset: PaginationPreset,
) => recipeFromTables(paginationTables(t, preset));
