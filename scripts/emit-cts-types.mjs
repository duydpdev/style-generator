#!/usr/bin/env node
/**
 * Emit a `.d.cts` next to every top-level `dist/<name>.d.ts` so CommonJS
 * consumers (`require` condition, `moduleResolution: node16`/`nodenext`)
 * resolve declarations typed as CJS instead of being treated as ESM
 * ("Masquerading as ESM" in `@arethetypeswrong/cli`).
 *
 * `vite-plugin-dts` runs with `rollupTypes: true`, so every
 * `dist/<name>.d.ts` is self-contained (its only external specifiers are
 * `zod` and `vite`) and no relative `.js` specifier needs rewriting to
 * `.cjs`. The script fails if one appears, which means the declaration
 * bundling changed. The copy is byte-identical except for the rules in
 * `cjs-declaration.mjs` (the `vite` import resolves as ESM: Vite has no
 * usable CommonJS types).
 *
 * Runs as the last step of `yarn build`. Declarations under `dist/cli` do
 * not exist (the CLI has no import API) and are not copied.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { toCjsDeclaration } from "./cjs-declaration.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

/**
 * Print an error and exit non-zero.
 * @param {string} message - What went wrong
 * @returns {never} Never returns
 */
const fail = (message) => {
  console.error(`emit-cts-types: ${message}`);
  process.exit(1);
};

if (!existsSync(dist)) fail("dist/ does not exist; run `yarn build` first");

// A relative specifier in a declaration would resolve as ESM from the copy.
const RELATIVE_SPECIFIER_RE =
  // eslint-disable-next-line sonarjs/slow-regex -- runs on our own build output, never on untrusted input
  /(?:from|import)\s*\(?\s*["']\.{1,2}\//;

const declarations = readdirSync(dist).filter(
  (name) => name.endsWith(".d.ts") && !name.endsWith(".d.cts"),
);
if (declarations.length === 0) fail("no dist/*.d.ts found");

for (const name of declarations) {
  const source = readFileSync(join(dist, name), "utf8");
  if (RELATIVE_SPECIFIER_RE.test(source)) {
    fail(`${name} has a relative import; it is no longer self-contained`);
  }
  let converted;
  try {
    converted = toCjsDeclaration(source, name);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
  if (name === "vite.d.ts" && converted === source) {
    fail("vite.d.ts no longer imports `vite`; the CommonJS rule did not apply");
  }
  writeFileSync(join(dist, name.replace(/\.d\.ts$/, ".d.cts")), converted);
}

console.log(`✓ emitted ${declarations.length} .d.cts files`);
