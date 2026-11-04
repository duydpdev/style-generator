/**
 * How a `dist/<name>.d.ts` becomes its `dist/<name>.d.cts` twin (shared by
 * `emit-cts-types.mjs` and `smoke-dist.mjs`, so the build and its check agree).
 *
 * A `.d.cts` resolves its imports with the `require` condition. Every
 * non-relative specifier a rolled-up declaration imports needs a rule here:
 * - `zod`, `class-variance-authority`, `clsx`, `tailwind-merge` and `react`
 *   (`@types/react`) resolve their own declarations under `require`: kept as is.
 * - `vite` has no usable CommonJS types in any supported major (5/6: an
 *   `export = any` stub without `Plugin`; 7/8: ESM only), so the copy imports
 *   it type-only with the `import` condition via `resolution-mode`. The
 *   `assert` spelling, not `with`: `with` is a parse error on TypeScript < 5.3
 *   (peer floor `^5.0.0`) even under `skipLibCheck`; `assert` parses on every
 *   5.x/6.x, and TS 5.8+ only rejects it on value imports under `nodenext`.
 *
 * Fail-closed: an unknown specifier fails the build, and so does any other
 * non-relative module reference the rules did not handle (default or
 * namespace import, side-effect import, mixed default and named import,
 * `export … from`,
 * `import x = require()`, `import("…")` type, `declare module "…"`). A new
 * external import must be a deliberate decision, not a silent
 * CommonJS-resolution bug. Comment lines are skipped: the built
 * declarations carry `import … from "…"` examples in JSDoc.
 */

/** @type {Record<string, (line: string) => string>} */
const CJS_SAFE_IMPORTS = {
  zod: (line) => line,
  "class-variance-authority": (line) => line,
  clsx: (line) => line,
  "tailwind-merge": (line) => line,
  react: (line) => line,
  vite: (line) =>
    line
      .replace(/^import \{/, "import type {")
      .replace(/;$/, " assert { 'resolution-mode': 'import' };"),
};

// Rolled-up declarations carry one named import per package (single- or multi-line).
const EXTERNAL_IMPORT_RE =
  /^import (?:type )?\{[^}]*\} from '([^'./][^']*)';$/gm;

// A non-relative module specifier after `from`, a side-effect `import`,
// `import(`, `require(` or `declare module`; group 1 is the package.
const OTHER_REFERENCE_RE =
  // eslint-disable-next-line sonarjs/regex-complexity -- one alternation over every module-reference form sharing the quote and package capture; splitting it would duplicate that capture per form
  /(?:\bfrom\s+|^\s*import\s+|\bimport\s*\(\s*|\brequire\s*\(\s*|\bdeclare\s+module\s+)['"]([^'"./][^'"]*)['"]/;

/**
 * Rewrite a built declaration for CommonJS consumers.
 * @param {string} source - Contents of `dist/<name>.d.ts`
 * @param {string} name - File name, for error messages
 * @returns {string} Contents of `dist/<name>.d.cts`
 */
export const toCjsDeclaration = (source, name) => {
  const rewritten = source.replace(EXTERNAL_IMPORT_RE, (line, specifier) => {
    const rewrite = CJS_SAFE_IMPORTS[specifier];
    if (!rewrite) {
      throw new Error(
        `${name} imports "${specifier}", which has no CommonJS rule`,
      );
    }
    return rewrite(line);
  });
  for (const line of source.replace(EXTERNAL_IMPORT_RE, "").split("\n")) {
    const code = line.trimStart();
    if (/^(?:\*|\/\*|\/\/)/.test(code)) continue;
    const reference = OTHER_REFERENCE_RE.exec(code);
    if (reference) {
      throw new Error(
        `${name} references "${reference[1]}" in a form the CommonJS rules do not cover: ${code}`,
      );
    }
  }
  return rewritten;
};
