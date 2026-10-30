import type { StyleGeneratorOptions } from "@duydpdev/style-generator/types";

/**
 * The generator options, shared by the three apps' bundler configs
 * (`styleGenVite` / `styleGenNext`), by `tokens.ts` and by the typed recipes.
 *
 * Dependency-free on purpose: bundler configs load this file through Node's
 * type stripping, and `tokens.ts` runs in the browser — so it uses
 * `as const satisfies` with a type-only import instead of `defineOptions`
 * (root-only, pulls Zod into the browser bundle). The literal `breakpoints`
 * tuple is what narrows `BreakpointKeys<typeof options>` to `"md" | "lg"`.
 * `style-gen.config.json` mirrors it for the CLI-only flow; a test pins the two.
 */
// #region docs:options
export const options = {
  breakpoints: ["md", "lg"],
} as const satisfies StyleGeneratorOptions;
// #endregion docs:options
