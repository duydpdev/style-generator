import { createDesignTokens } from "@duydpdev/style-generator/tokens";
import type { ColorVariant } from "@duydpdev/style-generator/types";

import {
  createBoxRecipe,
  createButtonRecipe,
  createTextRecipe,
  type ButtonPreset,
} from "./recipes/factories";
import { options } from "./style-gen.options";
import altJson from "./theme.alt.json";

/**
 * A second theme that shares no key with `theme.json`, bound to the same
 * theme-free factories. Only this preset changes: no factory file knows
 * either theme. Not exported from the package entry; the tests import it.
 */
export type AltTheme = typeof altJson;

export const altTheme = altJson;

export const altTokens = createDesignTokens(altJson, options).DesignTokens.Web;

/** The alt theme's intents; `satisfies` fails here if one leaves the theme. */
export const altIntents = [
  "brand",
  "positive",
  "alert",
] as const satisfies readonly ColorVariant<AltTheme>[];

/** Literal classes, so Tailwind's scanner sees them: the registry emits no `focus-visible:` variant, no `/15` step and no state × opacity (`hover:bg-<key>/10`). */
export const altButtonPreset = {
  intents: altIntents,
  background: "paper",
  radius: "soft",
  type: "body",
  typeLg: "title",
  focusRing: {
    brand: "focus-visible:outline-brand",
    positive: "focus-visible:outline-positive",
    alert: "focus-visible:outline-alert",
  },
  tint: {
    brand: {
      outline: "border-brand text-brand hover:bg-brand/10",
      soft: "bg-brand/10 text-brand hover:bg-brand/15",
      ghost: "text-brand hover:bg-brand/10",
      link: "text-brand",
    },
    positive: {
      outline: "border-positive text-positive hover:bg-positive/10",
      soft: "bg-positive/10 text-positive hover:bg-positive/15",
      ghost: "text-positive hover:bg-positive/10",
      link: "text-positive",
    },
    alert: {
      outline: "border-alert text-alert hover:bg-alert/10",
      soft: "bg-alert/10 text-alert hover:bg-alert/15",
      ghost: "text-alert hover:bg-alert/10",
      link: "text-alert",
    },
  },
} as const satisfies ButtonPreset;

export const altButtonRecipe = createButtonRecipe(altTokens, altButtonPreset);

export const altTextRecipe = createTextRecipe(altTokens);

export const altBoxRecipe = createBoxRecipe(altTokens);
