import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import {
  createTailwindMergeExtension,
  type TailwindMergeTokens,
} from "@duydpdev/style-generator/recipes";

/** clsx + a tailwind-merge that knows one theme's custom utilities. */
export type Cn = (...inputs: ClassValue[]) => string;

/**
 * One `cn` per theme. tailwind-merge does not know `text-16-medium`,
 * `shadow-md`, `rounded-pill` or `border-thin`; the extension registers
 * them in their class groups, so the last one of a group wins.
 */
export const createCn = (tokens: TailwindMergeTokens): Cn => {
  const twMerge = extendTailwindMerge(createTailwindMergeExtension(tokens));
  return (...inputs) => twMerge(clsx(inputs));
};
