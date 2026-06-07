import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import { createVariantMapper } from "@duydpdev/style-generator/cva";

import { DesignTokens } from "../theme/design-tokens";

// tailwind-merge groups every `text-*` class under either "font-size" or
// "text-color". Our typography utilities (`text-16-medium`, `text-32-bold`)
// and color tokens (`text-primary`, `text-foreground`, …) all use the `text-`
// prefix, so by default twMerge thinks they conflict and removes one.
// Register the suffixes explicitly so twMerge knows which group each belongs to.
const typographySuffixes = Object.values(
  createVariantMapper("", DesignTokens.Web.variantText),
).map((cls) => cls.replace(/^text-/, ""));

const colorTokens = [...DesignTokens.Web.variantColor];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: typographySuffixes }],
      "text-color": [{ text: colorTokens }],
    },
  },
});

export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
