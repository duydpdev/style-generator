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
  /** The stylesheet the candidates compile to. */
  build(candidates: Iterable<string>): string;
  /** The version of the `tailwindcss` that compiles them. */
  readonly tailwindVersion: string;
}

// Tailwind's own sheets: theme variables, the utilities and, when asked, the preflight reset.
const tailwindEntry = (
  preflight: boolean,
): string => `@layer theme, base, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
${preflight ? '@import "tailwindcss/preflight.css" layer(base);\n' : ""}@import "tailwindcss/utilities.css" layer(utilities);
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

// The `version` of the `tailwindcss` package that owns `entry`, or "unknown".
function versionOf(entry: string): string {
  for (let dir = dirname(entry); dirname(dir) !== dir; dir = dirname(dir)) {
    try {
      const pkg = JSON.parse(
        readFileSync(join(dir, "package.json"), "utf8"),
      ) as { name?: string; version?: string };
      if (pkg.name === "tailwindcss") return pkg.version ?? "unknown";
    } catch {
      // no package.json in this directory: keep climbing
    }
  }
  return "unknown";
}

async function loadTailwind(
  require: NodeJS.Require,
): Promise<TailwindModule & { version: string }> {
  let entry: string;
  try {
    entry = require.resolve("tailwindcss");
  } catch {
    throw new CanvasInputError(
      "tailwindcss is not installed (the class rules and ds build compile classes with it)",
    );
  }
  const loaded = (await import(pathToFileURL(entry).href)) as
    Partial<TailwindModule> | { default?: Partial<TailwindModule> };
  const compile =
    (loaded as Partial<TailwindModule>).compile ??
    (loaded as { default?: Partial<TailwindModule> }).default?.compile;
  if (compile === undefined)
    throw new CanvasInputError("tailwindcss exports no compile()");
  return { compile, version: versionOf(entry) };
}

// The text in front of each `{`: what follows the previous `{`, `}` or `;`.
function preludes(css: string): string[] {
  const found: string[] = [];
  let start = 0;
  for (let i = 0; i < css.length; i++) {
    const char = css[i];
    if (char === "{") found.push(css.slice(start, i));
    if (char === "{" || char === "}" || char === ";") start = i + 1;
  }
  return found;
}

/**
 * The class names a stylesheet's selectors name, unescaped (`.hover\:bg-x` is `hover:bg-x`). Only the text before a
 * `{` counts, and at-rule preludes and comments do not, so `.25em` in a value or `.com` in a licence line is no class.
 * @param {string} css - A compiled stylesheet
 * @returns {Set<string>} Distinct class names
 */
export function selectedClasses(css: string): Set<string> {
  const names = new Set<string>();
  for (const prelude of preludes(css.replaceAll(/\/\*[\s\S]*?\*\//g, ""))) {
    if (prelude.trimStart().startsWith("@")) continue;
    for (const m of prelude.matchAll(/\.((?:\\[\da-f]{1,6} ?|\\.|[\w-])+)/gi))
      names.add(
        (m[1] ?? "")
          .replace(/\\([\da-f]{1,6}) ?/gi, (_whole, hex: string) =>
            String.fromCodePoint(Number.parseInt(hex, 16)),
          )
          .replace(/\\(.)/g, "$1"),
      );
  }
  return names;
}

/**
 * A compiler over `css` (the product's theme CSS, with the resets already in it).
 * @param {object} input - `css` to compile and the project `cwd` Tailwind is resolved from
 * @param {string} input.css - Theme CSS without `@import "tailwindcss"`
 * @param {string} input.cwd - The product's project root
 * @param {boolean} [input.preflight] - Include Tailwind's preflight reset (a stylesheet that ships, not a rule check)
 * @returns {Promise<RuleCompiler>} Ready to test candidates; rejects with `CanvasInputError` when `tailwindcss` cannot be loaded
 */
export async function createRuleCompiler(input: {
  css: string;
  cwd: string;
  preflight?: boolean;
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
    compiler = await tailwind.compile(
      `${tailwindEntry(input.preflight === true)}${input.css}`,
      {
        base: input.cwd,
        loadStylesheet: load,
      },
    );
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
    build: (candidates) => compiler.build([...new Set(candidates)]),
    tailwindVersion: tailwind.version,
  };
}
