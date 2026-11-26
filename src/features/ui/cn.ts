// Default import: the ESM build of clsx 1.2.0 (peer floor) lacks the named export.
import joinClasses from "clsx";
import type { ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

import {
  createTailwindMergeExtension,
  type TailwindMergeTokens,
} from "../recipes/extendTailwindMerge";

/** clsx + a tailwind-merge that knows one theme's custom utilities. */
export type Cn = (...inputs: ClassValue[]) => string;

/**
 * One `cn` per theme: `clsx`, then a `tailwind-merge` that also knows the
 * theme's own classes (`text-16-medium`, `rounded-pill`, …).
 * @param {TailwindMergeTokens} tokens - The theme's tokens (`DesignTokens.Web`)
 * @returns {Cn} The theme's `cn`
 */
export const createCn = (tokens: TailwindMergeTokens): Cn => {
  const twMerge = extendTailwindMerge(createTailwindMergeExtension(tokens));
  return (...inputs) => twMerge(joinClasses(inputs));
};
