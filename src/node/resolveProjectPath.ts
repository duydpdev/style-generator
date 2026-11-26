import { isAbsolute, relative, resolve, sep } from "node:path";

/**
 * @param {string} root - Absolute directory to resolve `inputPath` against
 * @param {string} inputPath - User-supplied path, absolute or relative to `root`
 * @param {string} label - Prefix of the error thrown when the path escapes `root` (`"[style-gen-vite] output"`)
 * @param {object} [opts] - Options
 * @param {boolean} [opts.allowOutsideRoot] - `true` skips the containment check
 * @returns {string} The absolute path
 */
export function resolveProjectPath(
  root: string,
  inputPath: string,
  label: string,
  opts?: { allowOutsideRoot?: boolean },
): string {
  // Rationale: documents/architecture.md#resolveprojectpath-containment-rules
  const abs = resolve(root, inputPath);
  if (opts?.allowOutsideRoot === true) return abs;
  const rel = relative(root, abs);
  if (rel === ".." || rel.startsWith(".." + sep) || isAbsolute(rel)) {
    throw new Error(`${label} escapes project root: ${inputPath}`);
  }
  return abs;
}
