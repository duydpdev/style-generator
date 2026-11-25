import { createVariantMapper } from "@duydpdev/style-generator/cva";
import type {
  ColorVariant,
  RoundedVariant,
} from "@duydpdev/style-generator/types";
import {
  pick,
  recipeFromTables,
  type RecipeTables,
} from "@duydpdev/style-generator/ui";

import { tokens, type theme } from "../../theme";

/** The intents `color` offers. `satisfies` fails when one leaves the theme. */
export const switchIntents = [
  "primary",
  "secondary",
  "success",
  "danger",
] as const satisfies readonly ColorVariant<typeof theme>[];

export type SwitchIntent = (typeof switchIntents)[number];

type IconSizeKey = keyof (typeof theme)["iconSize"];

/**
 * Literal classes keyed by the theme key they name: the generator emits no `aria-checked:`,
 * `group-aria-checked:`, `focus-visible:` or `disabled:` variant of a theme key and no arbitrary
 * value, so Tailwind finds these by scanning this file. `satisfies` fails when a key leaves the theme.
 * `track` (two thumbs wide, one tall, plus the `p-0.5` padding) and `travel` (one thumb width)
 * read the `--sg-icon-<key>` theme variables, so they follow `iconSize`.
 */
const stateClasses = {
  checked: {
    primary: "aria-checked:bg-primary",
    secondary: "aria-checked:bg-secondary",
    success: "aria-checked:bg-success",
    danger: "aria-checked:bg-danger",
  },
  track: {
    sm: "h-[calc(var(--sg-icon-sm)+0.25rem)] w-[calc(var(--sg-icon-sm)*2+0.25rem)]",
    md: "h-[calc(var(--sg-icon-md)+0.25rem)] w-[calc(var(--sg-icon-md)*2+0.25rem)]",
    lg: "h-[calc(var(--sg-icon-lg)+0.25rem)] w-[calc(var(--sg-icon-lg)*2+0.25rem)]",
  },
  travel: {
    sm: "group-aria-checked:translate-x-(--sg-icon-sm)",
    md: "group-aria-checked:translate-x-(--sg-icon-md)",
    lg: "group-aria-checked:translate-x-(--sg-icon-lg)",
  },
  focus: { focus: "focus-visible:outline-focus" },
  disabled: {
    disabled: "disabled:cursor-not-allowed disabled:opacity-disabled",
  },
} as const satisfies {
  checked: Record<SwitchIntent, string>;
  track: Record<IconSizeKey, string>;
  travel: Record<IconSizeKey, string>;
  focus: Partial<Record<ColorVariant<typeof theme>, string>>;
  disabled: Partial<Record<keyof (typeof theme)["opacity"], string>>;
};

/** The other theme keys: the off track colour, the thumb colour, the radius of both, and the thumb's `iconSize` key per size. */
const themeKeys = {
  off: "muted",
  thumb: "surface",
  radius: "pill",
  size: { sm: "sm", md: "md", lg: "lg" },
} as const satisfies {
  off: ColorVariant<typeof theme>;
  thumb: ColorVariant<typeof theme>;
  radius: RoundedVariant<typeof theme>;
  size: Record<"sm" | "md" | "lg", IconSizeKey>;
};

const bg = createVariantMapper("bg", tokens.colors);
const rounded = pick(
  createVariantMapper("rounded", tokens.borderRadius),
  themeKeys.radius,
);
const icon = createVariantMapper("size-icon", tokens.iconSize);
const sizes = ["sm", "md", "lg"] as const;

/** `role="switch"` on a button: `slot` picks the `track` (the button) or the `thumb` (its child); `color` and `size` reach both through compound entries. */
export const switchTables = {
  base: "",
  variants: {
    slot: {
      track: [
        "group inline-flex shrink-0 cursor-pointer items-center p-0.5 transition-colors duration-150",
        pick(bg, themeKeys.off),
        rounded,
        `focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 ${stateClasses.focus.focus}`,
        stateClasses.disabled.disabled,
      ],
      thumb: [
        "pointer-events-none block transition-transform duration-150",
        pick(bg, themeKeys.thumb),
        rounded,
      ],
    },
    color: Object.fromEntries(switchIntents.map((intent) => [intent, ""])),
    size: { sm: "", md: "", lg: "" },
  },
  compoundVariants: [
    ...switchIntents.map((intent) => ({
      slot: "track",
      color: intent,
      class: stateClasses.checked[intent],
    })),
    ...sizes.map((size) => ({
      slot: "track",
      size,
      class: stateClasses.track[themeKeys.size[size]],
    })),
    ...sizes.map((size) => ({
      slot: "thumb",
      size,
      class: [
        pick(icon, themeKeys.size[size]),
        stateClasses.travel[themeKeys.size[size]],
      ],
    })),
  ],
  defaultVariants: { slot: "track", color: switchIntents[0], size: "md" },
} satisfies RecipeTables;

/** `switchRecipe({ slot, color, size })` → the class of the track or the thumb. */
export const switchRecipe = recipeFromTables(switchTables);
