import { createDesignTokens } from "@duydpdev/style-generator/tokens";
import type { ColorVariant } from "@duydpdev/style-generator/types";

import {
  createBoxRecipe,
  createButtonRecipe,
  createTextRecipe,
  type ButtonPreset,
} from "./recipes/factories";
import altJson from "./theme.alt.json";

/**
 * A second theme that shares no key with `theme.json`, bound to the same
 * theme-free factories. Only this preset changes: no factory file knows
 * either theme. Not exported from the package entry; the tests import it.
 */
export type AltTheme = typeof altJson;

export const altTheme = altJson;

/**
 * The alt theme's generator options: a second theme resolved at runtime; it
 * does not read style-gen.config.json (which belongs to `theme.json`).
 */
export const altOptions = {
  breakpoints: ["md", "lg"],
  coverage: { colors: { opacities: [10, 20, 50, 80] } },
} as const;

export const altTokens = createDesignTokens(altJson, altOptions).DesignTokens
  .Web;

/** The alt theme's intents; `satisfies` fails here if one leaves the theme. */
export const altIntents = [
  "brand",
  "positive",
  "alert",
] as const satisfies readonly ColorVariant<AltTheme>[];

/** `focusRing`, `disabled` and `hoverTint` are literal classes, so Tailwind's scanner sees them; the alt theme has no `opacity` group, so `disabled` uses Tailwind's own `opacity-50`. */
export const altButtonPreset = {
  intents: altIntents,
  background: "paper",
  radius: "soft",
  type: "body",
  typeLg: "title",
  height: { sm: "compact", md: "regular", lg: "roomy" },
  focusRing: "focus-visible:outline-brand",
  disabled: "disabled:opacity-50",
  hoverTint: {
    brand: "hover:bg-brand-subtle",
    positive: "hover:bg-positive-subtle",
    alert: "hover:bg-alert-subtle",
  },
} as const satisfies ButtonPreset;

export const altButtonRecipe = createButtonRecipe(altTokens, altButtonPreset);

export const altTextRecipe = createTextRecipe(altTokens);

export const altBoxRecipe = createBoxRecipe(altTokens);
