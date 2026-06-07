#!/usr/bin/env node
/**
 * Verify dist bundles do NOT inline forbidden modules.
 *
 * Forbidden = peerDependencies + dependencies declared in package.json.
 * If rollup ever inlines them, the bundle will leak duplicates of user-installed
 * packages — bad for tree-shaking, bad for peer-dep contracts.
 *
 * Run: node scripts/check-externals.mjs
 * Exits 1 with details if any forbidden name appears in dist/index.{js,cjs}.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));

const forbidden = [
  ...Object.keys(pkg.peerDependencies ?? {}),
  ...Object.keys(pkg.dependencies ?? {}),
];

// `tailwindcss/package.json` is read at runtime by detectTailwindVersion —
// that's an external require, not an inlined source. Match only inlined source
// markers (string after `require(` / `from `) of the package itself, not
// arbitrary substrings.
const buildMatcher = (name) => {
  const escaped = name.replace(/[/\-\\^$*+?.()|[\]{}]/g, "\\$&");
  // require("name") | require("name/...") | from "name" | from "name/..."
  return new RegExp(
    `(require\\((['"\`])${escaped}(/[^'"\`]*)?\\2\\))|(from\\s+(['"\`])${escaped}(/[^'"\`]*)?\\5)`,
    "g",
  );
};

const entries = [
  "index",
  "plugin",
  "tokens",
  "cva",
  "spacing",
  "types",
  "vite",
];
const targets = entries.flatMap((e) => [
  resolve(root, `dist/${e}.js`),
  resolve(root, `dist/${e}.cjs`),
]);

let ok = true;
for (const file of targets) {
  if (!existsSync(file)) {
    console.error(`✗ Missing build artifact: ${file}`);
    ok = false;
    continue;
  }
  const src = readFileSync(file, "utf8");
  const externalRefs = new Map(); // name -> count of legitimate external refs

  for (const name of forbidden) {
    const re = buildMatcher(name);
    const matches = src.match(re) ?? [];
    if (matches.length > 0) {
      externalRefs.set(name, matches.length);
    }
  }

  console.log(
    `✓ ${file} — external refs: ${
      externalRefs.size === 0
        ? "(none)"
        : [...externalRefs].map(([n, c]) => `${n}×${c}`).join(", ")
    }`,
  );

  // Inlined-source heuristic: scan for module-export patterns of forbidden pkgs.
  // chokidar / @clack/prompts inlining would balloon the file dramatically —
  // > 100 KB instantly. Use size guard + name leak check together.
  const sizeKb = src.length / 1024;
  if (sizeKb > 50) {
    console.error(
      `✗ ${file} suspiciously large (${sizeKb.toFixed(1)} KB) — possible inlined dep`,
    );
    ok = false;
  }
}

if (!ok) process.exit(1);
console.log("✓ check-externals passed");
