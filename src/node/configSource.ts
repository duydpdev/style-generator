import fs from "node:fs";
import path from "node:path";

import type { EmitTarget } from "./themeEmitter";

// Highest precedence first; watchers watch all of them, so a moved config is noticed.
const CONFIG_FILE_NAMES = ["style-gen.config.json", "package.json"] as const;

/**
 * Absolute config candidate paths in `root`, in precedence order; they need not exist.
 * @param {string} root - Directory the config is read from
 * @returns {string[]} The candidate paths, highest precedence first
 */
export const configCandidates = (root: string): string[] =>
  CONFIG_FILE_NAMES.map((name) => path.resolve(root, name));

/**
 * Index of `file` in `candidates`; `undefined` for another file or a shadowed candidate.
 * @param {readonly string[]} candidates - {@link configCandidates}
 * @param {string} file - The path an event named
 * @returns {number | undefined} Index of the live candidate
 */
export const liveConfigIndex = (
  candidates: readonly string[],
  file: string,
): number | undefined => {
  const abs = path.resolve(file);
  const index = candidates.indexOf(abs);
  if (index < 0) return undefined;
  const shadowed = candidates
    .slice(0, index)
    .some((earlier) => fs.existsSync(earlier));
  return shadowed ? undefined : index;
};

/**
 * Whether a reloaded target equals the one in force (no emit needed).
 * @param {EmitTarget} a - One target
 * @param {EmitTarget} b - The other
 * @returns {boolean} True when paths and options are identical
 */
export const sameEmitTarget = (a: EmitTarget, b: EmitTarget): boolean =>
  JSON.stringify(a) === JSON.stringify(b);
