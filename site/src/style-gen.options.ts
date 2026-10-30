import type { StyleGeneratorOptions } from "@duydpdev/style-generator/types";

/**
 * Generator options shared by `vite.config.ts` (`styleGenVite`) and `ui.ts`
 * (`createDesignTokens`), so `tokens.breakpoints` matches the emitted CSS.
 * Type-only import: `defineOptions` would pull Zod into the browser bundle.
 */
export const options = {
  breakpoints: ["md", "lg"],
} as const satisfies StyleGeneratorOptions;
