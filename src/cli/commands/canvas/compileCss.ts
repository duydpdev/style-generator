/**
 * Which class candidates Tailwind turns into a rule, by compiling them against
 * the product's theme CSS with the `tailwindcss` peer. Loaded with `import()`
 * only by `--boards` runs, so no other command pays for it.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import { CanvasInputError } from "./scan";

interface Stylesheet {
  path: string;
  base: string;
  content: string;
}

interface TailwindCompiler {
  build(candidates: string[]): string;
}

interface TailwindModule {
  compile(
    css: string,
    options: {
      base: string;
      loadStylesheet(id: string, base: string): Promise<Stylesheet>;
    },
  ): Promise<TailwindCompiler>;
}

/** Compiles class candidates against one theme. */
export interface RuleCompiler {
  /** The candidates that compile to at least one CSS rule. */
  producing(candidates: Iterable<string>): Set<string>;
}

// Tailwind's own sheets minus preflight: theme variables and the utilities.
const TAILWIND_ENTRY = `@layer theme, base, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);
`;

// The product's `tailwindcss` first, then the one this package resolves.
function resolverFor(cwd: string): NodeJS.Require {
  const product = createRequire(join(cwd, "package.json"));
  try {
    product.resolve("tailwindcss");
    return product;
  } catch {
    return createRequire(import.meta.url);
  }
}

async function loadTailwind(require: NodeJS.Require): Promise<TailwindModule> {
  let entry: string;
  try {
    entry = require.resolve("tailwindcss");
  } catch {
    throw new CanvasInputError(
      "tailwindcss is not installed (--boards compiles the classes with it)",
    );
  }
  const loaded = (await import(pathToFileURL(entry).href)) as
    Partial<TailwindModule> | { default?: Partial<TailwindModule> };
  const compile =
    (loaded as Partial<TailwindModule>).compile ??
    (loaded as { default?: Partial<TailwindModule> }).default?.compile;
  if (compile === undefined)
    throw new CanvasInputError("tailwindcss exports no compile()");
  return { compile };
}

// Class names a stylesheet selects, unescaped (`.hover\:bg-x` is `hover:bg-x`).
function selectedClasses(css: string): Set<string> {
  const names = new Set<string>();
  for (const m of css.matchAll(/\.((?:\\[\da-f]{1,6} ?|\\.|[\w-])+)/gi))
    names.add(
      (m[1] ?? "")
        .replace(/\\([\da-f]{1,6}) ?/gi, (_whole, hex: string) =>
          String.fromCodePoint(Number.parseInt(hex, 16)),
        )
        .replace(/\\(.)/g, "$1"),
    );
  return names;
}

/**
 * A compiler over `css` (the product's theme CSS, with the resets already in it).
 * @param {object} input - `css` to compile and the project `cwd` Tailwind is resolved from
 * @param {string} input.css - Theme CSS without `@import "tailwindcss"`
 * @param {string} input.cwd - The product's project root
 * @returns {Promise<RuleCompiler>} Ready to test candidates
 * @throws {CanvasInputError} When `tailwindcss` cannot be loaded or rejects the CSS
 */
export async function createRuleCompiler(input: {
  css: string;
  cwd: string;
}): Promise<RuleCompiler> {
  const require = resolverFor(input.cwd);
  const tailwind = await loadTailwind(require);
  const load = (id: string, base: string): Promise<Stylesheet> => {
    const path = id.startsWith("tailwindcss/")
      ? require.resolve(id)
      : join(base, id);
    return Promise.resolve({
      path,
      base: dirname(path),
      content: readFileSync(path, "utf8"),
    });
  };
  let compiler: TailwindCompiler;
  try {
    compiler = await tailwind.compile(`${TAILWIND_ENTRY}${input.css}`, {
      base: input.cwd,
      loadStylesheet: load,
    });
  } catch (error) {
    throw new CanvasInputError(
      `theme CSS does not compile with tailwindcss (${(error as Error).message})`,
    );
  }
  return {
    producing(candidates) {
      const list = [...new Set(candidates)];
      const selected = selectedClasses(compiler.build(list));
      return new Set(list.filter((candidate) => selected.has(candidate)));
    },
  };
}
