import { createVariantMapper } from "@duydpdev/style-generator/cva";
import {
  pick,
  recipeFromTables,
  type RecipeTables,
} from "@duydpdev/style-generator/ui";

import type { MotionTokens } from "./toast";

/** The tokens the accordion reads: the motion tokens plus the `iconSize` keys. */
export interface AccordionTokens extends MotionTokens {
  readonly iconSize: readonly string[];
}

/** Accordion roles. `focusRing` is a literal class: the registry emits no `focus-visible:` variant of a theme key. */
export interface AccordionPreset {
  readonly border: string;
  readonly borderWidth: string;
  readonly type: Readonly<Record<"title" | "body", string>>;
  readonly title: string;
  readonly body: string;
  /** `iconSize` key of the chevron. */
  readonly icon: string;
  readonly duration: string;
  readonly easing: string;
  readonly focusRing: string;
}

/** Native `<details>`/`<summary>` sections: `slot` picks the `root`, an `item` (`<details>`), its `trigger` (`<summary>`), the chevron `icon` or the `content`. */
export const accordionTables = (
  t: AccordionTokens,
  preset: AccordionPreset,
) => {
  const text = createVariantMapper("text", t.colors);
  const type = createVariantMapper("", t.typography);
  return {
    base: "",
    variants: {
      slot: {
        root: "flex flex-col",
        item: [
          "group",
          pick(
            createVariantMapper("border-b", t.borderWidth),
            preset.borderWidth,
          ),
          pick(createVariantMapper("border", t.colors), preset.border),
        ],
        trigger: [
          "flex cursor-pointer list-none items-center justify-between gap-2 py-3 [&::-webkit-details-marker]:hidden",
          pick(type, preset.type.title),
          pick(text, preset.title),
          `focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 ${preset.focusRing}`,
        ],
        icon: [
          "shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none",
          pick(createVariantMapper("size-icon", t.iconSize), preset.icon),
          pick(
            createVariantMapper("duration", t.motionDuration),
            preset.duration,
          ),
          pick(createVariantMapper("ease", t.motionEasing), preset.easing),
        ],
        content: [
          "pb-3",
          pick(type, preset.type.body),
          pick(text, preset.body),
        ],
      },
    },
    defaultVariants: { slot: "root" },
  } satisfies RecipeTables;
};

export const createAccordionRecipe = (
  t: AccordionTokens,
  preset: AccordionPreset,
) => recipeFromTables(accordionTables(t, preset));
