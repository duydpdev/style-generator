import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

import { compile } from "@tailwindcss/node";
import { Scanner } from "@tailwindcss/oxide";

/**
 * Inside the repo so Tailwind's module resolution still walks up to
 * `node_modules/tailwindcss` from the temp base directory.
 */
const IMPORTS_ROOT = resolve(process.cwd(), "node_modules/.cache/sg-compile");

export interface CompileFixtureOptions {
  /**
   * Files to make importable from `css`, keyed by path relative to the
   * compile base (e.g. `{ "theme.css": css }` for `@import "./theme.css";`).
   * Written to a throwaway directory that becomes the compile `base`.
   */
  imports?: Record<string, string>;
}

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
 * @param {CompileFixtureOptions} [options] - Extra files `css` can `@import`
 * @returns {Promise<string>} Compiled CSS for the given candidates
 */
export async function compileFixtureCss(
  css: string,
  candidates: string[],
  options: CompileFixtureOptions = {},
): Promise<string> {
  const input = `@import "tailwindcss";\n${css}`;
  const { imports } = options;
  if (!imports) {
    const result = await compile(input, {
      base: process.cwd(),
      onDependency: () => undefined,
    });
    return result.build(candidates);
  }

  mkdirSync(IMPORTS_ROOT, { recursive: true });
  const base = mkdtempSync(join(IMPORTS_ROOT, "fixture-"));
  try {
    for (const [file, content] of Object.entries(imports)) {
      const target = resolve(base, file);
      const rel = relative(base, target);
      if (rel.startsWith("..") || isAbsolute(rel)) {
        throw new Error(`compileFixtureCss: import "${file}" escapes the base`);
      }
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, content, "utf8");
    }
    const result = await compile(input, {
      base,
      onDependency: () => undefined,
    });
    return result.build(candidates);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
}

/**
 * Compile like an app build: `source(none)` turns off automatic detection,
 * Tailwind's own scanner reads the `@source` paths in `css` (relative to
 * `base`), and the build gets exactly those candidates plus `@source inline`.
 * @param {string} css - CSS appended after `@import "tailwindcss" source(none);`
 * @param {string} base - Absolute directory the `@source` paths are relative to
 * @returns {Promise<{ css: string; candidates: string[] }>} Compiled CSS and the scanned candidates
 */
export async function compileScannedCss(
  css: string,
  base: string,
): Promise<{ css: string; candidates: string[] }> {
  const compiler = await compile(
    `@import "tailwindcss" source(none);\n${css}`,
    {
      base,
      onDependency: () => undefined,
    },
  );
  const candidates = new Scanner({ sources: compiler.sources }).scan();
  return { css: compiler.build(candidates), candidates };
}
