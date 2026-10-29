#!/usr/bin/env node
/**
 * Verify the browser-safe subpaths (`./tokens`, `./cva`, `./spacing`,
 * `./recipes`, `./types`) never transitively import Zod, a Node builtin,
 * `@tailwindcss/*` or any other runtime `dependency` of the package (the
 * bundler leaves those as bare imports: `chokidar`, `@clack/prompts`, ...) —
 * even through a shared chunk (`helpers-*`,
 * `defaultOption-*`, `safelistProperties-*`, ...).
 *
 * Unlike `check-externals.mjs` (which only logs external refs in the root
 * `.`/`./vite` bundles and never inspects shared chunks), this script walks
 * every relative `import`/`require`/`export … from` reachable from each
 * browser-safe entry and fails the moment a forbidden specifier appears
 * anywhere in that graph.
 *
 * Run: node scripts/check-browser-safe.mjs (after `yarn build`)
 * Exits 1 with the full import chain if a forbidden specifier is found.
 */
import { readFileSync, existsSync } from "node:fs";
import { builtinModules } from "node:module";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const BROWSER_SAFE_SUBPATHS = ["tokens", "cva", "spacing", "recipes", "types"];

const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));

/**
 * Every runtime `dependency` except Zod (own rule in `isForbidden`) is
 * Node-only here; no browser-safe subpath imports any of them. A future
 * dependency a browser subpath legitimately needs must be filtered out here.
 */
const nodeOnlyDependencies = new Set(
  Object.keys(pkg.dependencies ?? {}).filter((name) => name !== "zod"),
);

const builtinNames = new Set(builtinModules);

/**
 * Whether a (non-relative) import specifier is forbidden in a browser-safe
 * bundle: Zod, any Node builtin (bare or `node:`-prefixed), a
 * `@tailwindcss/*` package, or a Node-only runtime dependency.
 * @param {string} specifier - Raw import/require specifier
 * @returns {boolean} `true` when the specifier must not appear
 */
const isForbidden = (specifier) => {
  if (specifier === "zod" || specifier.startsWith("zod/")) return true;
  if (specifier.startsWith("node:")) return true;
  if (specifier.startsWith("@tailwindcss/")) return true;
  const parts = specifier.split("/");
  const packageName = specifier.startsWith("@")
    ? parts.slice(0, 2).join("/")
    : parts[0];
  if (nodeOnlyDependencies.has(packageName)) return true;
  return builtinNames.has(specifier) || builtinNames.has(parts[0]);
};

/**
 * Extract every import/require/export-from specifier referenced by a bundle
 * file, covering ESM `import`/`export … from`, bare side-effect `import`,
 * dynamic `import()`, and CJS `require()`.
 * @param {string} src - File source text
 * @returns {string[]} Every specifier found (not deduped)
 */
const extractSpecifiers = (src) => {
  const patterns = [
    /\bfrom\s+["'`]([^"'`]+)["'`]/g,
    /\bimport\s*["'`]([^"'`]+)["'`]/g,
    /\bimport\s*\(\s*["'`]([^"'`]+)["'`]/g,
    /\brequire\(\s*["'`]([^"'`]+)["'`]\s*\)/g,
  ];
  const specifiers = [];
  for (const pattern of patterns) {
    for (const match of src.matchAll(pattern)) {
      specifiers.push(match[1]);
    }
  }
  return specifiers;
};

/**
 * DFS through relative imports starting at `filePath`, collecting the full
 * import chain to every forbidden specifier reached.
 * @param {string} filePath - Absolute path of the file to inspect
 * @param {string[]} chain - Import chain (repo-relative paths / specifiers) leading here
 * @param {Set<string>} visited - Absolute paths already walked in this traversal
 * @param {{chain: string[]}[]} findings - Accumulator for forbidden hits
 * @returns {void}
 */
const walk = (filePath, chain, visited, findings) => {
  if (visited.has(filePath)) return;
  visited.add(filePath);
  if (!existsSync(filePath)) return;

  const src = readFileSync(filePath, "utf8");
  for (const specifier of extractSpecifiers(src)) {
    if (specifier.startsWith(".")) {
      const resolved = resolve(dirname(filePath), specifier);
      walk(resolved, [...chain, relative(root, resolved)], visited, findings);
    } else if (isForbidden(specifier)) {
      findings.push({ chain: [...chain, specifier] });
    }
  }
};

let ok = true;
for (const name of BROWSER_SAFE_SUBPATHS) {
  for (const ext of ["js", "cjs"]) {
    const entryRel = `dist/${name}.${ext}`;
    const entryPath = resolve(root, entryRel);
    if (!existsSync(entryPath)) {
      console.error(`✗ missing build artifact: ${entryRel}`);
      ok = false;
      continue;
    }

    const findings = [];
    walk(entryPath, [entryRel], new Set(), findings);

    if (findings.length > 0) {
      ok = false;
      for (const finding of findings) {
        console.error(
          `✗ forbidden import chain: ${finding.chain.join(" -> ")}`,
        );
      }
    } else {
      console.log(`✓ ${entryRel} — browser-safe`);
    }
  }
}

if (!ok) process.exit(1);
console.log("✓ check-browser-safe passed");
