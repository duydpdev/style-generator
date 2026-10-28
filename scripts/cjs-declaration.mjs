/**
 * How a `dist/<name>.d.ts` becomes its `dist/<name>.d.cts` twin (shared by
 * `emit-cts-types.mjs` and `smoke-dist.mjs`, so the build and its check agree).
 *
 * A `.d.cts` resolves its imports with the `require` condition. Every
 * non-relative specifier a rolled-up declaration imports needs a rule here:
 * - `zod` publishes one `index.d.cts` for both conditions: kept as is.
 * - `vite` has no usable CommonJS types in any supported major (5/6: an
 *   `export = any` stub without `Plugin`; 7/8: ESM only), so the copy imports
 *   it type-only with the `import` condition via `resolution-mode`. The
 *   `assert` spelling, not `with`: `with` is a parse error on TypeScript < 5.3
 *   (peer floor `^5.0.0`) even under `skipLibCheck`; `assert` parses on every
 *   5.x/6.x, and TS 5.8+ only rejects it on value imports under `nodenext`.
 *
 * An unknown specifier fails the build: a new external import must be a
 * deliberate decision, not a silent CommonJS-resolution bug.
 */

/** @type {Record<string, (line: string) => string>} */
const CJS_SAFE_IMPORTS = {
  zod: (line) => line,
  vite: (line) =>
    line
      .replace(/^import \{/, "import type {")
      .replace(/;$/, " assert { 'resolution-mode': 'import' };"),
};

// Rolled-up declarations carry one single-line named import per package.
const EXTERNAL_IMPORT_RE =
  /^import (?:type )?\{[^}]*\} from '([^'./][^']*)';$/gm;

/**
 * Rewrite a built declaration for CommonJS consumers.
 * @param {string} source - Contents of `dist/<name>.d.ts`
 * @param {string} name - File name, for error messages
 * @returns {string} Contents of `dist/<name>.d.cts`
 */
export const toCjsDeclaration = (source, name) =>
  source.replace(EXTERNAL_IMPORT_RE, (line, specifier) => {
    const rewrite = CJS_SAFE_IMPORTS[specifier];
    if (!rewrite) {
      throw new Error(
        `${name} imports "${specifier}", which has no CommonJS rule`,
      );
    }
    return rewrite(line);
  });
