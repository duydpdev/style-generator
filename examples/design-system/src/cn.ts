import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import { createTailwindMergeExtension } from "@duydpdev/style-generator/recipes";

import { tokens } from "./tokens";

// tailwind-merge does not know the theme's `text-16-medium`, `shadow-md`,
// `rounded-pill` or `border-thin` utilities; the extension registers them in
// the class groups they belong to, so `cn("text-16-medium", "text-32-bold")`
// keeps only the last one and `cn("rounded-md", "rounded-pill")` too.
const twMerge = extendTailwindMerge(createTailwindMergeExtension(tokens));

export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
