#!/usr/bin/env node
/**
 * Per-subpath gzip size budget. Fails build if any chunk exceeds limit.
 * Run after `yarn build`.
 */
import { readFileSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));

// Budget per subpath (export key name, not file path) — kept in lockstep
// with the current published entries. `check:sizes` fails if an export in
// `package.json#exports` has no budget entry here.
const budgets = {
  index: 2_000,
  tokens: 1_000,
  cva: 500,
  spacing: 1_000,
  types: 200,
  vite: 8_000,
  // Same shape as `vite` (generate() + ThemeSchema.parse + a chokidar dev
  // watcher, no `next` types imported) — same budget.
  next: 8_000,
};

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
  const gzip = gzipSync(readFileSync(file)).length;
  const ratio = ((gzip / limit) * 100).toFixed(0);
  if (gzip > limit) {
    console.error(`\u2717 ${rel}: ${gzip}B gzip > ${limit}B (${ratio}%)`);
    ok = false;
  } else {
    console.log(`\u2713 ${rel}: ${gzip}B gzip / ${limit}B (${ratio}%)`);
  }
}

if (!ok) process.exit(1);
console.log("\u2713 size budget passed");
