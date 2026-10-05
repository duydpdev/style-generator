#!/usr/bin/env node
/**
 * Per-subpath gzip size budget, measured as consumers load it: the entry
 * file plus every relative chunk it imports, transitively (each chunk counted
 * once per entry). Fails if an export exceeds its budget. Run after `yarn build`.
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
// cva 713, spacing 894, types 55, vite 8443, next 8243. Budgets = measured
// + ~10% headroom.
const budgets = {
  index: 9_300,
  tokens: 1_700,
  cva: 800,
  spacing: 1_000,
  types: 100,
  vite: 9_400,
  next: 9_200,
};

// Static `import … from "./x.js"`, `export … from "./x.js"` and bare
// `import "./x.js"` of a sibling build chunk. Package imports are externals
// (see `check:externals`) and not counted.
const RELATIVE_IMPORT_RE =
  /(?:^|[\s;])(?:import|export)\s*(?:[^'"`;]*?\s*from\s*)?["'](\.{1,2}\/[^"']+\.js)["']/g;

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

let ok = true;
for (const name of exportNames) {
  const limit = budgets[name];
  if (limit === undefined) {
    console.error(`\u2717 no size budget configured for export: ${name}`);
    ok = false;
    continue;
  }

  const rel = `dist/${name}.js`;
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
