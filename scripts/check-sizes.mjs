#!/usr/bin/env node
/**
 * Per-subpath gzip size budget, measured as consumers load it: the entry
 * file plus every relative chunk it imports, transitively (each chunk counted
 * once per entry). Fails if an export exceeds its budget. The CLI bundle
 * (`dist/cli/index.mjs`, budget `cli`) is checked the same way. Run after
 * `yarn build:all`.
 */
import { readFileSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));

// Budget per subpath (export key name, not file path), in gzip bytes of the
// transitive closure. `check:sizes` fails if an export in
// `package.json#exports` has no budget entry here.
// Measured 2026-10-05 (v4.0.3, transitive gzip): index 8408, tokens 1508,
// cva 713, spacing 894, types 55, vite 8443, next 8243. Re-measured
// 2026-10-06 (4.1.0: strict options/config schemas, cross-category
// variable check): index 9288, vite 9309, next 9109; the other subpaths are
// unchanged. Re-measured 2026-10-06 (CLI bundle via tsdown): cli 31750.
// Re-measured 2026-10-06 (4.2.0: coverage option, resolveOptions, schema
// split): index 10071, vite 10110, next 9997, cli 34703; tokens 1619 (the shared
// internals live in the entry chunk, see `preserveEntrySignatures` in
// vite.config.ts); cva, spacing and types are unchanged. Re-measured
// 2026-10-07 (5.0.0-DEV.1: borderWidth via `--border-width-*`, spacing arrays,
// `Breakpoint` object, collision check removed, doctor scanner): index 9664,
// tokens 1492, spacing 791, vite 9698, next 9586, cli 34188; cva and types
// are unchanged. No budget raised.
// Budgets = measured + ~10% headroom.
const budgets = {
  index: 11_100,
  tokens: 1_700,
  cva: 800,
  spacing: 1_000,
  types: 100,
  vite: 11_150,
  next: 11_050,
  cli: 38_000,
};

// Budgeted files that are not `package.json#exports` subpaths.
const extraFiles = { cli: "dist/cli/index.mjs" };

// Static `import … from "./x.js"`, `export … from "./x.js"` and bare
// `import "./x.js"` of a sibling build chunk (`.js`, `.mjs` or `.cjs`).
// Package imports are externals (see `check:externals`) and not counted.
const RELATIVE_IMPORT_RE =
  // eslint-disable-next-line sonarjs/slow-regex -- runs on our own build output, never on untrusted input
  /(?:^|[\s;])(?:import|export)\s*(?:[^'"`;]*?\s*from\s*)?["'](\.{1,2}\/[^"']+\.[cm]?js)["']/g;

/**
 * Collect the entry file and every relative chunk it reaches.
 * @param {string} entry - Absolute path of the entry file
 * @returns {string[]} Absolute paths, each once
 */
const closure = (entry) => {
  const seen = new Set();
  const stack = [entry];
  while (stack.length > 0) {
    const file = stack.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    for (const match of readFileSync(file, "utf8").matchAll(
      RELATIVE_IMPORT_RE,
    )) {
      const dep = resolve(dirname(file), match[1]);
      if (!existsSync(dep)) {
        throw new Error(`${relative(root, file)} imports missing ${match[1]}`);
      }
      stack.push(dep);
    }
  }
  return [...seen];
};

const gzipSize = (file) => gzipSync(readFileSync(file)).length;

const exportNames = Object.keys(pkg.exports)
  .filter((key) => key !== "./package.json")
  .map((key) => (key === "." ? "index" : key.replace(/^\.\//, "")));

const targets = [
  ...exportNames.map((name) => [name, `dist/${name}.js`]),
  ...Object.entries(extraFiles),
];

let ok = true;
for (const [name, rel] of targets) {
  const limit = budgets[name];
  if (limit === undefined) {
    console.error(`\u2717 no size budget configured for export: ${name}`);
    ok = false;
    continue;
  }

  const file = resolve(root, rel);
  if (!existsSync(file)) {
    console.error(`\u2717 missing: ${rel}`);
    ok = false;
    continue;
  }

  const files = closure(file);
  const own = gzipSize(file);
  const total = files.reduce((sum, f) => sum + gzipSize(f), 0);
  const ratio = ((total / limit) * 100).toFixed(0);
  const detail = `${total}B gzip transitive (entry ${own}B, ${files.length} files) / ${limit}B (${ratio}%)`;
  if (total > limit) {
    console.error(`\u2717 ${rel}: ${detail}`);
    ok = false;
  } else {
    console.log(`\u2713 ${rel}: ${detail}`);
  }
}

if (!ok) process.exit(1);
console.log("\u2713 size budget passed");
