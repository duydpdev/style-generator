import { compile } from "@tailwindcss/node";

/**
 * Single isolation point for calling the real Tailwind v4 compiler
 * (`@tailwindcss/node`'s `compile()`/`build()`). That API is not public
 * per the Tailwind maintainers, so every integration/e2e test that needs
 * real compiled CSS goes through this one helper instead of calling
 * `compile()` directly.
 *
 * Prepends `@import "tailwindcss";` to the given generated CSS (plus any
 * extra hand-written CSS appended by the caller, e.g. a fixture's color
 * reference rule), compiles it, then builds the result for the given
 * utility-class candidate list.
 * @param {string} css - `generate().css` output (optionally with extra CSS appended by the caller)
 * @param {string[]} candidates - Utility class names to build (empty array is valid — see `@source inline` tests)
 * @returns {Promise<string>} Compiled CSS for the given candidates
 */
export async function compileFixtureCss(
  css: string,
  candidates: string[],
): Promise<string> {
  const input = `@import "tailwindcss";\n${css}`;
  const result = await compile(input, {
    base: process.cwd(),
    onDependency: () => undefined,
  });
  return result.build(candidates);
}
