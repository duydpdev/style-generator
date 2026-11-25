import { createVariantMapper } from "@duydpdev/style-generator/cva";
import {
  pick,
  recipeFromTables,
  type RecipeTables,
} from "@duydpdev/style-generator/ui";

import type { ToggleTokens } from "./checkbox";

/** Switch roles. `checked`, `track`, `travel`, `focusRing` and `disabled` are literal classes: the registry emits no `aria-checked:`, `group-aria-checked:`, `focus-visible:` or `disabled:` variant of a theme key, and no arbitrary value. */
export interface SwitchPreset {
  /** Colour keys offered as `color`. */
  readonly intents: readonly string[];
  /** Track colour when off, thumb colour, and the radius of both. */
  readonly off: string;
  readonly thumb: string;
  readonly radius: string;
  /** Per intent: the `aria-checked:bg-<intent>` track colour when on. */
  readonly checked: Readonly<Record<string, string>>;
  /** `iconSize` key of the thumb per size. */
  readonly size: Readonly<Record<"sm" | "md" | "lg", string>>;
  /** Per `iconSize` key: the track box (two thumbs wide, one thumb tall, plus the padding). */
  readonly track: Readonly<Record<string, string>>;
  /** Per `iconSize` key: the thumb's move when the switch is on (one thumb width). */
  readonly travel: Readonly<Record<string, string>>;
  readonly focusRing: string;
  readonly disabled: string;
}

/** `role="switch"` on a button: `slot` picks the `track` (the button) or the `thumb` (its child); `color` and `size` reach both through compound entries. */
export const switchTables = (t: ToggleTokens, preset: SwitchPreset) => {
  const bg = createVariantMapper("bg", t.colors);
  const rounded = pick(
    createVariantMapper("rounded", t.borderRadius),
    preset.radius,
  );
  const icon = createVariantMapper("size-icon", t.iconSize);
  const sizes = ["sm", "md", "lg"] as const;
  return {
    base: "",
    variants: {
      slot: {
        track: [
          "group inline-flex shrink-0 cursor-pointer items-center p-0.5 transition-colors duration-150",
          pick(bg, preset.off),
          rounded,
          `focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 ${preset.focusRing}`,
          preset.disabled,
        ],
        thumb: [
          "pointer-events-none block transition-transform duration-150",
          pick(bg, preset.thumb),
          rounded,
        ],
      },
      color: Object.fromEntries(preset.intents.map((intent) => [intent, ""])),
      size: { sm: "", md: "", lg: "" },
    },
    compoundVariants: [
      ...preset.intents.map((intent) => ({
        slot: "track",
        color: intent,
        class: pick(preset.checked, intent),
      })),
      ...sizes.map((size) => ({
        slot: "track",
        size,
        class: pick(preset.track, preset.size[size]),
      })),
      ...sizes.map((size) => ({
        slot: "thumb",
        size,
        class: [
          pick(icon, preset.size[size]),
          pick(preset.travel, preset.size[size]),
        ],
      })),
    ],
    defaultVariants: { slot: "track", color: preset.intents[0], size: "md" },
  } satisfies RecipeTables;
};

export const createSwitchRecipe = (t: ToggleTokens, preset: SwitchPreset) =>
  recipeFromTables(switchTables(t, preset));
