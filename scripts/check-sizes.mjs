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
// are unchanged. No budget raised. Re-measured 2026-10-28 (5.0.0-DEV.N,
// phase 09: inferred token types, `aliasedColors`): index 9907, tokens 1688
// (1591 without `aliasedColors`; it walks the base and every `themeAxes`
// override, and the unused `axisOverrides` field was dropped), cva 729,
// spacing 791, types 55, vite 9916, next 9803, cli 34991. Budget raised:
// tokens 1700 -> 1850 (measured 1688 + ~10%; `aliasedColors` is intrinsic).
// Re-measured 2026-10-28 (5.0.0-DEV.N, phase 10): recipes 2076 (new
// `./recipes` subpath: its entry plus the `helpers`, `spacing`,
// `defaultOption` and `axisAttributeName` chunks it shares), budget 2284 =
// measured + ~10%. index 10954, vite 10967 and next 10854 grew by ~1.05 kB
// (vs phase 09; cli 34991 -> 37694 = +2.7 kB because the tsdown bundle is
// unminified and keeps every JSDoc block) from the `axes` option (options schema, resolve,
// `assertAxesOptions`/`checkElementScopeAliases`, `generateThemeCss`
// signature), NOT from `./recipes`: index measured 10504 without it, before
// the last axes checks landed. tokens 1686, cva 727, spacing 788 and types
// 55 are back at their phase-09 values. With the default chunking
// `./recipes` splits `helpers`/`colorStates` and `spacingHelpers` off their
// entry chunks and pushed tokens to 1861, cva to 902 and spacing to 919; the
// `manualChunks` rule in vite.config.ts pins those modules to stable chunks,
// and `axisAttributeName` lives in its own module so `./tokens`/`./cva` do
// not carry it. Budgets raised for the measured intrinsic `axes` growth
// (measured + ~10%): index 11100 -> 12050, vite 11150 -> 12050, next 11050 ->
// 11950, cli 38000 -> 41450; plus the new `recipes` entry.
// Budgets = measured + ~10% headroom; tokens, cva, spacing and types are
// unchanged and must not drift (fix the import or chunk, don't raise them).
const budgets = {
  index: 12_050,
  tokens: 1_850,
  cva: 800,
  spacing: 1_000,
  recipes: 2_284,
  types: 100,
  vite: 12_050,
  next: 11_950,
  cli: 41_450,
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
