#!/usr/bin/env node
/**
 * Verify dist bundles do NOT inline forbidden modules.
 *
 * Forbidden = peerDependencies + dependencies declared in package.json.
 * If rollup ever inlines them, the bundle will leak duplicates of user-installed
 * packages — bad for tree-shaking, bad for peer-dep contracts.
 *
 * Detection reads every `dist/**\/*.map` (library entries, shared chunks and
 * the CLI bundle): an inlined module shows up in `sources` as
 * `…/node_modules/<name>/…`. Every emitted `.js`/`.cjs`/`.mjs` must ship a
 * map, otherwise the check could not see it.
 *
 * Run: node scripts/check-externals.mjs
 * Exits 1 with details on a missing artifact, a missing map or an inlined dep.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const dist = resolve(root, "dist");

// `tailwind-merge` is the app's own dependency (only a devDependency here,
// so Rollup does not externalise it): a stray runtime import in the
// `./recipes` sources would be inlined silently, and this is the tripwire.
const forbidden = [
  ...Object.keys(pkg.peerDependencies ?? {}),
  ...Object.keys(pkg.dependencies ?? {}),
  "tailwind-merge",
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

// A sourcemap source path inside a forbidden package (any linker:
// `node_modules/zod/…`, `.yarn/cache/zod-npm-….zip/node_modules/zod/…`).
const inlinedSource = new RegExp(
  `(?:^|/)node_modules/(${forbidden.map(escape).join("|")})/`,
);

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
  const externalRefs = forbidden.flatMap((name) => {
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
  const inlined = sources.filter((s) => inlinedSource.test(s));
  if (inlined.length > 0) {
    console.error(
      `✗ ${relative(root, map)} inlines forbidden module source:\n    ${inlined.join("\n    ")}`,
    );
    ok = false;
  }
}

if (!ok) process.exit(1);
console.log(
  `✓ check-externals passed (${maps.length} sourcemaps, no inlined ${forbidden.join(", ")})`,
);
