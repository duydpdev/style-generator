#!/usr/bin/env node
/**
 * Verify dist bundles do NOT inline any third-party module.
 *
 * Peers and dependencies are externalised by the bundler, so the only thing
 * that can end up inlined is a devDependency (e.g. `tailwind-merge`,
 * `class-variance-authority`) imported by mistake from a shipped source. A
 * duplicate of a user-installed package is bad for tree-shaking and for the
 * peer-dep contracts.
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

if (!ok) process.exit(1);
console.log(
  `✓ check-externals passed (${maps.length} sourcemaps, no inlined node_modules source)`,
);
