import { isAbsolute, relative, resolve, sep } from "node:path";

/**
 * Resolve a user-supplied path against the project `root`. A relative path
 * is joined to `root`; an absolute path is taken as the filesystem path it
 * says it is (no leading-slash rewrite: `/styles/theme.json` is not
 * `root/styles/theme.json`). Both go through `resolve`, so `..` segments,
 * `.` segments and doubled separators are normalised and the result is a
 * stable key for a watcher or an output file.
 *
 * Unless `allowOutsideRoot` is set, anything that escapes `root` (`..`
 * traversal, or an absolute path outside it) is rejected. The theme may
 * live outside the root (a theme shared by a monorepo); every generated or
 * scaffolded file must stay inside it.
 *
 * The traversal check matches on a `..` PATH COMPONENT (`rel === ".."` or
 * `rel.startsWith(".." + sep)`), not merely on `rel` starting with the two
 * characters `".."` — a sibling directory such as `..foo` produces a
 * `relative()` result like `"..foo/bar"`, which is a normal in-root path.
 *
 * Symlinks are not `realpath`'d: the logical path is compared against
 * `root`.
 * @param {string} root - Absolute directory to resolve `inputPath` against
 * @param {string} inputPath - User-supplied path, absolute or relative to `root`
 * @param {string} label - Prefixed onto the thrown message so callers can tell
 *   which option failed (e.g. `"[style-gen-vite] outDir"`)
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
  const abs = resolve(root, inputPath);
  if (opts?.allowOutsideRoot === true) return abs;
  const rel = relative(root, abs);
  if (rel === ".." || rel.startsWith(".." + sep) || isAbsolute(rel)) {
    throw new Error(`${label} escapes project root: ${inputPath}`);
  }
  return abs;
}
