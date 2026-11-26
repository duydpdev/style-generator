#!/usr/bin/env node
/**
 * Every JavaScript file in `dist/` must be reachable from a published entry:
 * a file named by `package.json#exports` (every condition) or `bin`, or a
 * relative `import … from "./x"`, `export … from "./x"`, bare `import "./x"`,
 * `import("./x")` or `require("./x")` of a file that is. `check-sizes.mjs`
 * walks only the import forms of its own regex, so a form a bundler emits
 * that the regex misses would leave a chunk uncounted and the size budgets
 * green for the wrong reason. Run after `yarn build:all`.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

/** A relative specifier in any import form a bundler emits. */
const RELATIVE_REFERENCE_RE =
  // eslint-disable-next-line sonarjs/super-linear-regex -- runs on our own build output, never on untrusted input
  /(?:from|import|require)\s*\(?\s*["'](\.{1,2}\/[^"']+\.[cm]?js)["']/g;

/**
 * Every file path an `exports` target names, however deeply the conditions nest.
 * @param {unknown} target - An `exports` value
 * @returns {string[]} File paths
 */
const targetFiles = (target) =>
  typeof target === "string"
    ? [target]
    : Object.values(/** @type {Record<string, unknown>} */ (target)).flatMap(
        targetFiles,
      );

/**
 * Every JavaScript file below `dir` (source maps and declarations excluded).
 * @param {string} dir - Absolute directory
 * @returns {string[]} Absolute paths
 */
const scriptsBelow = (dir) =>
  readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.[cm]?js$/.test(entry.name))
    .map((entry) => join(entry.parentPath, entry.name));

// `style-gen ds build` reads `dist/ds/runtime.js` as text and embeds it in the
// bundle it writes, so no published entry imports it.
const READ_AS_TEXT = ["dist/ds/runtime.js"];

const entries = [
  ...targetFiles(pkg.exports),
  ...targetFiles(pkg.bin),
  ...READ_AS_TEXT,
]
  .filter((file) => /\.[cm]?js$/.test(file))
  .map((file) => resolve(root, file));

const reached = new Set();
const stack = [...entries];
while (stack.length > 0) {
  const file = stack.pop();
  if (reached.has(file)) continue;
  if (!existsSync(file)) {
    console.error(
      `✗ dist reachability: ${relative(root, file)} does not exist`,
    );
    process.exit(1);
  }
  reached.add(file);
  for (const match of readFileSync(file, "utf8").matchAll(
    RELATIVE_REFERENCE_RE,
  )) {
    stack.push(resolve(dirname(file), match[1]));
  }
}

const orphans = scriptsBelow(dist)
  .filter((file) => !reached.has(file))
  .map((file) => relative(root, file))
  .sort();
if (orphans.length > 0) {
  console.error(
    `✗ dist reachability: not reachable from any published entry:\n  ${orphans.join("\n  ")}`,
  );
  process.exit(1);
}
console.log(
  `✓ dist reachability: all ${reached.size} JavaScript files are reachable from a published entry`,
);
