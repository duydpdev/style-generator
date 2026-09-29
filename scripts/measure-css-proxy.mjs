#!/usr/bin/env node
/**
 * DEV.7 proxy: compile the CSS the v4 library emits for a real consumer theme,
 * without needing the consumer repo to build on the v4 API.
 *
 * Pipeline (all in memory, the theme file is never modified):
 *   1. read theme.json; move the legacy `themes.<variant>` map to
 *      `themeAxes.theme.<variant>` (the consumer theme still uses `themes`);
 *   2. `generate(theme)` from `dist/` — it parses through `ThemeSchema`, so the
 *      rename guard and the integer-key guard run on the real theme;
 *   3. compile `@import "tailwindcss"` + `generate().css` with the real
 *      Tailwind v4 engine (`@tailwindcss/node`) for the candidate class list,
 *      then minify with lightningcss via `optimize()` (as a production
 *      `@tailwindcss/postcss` build does).
 *
 * Usage (run `yarn build` first — the script imports `dist/index.js`):
 *   node scripts/measure-css-proxy.mjs --theme <theme.json> --classes <classes.txt> --out <file.css>
 *
 * Prints the engine version and the compiled size; pair it with
 * `scripts/measure-css-output.mjs <out.css>` for the per-group breakdown.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readFlag(name) {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

const themePath = readFlag("--theme");
const classesPath = readFlag("--classes");
const outPath = readFlag("--out");

if (!themePath || !classesPath || !outPath) {
  console.error(
    "Usage: measure-css-proxy.mjs --theme <theme.json> --classes <classes.txt> --out <file.css>",
  );
  process.exit(2);
}

const distEntry = resolve(repoRoot, "dist/index.js");
let generate;
try {
  ({ generate } = await import(pathToFileURL(distEntry).href));
} catch (error) {
  console.error(
    `Cannot load ${distEntry} — run \`yarn build\` first.\n${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(2);
}
const { compile, optimize } = await import("@tailwindcss/node");

const theme = JSON.parse(readFileSync(resolve(themePath), "utf8"));

const legacyThemes = theme.themes;
if (legacyThemes !== undefined) {
  if (theme.themeAxes?.theme !== undefined) {
    console.error(
      "Theme declares both `themes` and `themeAxes.theme`; refusing to guess a merge.",
    );
    process.exit(2);
  }
  delete theme.themes;
  theme.themeAxes = { ...(theme.themeAxes ?? {}), theme: legacyThemes };
}

const candidates = readFileSync(resolve(classesPath), "utf8")
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

const { css: generated } = generate(theme);
const compiler = await compile(`@import "tailwindcss";\n${generated}`, {
  base: repoRoot,
  onDependency: () => undefined,
});
// `@tailwindcss/postcss` minifies through lightningcss in a production
// build, which is what produced the baseline artifact; the raw `build()`
// output is unminified and would not be comparable byte-for-byte.
const output = optimize(compiler.build(candidates), {
  file: "proxy.css",
  minify: true,
}).code;

writeFileSync(resolve(outPath), output);

const require = createRequire(import.meta.url);
const engine = require("tailwindcss/package.json").version;
console.log(`engine: tailwindcss ${engine}`);
console.log(`candidates: ${candidates.length}`);
console.log(
  `proxy css: ${Buffer.byteLength(output)} B raw, ${gzipSync(output).length} B gzip -> ${outPath}`,
);
