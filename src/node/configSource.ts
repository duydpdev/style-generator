import fs from "node:fs";
import path from "node:path";

import type { EmitTarget } from "./themeEmitter";

/**
 * The files a config can live in, highest precedence first: `readConfigFile`
 * reads `style-gen.config.json` when it exists, else `package.json#style-gen`.
 * Every watcher (Vite, Next.js, `generate --watch`) watches ALL of them, so a
 * config that moves from one file to the other is noticed.
 */
const CONFIG_FILE_NAMES = ["style-gen.config.json", "package.json"] as const;

/**
 * Absolute paths of the config candidates in `root`, in precedence order.
 * They need not exist yet.
 * @param {string} root - Directory the config is read from
 * @returns {string[]} The candidate paths, highest precedence first
 */
export const configCandidates = (root: string): string[] =>
  CONFIG_FILE_NAMES.map((name) => path.resolve(root, name));

/**
 * Which candidate a file event concerns, when it can change the config: the
 * index of `file` in `candidates`, or `undefined` for another file or for a
 * candidate shadowed by an earlier one that exists (a `package.json` edit,
 * e.g. `yarn add`, while `style-gen.config.json` is in force).
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
 * Whether a reloaded target equals the one in force, so a `package.json` edit
 * that leaves the `style-gen` section alone needs no emit.
 * @param {EmitTarget} a - One target
 * @param {EmitTarget} b - The other
 * @returns {boolean} True when paths and options are identical
 */
export const sameEmitTarget = (a: EmitTarget, b: EmitTarget): boolean =>
  JSON.stringify(a) === JSON.stringify(b);
