import { isAbsolute, relative, resolve, sep } from "node:path";

/**
 * Resolve `inputPath` against `root` and reject anything that escapes it
 * (`..` traversal, or an absolute path outside `root`). Shared by
 * `styleGenVite` and `styleGenNext` — both accept user-supplied
 * `themePath`/`outDir` options that must stay inside the consumer's
 * project directory.
 *
 * The traversal check matches on a `..` PATH COMPONENT (`rel === ".."` or
 * `rel.startsWith(".." + sep)`), not merely on `rel` starting with the
 * two characters `".."` — a real sibling directory whose name happens to
 * start with dots (e.g. `..foo`) produces a `relative()` result like
 * `"..foo/bar"`, which is a normal in-root path, not a traversal, and
 * must NOT be rejected by a bare `.startsWith("..")` check.
 * @param {string} root - Absolute directory to resolve `inputPath` against.
 * @param {string} inputPath - User-supplied path, absolute or relative to
 *   `root`.
 * @param {string} label - Prefixed onto the thrown message so callers can
 *   tell which option failed (e.g. `"[style-gen-vite] themePath"`).
 * @returns {string} The resolved absolute path, guaranteed to be inside
 *   `root`.
 * @throws {Error} If the resolved path is outside `root`.
 */
export const resolveSafePath = (
  root: string,
  inputPath: string,
  label: string,
): string => {
  const abs = isAbsolute(inputPath) ? inputPath : resolve(root, inputPath);
  const rel = relative(root, abs);
  if (rel === ".." || rel.startsWith(".." + sep) || isAbsolute(rel)) {
    throw new Error(`${label} escapes project root: ${inputPath}`);
  }
  return abs;
};
