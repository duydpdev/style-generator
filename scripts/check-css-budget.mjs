#!/usr/bin/env node
/**
 * CSS size budget gate. Sums the gzip size of every `.css` file under the
 * given path and exits 1 when the total exceeds `--max-gzip`.
 *
 * Plain Node, no dependency on the library, so the file can be copied as-is
 * into a consumer repo (stable Task 7 wires it into the consumer app CI).
 *
 * Usage:
 *   node scripts/check-css-budget.mjs <file.css|dir> --max-gzip <bytes>
 *
 * The directory is walked recursively (Next emits `.next/static/css/*.css`).
 * Gzip uses `node:zlib` defaults, the same level the DEV.1 baseline used.
 *
 * Exit codes: 0 = within budget, 1 = over budget, 2 = usage error / no CSS.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";

const args = process.argv.slice(2);
const maxIdx = args.indexOf("--max-gzip");
const rawMax = maxIdx >= 0 ? args[maxIdx + 1] : undefined;
const target = args.find((a, i) => !a.startsWith("--") && i !== maxIdx + 1);

const fail = (message) => {
  console.error(message);
  process.exit(2);
};

if (!target || rawMax === undefined) {
  fail("Usage: check-css-budget.mjs <file.css|dir> --max-gzip <bytes>");
}
if (!/^\d+$/.test(rawMax)) {
  fail(`--max-gzip must be a non-negative integer of bytes, got "${rawMax}"`);
}
const maxGzip = Number(rawMax);

function collectCss(path) {
  const abs = resolve(path);
  let stat;
  try {
    stat = statSync(abs);
  } catch (error) {
    fail(
      `Cannot read ${path}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (!stat.isDirectory()) return [abs];
  return readdirSync(abs, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const full = join(abs, entry.name);
      if (entry.isDirectory()) return collectCss(full);
      return entry.name.endsWith(".css") ? [full] : [];
    });
}

const files = collectCss(target);
if (files.length === 0) fail(`No .css files found under ${target}`);

let total = 0;
for (const file of files) {
  const gzip = gzipSync(readFileSync(file)).length;
  total += gzip;
  console.log(`  ${String(gzip).padStart(8)} B gzip  ${file}`);
}

const verdict = total <= maxGzip ? "OK" : "OVER BUDGET";
const delta =
  total <= maxGzip
    ? `${maxGzip - total} B headroom`
    : `${total - maxGzip} B over`;
console.log(
  `${verdict}: ${total} B gzip across ${files.length} file(s), budget ${maxGzip} B (${delta})`,
);
process.exit(total <= maxGzip ? 0 : 1);
