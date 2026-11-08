import type { StyleGeneratorOptions } from "@duydpdev/style-generator/types";

/**
 * The generator options, shared by the two harness apps' bundler configs
 * (`styleGenVite`), by `tokens.ts` and by the typed recipes.
 *
 * Dependency-free on purpose: bundler configs load this file through Node's
 * type stripping, and `tokens.ts` runs in the browser — so it uses
 * `as const satisfies` with a type-only import instead of `defineOptions`
 * (root-only, pulls Zod into the browser bundle). The literal `breakpoints`
 * tuple is what narrows `BreakpointKeys<typeof options>` to `"md" | "lg"`;
 * the literal `opacities` tuple types `tokens.opacities` and so the `key/step`
 * color props. `style-gen.config.json` mirrors it for the CLI-only flow; a
 * test pins the two (and the harness `package.json#style-gen` copy).
 */
// #region docs:options
export const options = {
  breakpoints: ["md", "lg"],
  coverage: { colors: { opacities: [10, 20, 50, 80] } },
} as const satisfies StyleGeneratorOptions;
// #endregion docs:options
