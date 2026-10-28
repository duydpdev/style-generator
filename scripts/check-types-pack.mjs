#!/usr/bin/env node
/**
 * Packs the package and runs `@arethetypeswrong/cli` on the tarball with the
 * `node16` profile: every subpath must resolve its types from ESM (`import`)
 * and from CJS (`require`, which needs the `.d.cts` files that
 * `scripts/emit-cts-types.mjs` emits). Needs `dist/` (`yarn build:all`).
 *
 * `--profile node16` is required: `moduleResolution: node10` ignores
 * `exports` and fails for every subpath (no `typesVersions`), which this
 * package does not support.
 *
 * `yarn pack` runs `prepack`/`postpack` (`pinst`), which edit and restore
 * `package.json`; that is fine here and in CI but must not move into
 * `prepublish` (the publish packs again).
 */
import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tarball = join(tmpdir(), "style-generator-attw.tgz");
const attw = join(
  root,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "attw.cmd" : "attw",
);

/**
 * Print an error and exit non-zero.
 * @param {string} message - What went wrong
 * @returns {never} Never returns
 */
const fail = (message) => {
  console.error(`check-types-pack: ${message}`);
  process.exit(1);
};

if (!existsSync(join(root, "dist"))) {
  fail("dist/ does not exist; run `yarn build:all` first");
}
if (!existsSync(attw)) {
  fail("@arethetypeswrong/cli is not installed; run `yarn install`");
}

/**
 * Run a command in the repo root with inherited stdio.
 * @param {string} command - Executable
 * @param {string[]} args - Arguments
 * @returns {number} Exit status (1 when the process did not start)
 */
const run = (command, args) =>
  spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  }).status ?? 1;

// `fail()` exits immediately, which would skip `finally`; record the problem
// and exit once the tarball is removed.
let problem;
try {
  if (run("yarn", ["pack", "--out", tarball]) !== 0) {
    problem = "yarn pack failed";
  } else if (run(attw, [tarball, "--profile", "node16"]) !== 0) {
    problem = "attw reported a types resolution problem";
  }
} finally {
  rmSync(tarball, { force: true });
}
if (problem !== undefined) fail(problem);

console.log("✓ attw: all subpaths resolve under node16 (ESM and CJS)");
