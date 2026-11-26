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
// 7.0: the `axes` option (and `extraSources`) were removed, so the `axes`
// growth described above is gone; the budgets were not lowered.
// 2026-10-28 (phase 11, node runner): `vite` and `next` now carry the
// shared emitter (config loader, `prepareGenerate`, atomic write, watcher
// glue) and import the `tokens` chunk (the `./tokens` internals are pinned to
// it in `vite.config.ts`, which keeps `./tokens` at one entry + two shared
// chunks). Measured vite 12742 B, next 13163 B (+~10%): vite 12050 -> 14050,
// next 11950 -> 14450. `cli` fell 37694 -> 22496 B after tsdown stopped
// emitting JSDoc (`comments.jsdoc: false`); budget = measured + ~10%:
// 41450 -> 24750.
// tokens 1688, cva 724 and spacing 790 measured in phase 11 are +2/-3/+2 B
// against the phase-10 values (1686/727/788). Their runtime sources are
// unchanged since phase 10 (the only edit under their import closure is a
// type-only addition to `core/Options.ts`), so the delta is chunk-hash import
// specifiers (`./helpers-<hash>.js`, gzip-sensitive) and the `tokens` chunk
// layout, not code; inferred from the unchanged sources, not byte-compared
// with a phase-10 build.
// 2026-10-29 (review fixes): the cross-axis alias-cycle pass
// (`validateCrossAxisAliasCycles`), the typography/font-family class
// collision checks and the strict plugin-options schema are intrinsic schema
// code shared by `index`, `vite`, `next` and `cli`. Measured index 12326, vite
// 14022, next 14177, cli 23685 (vs 12742/13163/22496 for vite/next/cli in
// phase 11). Budgets raised to measured + ~10%: index 12050 -> 13560, vite
// 14050 -> 15430; next (98%) and cli (96%) keep theirs. tokens 1686, recipes
// 2076 are unchanged.
// 2026-11-03 (./ui, ./ui-react): measured ui 3414 B, ui-react 58 B transitive; budgets = measured + ~10 %, rounded up to 10 B. index, tokens, cva, spacing unchanged.
// 2026-11-05 (5.4: four more color prefixes, typed opacity steps, divider-width color-key check, doctor color-prefix warnings): measured next 14632 B, cli 24964 B transitive; budgets raised (user-approved) to measured + ~10 %, rounded up to 10 B: next 14450 -> 16100, cli 24750 -> 27460. index 12796, vite 14476, tokens 1753 (+67), cva 737 (+13), ui 3432 stay within their budgets.
// 2026-11-17 (8.0.2: file identity `sameFile`, schema guards, init warnings; user-approved): cli measured 28123 B transitive, budget raised to measured + ~10 %, rounded up to 10 B: 27460 -> 30940. index 10664 (79 %), vite 15237 (99 %), next 15449 (96 %) and the other budgets are unchanged; `sameFile` landed in the shared node chunk of vite and next without exceeding them.
// 2026-11-17 (8.1.1: library built with Vite 8 / Rolldown; chunk rules are `output.codeSplitting.groups` in vite.config.ts, `manualChunks` is gone): index 9926, tokens 1675 (91 %), cva 752 (94 %), spacing 819, recipes 1821, vite 14221, next 14411, ui 2776, cli 28182. No budget changed. Without the `cva` and `tokens` groups `cva` measured 1007 B (126 %) and `tokens` 1835 B (99 %).
// 2026-11-21 (8.2.1: group-aware coverage-cost suggestion, group-aware config error text, unique group steps in the config schema, budget help text; user-approved): cli measured 30870 B at 8.2.0; budget raised 30940 -> 31100 (+160 B, deliberately tighter than the usual +10 %). No other budget changed.
// 2026-11-24 (starter theme that follows the naming convention: 16 primitives, the 14-key semantic core, value-named typography, a dark axis; CLI hints for the project's package manager; user-approved): cli measured 31727 B (starter theme ~670 B, package-manager detection and the hints that use it ~338 B; rewriting the typography as compact tuples was tried and grew it by 8 B, so the starter stays a plain object); budget raised 31100 -> 32000 (+273 B over the measurement). No other budget changed.
// 2026-11-25 (`style-gen canvas check`: the design-canvas checker moves from a repository script into the CLI, with its manifest inlined; user-approved 2026-11-24, measured 43873 B): cli budget raised 32000 -> 48270 (measured + ~10 %, rounded up to 10 B). No other budget changed.
// 2026-11-25 (six scale token groups: motionDuration, motionEasing, controlHeight, iconSize, opacity, zIndex; six descriptors, their value grammar and schema shapes; user-approved): vite measured 15525 B (101 %), next 15716 B (98 %); budgets raised to measured + ~10 %, rounded up to 10 B: vite 15430 -> 17080, next 16100 -> 17290. Shortening the easing error message saved 51 B and was not enough. index 11181 (82 %), tokens 1752 (95 %), recipes 1933, ui 2889, cli 45187 stay within their budgets.
// 2026-11-26 (colour alias `$key/<n>`: alias grammar parser, its error messages and the `color-mix` emission land in the CLI through `generate()`; user-approved): cli measured 48392 B (develop 48100 B, +292 B; merging the two grammar messages and replacing a `Set` saved 19 B and was not enough); budget raised to measured + ~10 %, rounded up to 10 B: 48270 -> 53240. index, tokens, cva, vite, next and the other budgets stay within theirs.
// 2026-11-26 (canvas commands load through `import()` from their own entry `dist/cli/canvas.mjs`, so `generate`, `init` and `--version` stop paying for them; user-approved plan): cli measured 36968 B transitive (was 50264 B before the split; the `standardSchema` chunk it shares with `canvas` is counted in both), new `cli-canvas` measured 19872 B transitive. Budgets set to measured + ~10 %, rounded up to 10 B: cli 53240 -> 40670, cli-canvas 21860.
// 2026-11-26 (rules chunk owns its budget under the user-approved plan: the theme rules land in `dist/cli/canvas.mjs`: closed scales, contrast, descriptions, design-system name collisions, rule reports): `cli-canvas` provisional 21860 (measured 19872 B before the rules existed) -> measured 25564 B transitive; budget 28130 (measured + ~10 %, rounded up to 10 B). `cli` stays 40670 (37210 B measured, 91 %).
// Budgets = measured + ~10% headroom; tokens, cva, spacing and types are
// unchanged and must not drift (fix the import or chunk, don't raise them).
const budgets = {
  index: 13_560,
  tokens: 1_850,
  cva: 800,
  spacing: 1_000,
  recipes: 2_284,
  types: 100,
  ui: 3_760,
  "ui-react": 70,
  vite: 17_080,
  next: 17_290,
  cli: 40_670,
  "cli-canvas": 28_130,
};

// Budgeted files that are not `package.json#exports` subpaths.
const extraFiles = {
  cli: "dist/cli/index.mjs",
  "cli-canvas": "dist/cli/canvas.mjs",
};

// Static `import … from "./x.js"`, `export … from "./x.js"` and bare
// `import "./x.js"` of a sibling build chunk (`.js`, `.mjs` or `.cjs`).
// Package imports are externals (see `check:externals`) and not counted.
const RELATIVE_IMPORT_RE =
  // eslint-disable-next-line sonarjs/super-linear-regex -- runs on our own build output, never on untrusted input
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
