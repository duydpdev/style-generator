#!/usr/bin/env node
/**
 * Verify dist bundles do NOT inline any third-party module.
 *
 * Peers and dependencies are externalised by the bundler, so the only thing
 * that can end up inlined is a devDependency imported by mistake from a
 * shipped source. A duplicate of a user-installed package is bad for
 * tree-shaking and for the peer-dep contracts. The UI kit's optional peers
 * (`class-variance-authority`, `clsx`, `tailwind-merge`, `react`) are
 * externalised too, so a second pass walks every entry's relative import
 * closure: only `./ui` may import the first three, and no entry imports
 * `react` at runtime (`./ui-react` is type-only).
 *
 * Detection reads every `dist/**\/*.map` (library entries, shared chunks and
 * the CLI bundle): an inlined module shows up in `sources` as
 * `…/node_modules/<name>/…`. ANY such source fails. Every emitted
 * `.js`/`.cjs`/`.mjs` must ship a
 * map, otherwise the check could not see it.
 *
 * Run: node scripts/check-externals.mjs
 * Exits 1 with details on a missing artifact, a missing map or an inlined module.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const dist = resolve(root, "dist");

// Used only for the informational external-ref log below.
const externalNames = [
  ...Object.keys(pkg.peerDependencies ?? {}),
  ...Object.keys(pkg.dependencies ?? {}),
];

const escape = (name) => name.replace(/[/\-\\^$*+?.()|[\]{}]/g, "\\$&");

// Counts the external import sites per entry for the log: `require("name")`,
// `require("name/…")`, `from "name"`, `from "name/…"`. Informational only;
// inlining is detected from the sourcemaps below.
const buildMatcher = (name) => {
  const escaped = escape(name);
  // require("name") | require("name/...") | from "name" | from "name/..."
  return new RegExp(
    `(require\\((['"\`])${escaped}(/[^'"\`]*)?\\2\\))|(from\\s+(['"\`])${escaped}(/[^'"\`]*)?\\5)`,
    "g",
  );
};

// A `node_modules/<package>/` segment in a sourcemap source path (any linker:
// `node_modules/zod/…`, `.yarn/cache/zod-npm-….zip/node_modules/zod/…`).
const nodeModulesSegment = /(?:^|\/)node_modules\/[^/]+\//;

/**
 * @param {string} source - Sourcemap `sources` entry
 * @returns {boolean} `true` when it lies inside a `node_modules/` package
 */
const isInlinedSource = (source) => nodeModulesSegment.test(source);

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
  );

const entries = Object.keys(pkg.exports)
  .filter((key) => key !== "./package.json")
  .map((key) => (key === "." ? "index" : key.replace(/^\.\//, "")));
const targets = [
  ...entries.flatMap((e) => [
    resolve(dist, `${e}.js`),
    resolve(dist, `${e}.cjs`),
  ]),
  resolve(dist, "cli/index.mjs"),
];

let ok = true;
for (const file of targets) {
  if (!existsSync(file)) {
    console.error(`✗ Missing build artifact: ${relative(root, file)}`);
    ok = false;
    continue;
  }
  const src = readFileSync(file, "utf8");
  const externalRefs = externalNames.flatMap((name) => {
    const count = (src.match(buildMatcher(name)) ?? []).length;
    return count > 0 ? [`${name}×${count}`] : [];
  });

  console.log(
    `✓ ${relative(root, file)} — external refs: ${
      externalRefs.length === 0 ? "(none)" : externalRefs.join(", ")
    }`,
  );
}

const files = existsSync(dist) ? walk(dist) : [];
for (const file of files.filter((f) => /\.[cm]?js$/.test(f))) {
  if (!existsSync(`${file}.map`)) {
    console.error(
      `✗ ${relative(root, file)} has no sourcemap — inlining cannot be checked`,
    );
    ok = false;
  }
}

const maps = files.filter((f) => f.endsWith(".map"));
for (const map of maps) {
  const { sources = [] } = JSON.parse(readFileSync(map, "utf8"));
  const inlined = sources.filter(isInlinedSource);
  if (inlined.length > 0) {
    console.error(
      `✗ ${relative(root, map)} inlines third-party module source:\n    ${inlined.join("\n    ")}`,
    );
    ok = false;
  }
}

// UI kit peers: externalised like every peer, so the sourcemap pass above
// cannot see an accidental import. Only `./ui` may reach the three runtime
// peers; no entry may reach `react` (`./ui-react` is type-only). Shared
// chunks count for every entry that imports them.
const UI_RUNTIME_PEERS = ["class-variance-authority", "clsx", "tailwind-merge"];
const UI_PEERS = new Set([...UI_RUNTIME_PEERS, "react"]);

/**
 * Every import/require/export-from specifier of a bundle file (same
 * patterns as `scripts/check-browser-safe.mjs`).
 * @param {string} src - File source text
 * @returns {string[]} Every specifier found (not deduped)
 */
const extractSpecifiers = (src) => {
  const patterns = [
    /\bfrom\s*["'`]([^"'`]+)["'`]/g,
    /\bimport\s*["'`]([^"'`]+)["'`]/g,
    /\bimport\s*\(\s*["'`]([^"'`]+)["'`]/g,
    /\brequire\(\s*["'`]([^"'`]+)["'`]\s*\)/g,
  ];
  const specifiers = [];
  for (const pattern of patterns) {
    for (const match of src.matchAll(pattern)) specifiers.push(match[1]);
  }
  return specifiers;
};

/**
 * @param {string} specifier - A bare import specifier
 * @returns {string} Its package name (`@scope/name` or `name`)
 */
const packageNameOf = (specifier) => {
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
};

/**
 * Every UI-peer import reachable from `entryPath` through relative imports.
 * @param {string} entryPath - Absolute path of an entry file
 * @returns {string[][]} One import chain per hit (last item = the specifier)
 */
const uiPeerChains = (entryPath) => {
  /** @type {string[][]} */
  const hits = [];
  const visited = new Set();
  /**
   * @param {string} filePath - Absolute path of the file to inspect
   * @param {string[]} chain - Repo-relative paths leading here
   * @returns {void}
   */
  const walkFrom = (filePath, chain) => {
    if (visited.has(filePath) || !existsSync(filePath)) return;
    visited.add(filePath);
    for (const specifier of extractSpecifiers(readFileSync(filePath, "utf8"))) {
      if (specifier.startsWith(".")) {
        const next = resolve(dirname(filePath), specifier);
        walkFrom(next, [...chain, relative(root, next)]);
      } else if (UI_PEERS.has(packageNameOf(specifier))) {
        hits.push([...chain, specifier]);
      }
    }
  };
  walkFrom(entryPath, [relative(root, entryPath)]);
  return hits;
};

for (const entry of entries) {
  const allowed = new Set(entry === "ui" ? UI_RUNTIME_PEERS : []);
  for (const ext of ["js", "cjs"]) {
    const file = resolve(dist, `${entry}.${ext}`);
    if (!existsSync(file)) continue; // reported above as a missing artifact
    for (const chain of uiPeerChains(file)) {
      const specifier = chain[chain.length - 1];
      if (allowed.has(packageNameOf(specifier))) continue;
      console.error(
        `✗ ${relative(root, file)} imports the UI peer "${specifier}": ${chain.join(" -> ")}`,
      );
      ok = false;
    }
  }
}

if (!ok) process.exit(1);
console.log(
  `✓ check-externals passed (${maps.length} sourcemaps, no inlined node_modules source)`,
);
