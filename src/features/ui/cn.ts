// Default import on purpose: clsx 1.2.0 (the floor of the peer range) ships
// the named `clsx` export only in its CJS build and its d.ts; the ESM build
// gained it in 1.2.1. The default export exists in every version in range.
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
 * One `cn` per theme. `clsx` joins the inputs; a `tailwind-merge`
 * extended with `createTailwindMergeExtension(tokens)` then keeps the
 * last class of each group, including the theme's own classes
 * (`text-16-medium`, `shadow-md`, `rounded-pill`, `border-thin`), which
 * the default `tailwind-merge` does not know.
 * @param {TailwindMergeTokens} tokens - The theme's tokens (`DesignTokens.Web`)
 * @returns {Cn} The theme's `cn`
 */
export const createCn = (tokens: TailwindMergeTokens): Cn => {
  const twMerge = extendTailwindMerge(createTailwindMergeExtension(tokens));
  return (...inputs) => twMerge(joinClasses(inputs));
};
