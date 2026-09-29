import { isAbsolute, relative, resolve } from "node:path";

/**
 * Resolve `inputPath` against `root` and reject anything that escapes it
 * (`..` traversal, or an absolute path outside `root`). Shared by
 * `styleGenVite` and `styleGenNext` — both accept user-supplied
 * `themePath`/`outDir` options that must stay inside the consumer's
 * project directory.
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
  if (rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error(`${label} escapes project root: ${inputPath}`);
  }
  return abs;
};
