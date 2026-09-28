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

const budgets = {
  "dist/index.js": 2_000,
  "dist/tokens.js": 1_000,
  "dist/cva.js": 500,
  "dist/spacing.js": 1_000,
  "dist/types.js": 200,
  "dist/vite.js": 8_000,
};

let ok = true;
for (const [rel, limit] of Object.entries(budgets)) {
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
