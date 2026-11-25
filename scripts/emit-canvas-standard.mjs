#!/usr/bin/env node
/**
 * Copy `src/cli/canvas/design-canvas-standard.json`, the manifest
 * `style-gen canvas check` applies by default, to
 * `dist/canvas/design-canvas-standard.json`, so a project can read it from
 * the installed package and pass an edited copy with `--standard`.
 *
 * Runs as the last step of `yarn build:cli`, after tsdown (which cleans only
 * `dist/cli`).
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

if (!existsSync(dist)) {
  console.error(
    "emit-canvas-standard: dist/ does not exist; run `yarn build:cli` first",
  );
  process.exit(1);
}

const outDir = join(dist, "canvas");
mkdirSync(outDir, { recursive: true });
copyFileSync(
  join(root, "src/cli/canvas/design-canvas-standard.json"),
  join(outDir, "design-canvas-standard.json"),
);
console.log("✓ emitted dist/canvas/design-canvas-standard.json");
