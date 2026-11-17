import fs from "node:fs";
import path from "node:path";

/** Options of {@link sameFile}. */
export interface SameFileOptions {
  /**
   * Whether the filesystem holding `dir` ignores case. Defaults to
   * {@link isCaseInsensitiveDir}; a test injects it to cover both kinds of
   * filesystem on one machine.
   */
  caseInsensitive?: (dir: string) => boolean;
}

const statBig = (file: string): fs.BigIntStats | undefined => {
  try {
    return fs.statSync(file, { bigint: true, throwIfNoEntry: false });
  } catch {
    return undefined;
  }
};

/**
 * Whether the filesystem of an existing directory ignores case: stat it with
 * its basename's case flipped and compare `dev` + `ino`. Read-only. A
 * basename without a letter (`/`) proves nothing and reads as case-sensitive.
 * @param {string} dir - An existing directory, as `realpath` returns it
 * @returns {boolean} True when the flipped name reaches the same directory
 */
export function isCaseInsensitiveDir(dir: string): boolean {
  const base = path.basename(dir);
  const flipped = base.replace(/\p{L}/gu, (char) =>
    char === char.toLowerCase() ? char.toUpperCase() : char.toLowerCase(),
  );
  if (flipped === base) return false;
  const original = statBig(dir);
  const other = statBig(path.join(path.dirname(dir), flipped));
  return (
    original !== undefined &&
    other !== undefined &&
    original.ino !== 0n &&
    original.dev === other.dev &&
    original.ino === other.ino
  );
}

interface Canonical {
  /** `realpath` of the deepest existing ancestor. */
  base: string;
  /** The segments below it, as written. */
  tail: string[];
}

const canonicalize = (file: string): Canonical => {
  const tail: string[] = [];
  let current = file;
  for (;;) {
    try {
      return { base: fs.realpathSync.native(current), tail };
    } catch {
      const parent = path.dirname(current);
      if (parent === current) return { base: current, tail };
      tail.unshift(path.basename(current));
      current = parent;
    }
  }
};

/**
 * Whether two paths name one file, so a write to one clobbers the other.
 * - Both exist: the same `dev` + `ino` (a symlink, a hard link or a
 *   case-insensitive spelling all qualify).
 * - Exactly one exists: different files.
 * - Neither exists: the same `realpath` of the deepest existing ancestor plus
 *   the remaining segments, ignoring case only when a read-only probe shows
 *   that ancestor's filesystem is case-insensitive.
 * An inode number of `0` (some Windows filesystems) is unknown and falls back
 * to the canonical-path rule.
 * @param {string} a - One path, resolved against the working directory
 * @param {string} b - The other path
 * @param {SameFileOptions} [options] - Test seams
 * @returns {boolean} True when both name one file
 */
export function sameFile(
  a: string,
  b: string,
  options: SameFileOptions = {},
): boolean {
  const pathA = path.resolve(a);
  const pathB = path.resolve(b);
  if (pathA === pathB) return true;

  const statA = statBig(pathA);
  const statB = statBig(pathB);
  if (statA !== undefined && statB !== undefined) {
    if (statA.ino !== 0n && statB.ino !== 0n) {
      return statA.dev === statB.dev && statA.ino === statB.ino;
    }
  } else if (statA !== undefined || statB !== undefined) {
    return false;
  }

  const canonicalA = canonicalize(pathA);
  const canonicalB = canonicalize(pathB);
  const fullA = path.join(canonicalA.base, ...canonicalA.tail);
  const fullB = path.join(canonicalB.base, ...canonicalB.tail);
  if (fullA === fullB) return true;
  if (fullA.toLowerCase() !== fullB.toLowerCase()) return false;
  return (options.caseInsensitive ?? isCaseInsensitiveDir)(canonicalA.base);
}
