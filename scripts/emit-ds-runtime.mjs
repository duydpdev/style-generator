#!/usr/bin/env node
/**
 * Precompile the design-system components for `style-gen ds build`.
 *
 * Bundles the six `create*` factories of `examples/harness/src/ui` with their
 * recipes, `@duydpdev/style-generator/ui`, class-variance-authority, clsx and
 * tailwind-merge into `dist/ds/runtime.js` (an IIFE that reads `React` as a
 * global and defines `__DsRuntime`), and writes `dist/ds/candidates.json`:
 * the class candidates Tailwind's scanner finds in our own sources. At run
 * time the CLI only assembles strings and compiles CSS with `tailwindcss`;
 * no bundler or scanner runs on the product's machine.
 *
 * Runs as the last step of `yarn build:cli`, after `yarn build` (the harness
 * imports the built `dist/ui.js`).
 */
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { Scanner } from "@tailwindcss/oxide";
import { build } from "vite";

import { COMPONENTS } from "./ds-docs.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const uiDir = join(root, "examples/harness/src/ui");
const outDir = join(root, "dist/ds");

/**
 * Classes the library's own components name; a scan without them would build an unstyled runtime.
 * Classes a product preset names (its focus ring, hover tints) are added at run time from the preset.
 */
const SENTINELS = ["inline-flex", "focus-visible:outline-2"];
/** Packages inlined into the runtime, whose licence text ships beside it. */
const NOTICE_PACKAGES = ["class-variance-authority", "clsx", "tailwind-merge"];
/** The global the runtime defines. */
const GLOBAL_NAME = "__DsRuntime";

if (!existsSync(join(root, "dist/ui.js"))) {
  console.error(
    "emit-ds-runtime: dist/ui.js does not exist; run `yarn build` first",
  );
  process.exit(1);
}

/**
 * @param {unknown} result - Vite's `build()` result with `write: false`
 * @returns {{ code: string, moduleIds: string[] }} The first chunk of the output
 */
function firstChunk(result) {
  const outputs = (Array.isArray(result) ? result : [result]).flatMap(
    (r) =>
      /** @type {{ output?: { type: string, code: string, moduleIds: string[] }[] }} */ (
        r
      ).output ?? [],
  );
  const chunk = outputs.find((o) => o.type === "chunk");
  if (!chunk) throw new Error("vite produced no chunk");
  return chunk;
}

/**
 * @param {string} tmp - A scratch directory
 * @returns {Promise<{ code: string, sources: string[] }>} The runtime and the own source files it contains
 */
async function bundleRuntime(tmp) {
  // The canvas page has a global React without `jsx`/`jsxs`: route the automatic JSX runtime to createElement.
  const shim = join(tmp, "jsx-runtime.js");
  writeFileSync(
    shim,
    `import { createElement, Fragment } from "react";
export const jsx = (type, props, key) => createElement(type, key === undefined ? props : { ...props, key });
export { jsx as jsxs, Fragment };
`,
  );
  const entry = join(tmp, "entry.js");
  writeFileSync(
    entry,
    COMPONENTS.map(({ name }) => {
      const file = JSON.stringify(join(uiDir, `${name}.tsx`));
      return `export { create${name} } from ${file};`;
    }).join("\n"),
  );
  const chunk = firstChunk(
    await build({
      configFile: false,
      logLevel: "silent",
      publicDir: false,
      resolve: {
        alias: [{ find: /^react\/jsx-runtime$/, replacement: shim }],
      },
      // The runtime must not depend on NODE_ENV: development JSX imports react/jsx-dev-runtime, which bypasses the shim.
      oxc: { jsx: { development: false } },
      build: {
        write: false,
        minify: false,
        lib: {
          entry,
          formats: ["iife"],
          name: GLOBAL_NAME,
          fileName: () => "runtime.js",
        },
        rollupOptions: {
          external: ["react", "react-dom"],
          // No per-module path comments: they would carry the scratch path and differ on every run.
          experimental: { attachDebugInfo: "none" },
          output: { globals: { react: "React", "react-dom": "ReactDOM" } },
        },
      },
    }),
  );
  const dependencyDir = `${sep}${"node_modules"}${sep}`;
  const sources = chunk.moduleIds.filter(
    (id) =>
      !id.startsWith("\0") &&
      !id.includes("?") &&
      !id.includes(dependencyDir) &&
      !id.startsWith(tmp),
  );
  return { code: `${chunk.code.trimEnd()}\n`, sources };
}

/**
 * @param {string[]} sources - Files whose class candidates Tailwind's scanner reads
 * @returns {string[]} Sorted, distinct candidates, without the modules the sources import
 */
function scanCandidates(sources) {
  const scanner = new Scanner({
    sources: sources.map((file) => ({
      base: dirname(file),
      pattern: basename(file),
      negated: false,
    })),
  });
  // The scanner also reads `from "design-system-example/recipes"`: an import specifier is no class.
  const specifiers = new Set(
    sources.flatMap((file) =>
      [
        ...readFileSync(file, "utf8").matchAll(
          /\bfrom\s+["']([^"']+)["']|\bimport\(\s*["']([^"']+)["']/g,
        ),
      ].map((m) => m[1] ?? m[2] ?? ""),
    ),
  );
  return [...new Set(scanner.scan())]
    .filter((candidate) => !specifiers.has(candidate))
    .sort((a, b) => a.localeCompare(b));
}

const tmp = mkdtempSync(join(tmpdir(), "emit-ds-runtime-"));
try {
  const { code, sources } = await bundleRuntime(tmp);
  const candidates = scanCandidates(sources);
  const missing = SENTINELS.filter((c) => !candidates.includes(c));
  if (missing.length > 0) {
    console.error(
      `emit-ds-runtime: the scan of ${String(sources.length)} sources found no ${missing.join(", ")}`,
    );
    process.exit(1);
  }
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "runtime.js"), code);
  writeFileSync(
    join(outDir, "candidates.json"),
    `${JSON.stringify(candidates)}\n`,
  );
  const notices = NOTICE_PACKAGES.map((name) => {
    const licence = ["LICENSE", "LICENSE.md", "license"]
      .map((file) => join(root, "node_modules", name, file))
      .find((file) => existsSync(file));
    if (!licence) throw new Error(`${name} ships no licence file`);
    const text = readFileSync(licence, "utf8").trim();
    return `${name}\n${"=".repeat(name.length)}\n\n${text}\n`;
  }).join("\n");
  writeFileSync(join(outDir, "NOTICES.txt"), notices);
  console.log(
    `✓ emitted dist/ds/runtime.js (${String(code.length)} B), candidates.json (${String(candidates.length)} classes from ${String(sources.length)} sources), NOTICES.txt`,
  );
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
