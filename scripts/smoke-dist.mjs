#!/usr/bin/env node
/**
 * Smoke-run the built package the way consumers load it (CI-04). Run after
 * `yarn build:all`:
 *
 * 1. every file named in `package.json#exports` and `bin` exists;
 * 2. every subpath loads through the package name with both `import` and
 *    `require`, exposes the same export names, and those names match the
 *    value exports its `.d.ts` declares (`./tokens` may add one-letter
 *    internal aliases);
 * 3. `generate()` from the ESM and CJS builds returns identical CSS;
 * 4. the CLI bundle runs: `--version`, `schema`, `generate` (same CSS as the
 *    library) and `init` in an empty project, whose scaffolded TypeScript
 *    generator script then runs under Node's type stripping.
 *
 * Run: node scripts/smoke-dist.mjs
 * Exits 1 on the first failed step.
 */
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const cli = join(root, pkg.bin["style-gen"]);
const exampleTheme = join(root, "examples/theme.json");
const require = createRequire(import.meta.url);
// `typescript` is CommonJS without a default export; `require` keeps the
// namespace intact (named ESM imports of it are not statically analysable).
/** @type {typeof import("typescript")} */
const ts = require("typescript");

/**
 * Stop the smoke run with a message.
 * @param {string} message - What failed
 * @returns {never} Never returns; exits the process with code 1
 */
const fail = (message) => {
  console.error(`✗ ${message}`);
  process.exit(1);
};

/**
 * Run a command and fail unless it exits 0.
 * @param {string} label - Step name for the log
 * @param {string[]} argv - Arguments passed to `node`
 * @param {string} cwd - Working directory
 * @returns {string} Combined stdout and stderr
 */
const runNode = (label, argv, cwd) => {
  const result = spawnSync(process.execPath, argv, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output = `${result.stdout}${result.stderr}`;
  if (result.status !== 0) {
    fail(`${label} exited ${result.status}:\n${output}`);
  }
  console.log(`✓ ${label}`);
  return output;
};

/* ---------- 1. Published files exist ---------- */

const subpaths = Object.keys(pkg.exports).filter(
  (key) => key !== "./package.json",
);
for (const key of subpaths) {
  for (const target of Object.values(pkg.exports[key])) {
    if (!existsSync(join(root, target))) {
      fail(`exports["${key}"] points at missing ${target}`);
    }
  }
}
if (!existsSync(cli)) fail(`bin points at missing ${pkg.bin["style-gen"]}`);
console.log(`✓ ${subpaths.length} export targets and the bin exist`);

/* ---------- 2. Every subpath loads in both formats ---------- */

/**
 * The value (runtime) export names a built `.d.ts` declares, read with the
 * TypeScript checker so `export declare const`, `export { a as b }` and
 * re-exports all count; type-only exports do not.
 * @param {string} dtsFile - Absolute path of a built declaration file
 * @returns {string[]} Sorted value export names
 */
const dtsValueExports = (dtsFile) => {
  const program = ts.createProgram([dtsFile], {
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    skipLibCheck: true,
    noEmit: true,
    types: [],
  });
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(dtsFile);
  const moduleSymbol = source && checker.getSymbolAtLocation(source);
  if (!moduleSymbol) return [];
  return checker
    .getExportsOfModule(moduleSymbol)
    .filter((symbol) => {
      // `export type { X }` re-exports a name that is also a value elsewhere
      // (e.g. `Breakpoint`) but ships no runtime export.
      const typeOnly = symbol.declarations?.every(
        (declaration) =>
          ts.isExportSpecifier(declaration) &&
          (declaration.isTypeOnly || declaration.parent.parent.isTypeOnly),
      );
      if (typeOnly) return false;
      const target =
        symbol.flags & ts.SymbolFlags.Alias
          ? checker.getAliasedSymbol(symbol)
          : symbol;
      return (target.flags & ts.SymbolFlags.Value) !== 0;
    })
    .map((symbol) => symbol.name)
    .sort();
};

// `./tokens` is built with `preserveEntrySignatures: "allow-extension"` (see
// vite.config.ts), so its runtime keys are a superset of its declared ones:
// the extras are minified internal chunk exports, always one letter. Every
// other entry keeps strict equality, which is what makes that global
// setting safe.
const MINIFIED_EXTRAS_ALLOWED = new Set(["./tokens"]);

for (const key of subpaths) {
  const specifier = key === "." ? pkg.name : `${pkg.name}/${key.slice(2)}`;
  const esmKeys = Object.keys(await import(specifier)).sort();
  const cjsKeys = Object.keys(require(specifier)).sort();
  if (esmKeys.join() !== cjsKeys.join()) {
    fail(
      `${specifier}: ESM exports [${esmKeys}] differ from CJS exports [${cjsKeys}]`,
    );
  }
  // `./types` is type-only; every other subpath ships runtime values.
  if (key !== "./types" && esmKeys.length === 0) {
    fail(`${specifier}: no runtime exports`);
  }

  const dtsKeys = dtsValueExports(join(root, pkg.exports[key].types));
  const missing = dtsKeys.filter((name) => !esmKeys.includes(name));
  if (missing.length > 0) {
    fail(`${specifier}: declared but not exported at runtime: [${missing}]`);
  }
  const extras = esmKeys.filter((name) => !dtsKeys.includes(name));
  const illegal = MINIFIED_EXTRAS_ALLOWED.has(key)
    ? extras.filter((name) => name.length !== 1)
    : extras;
  if (illegal.length > 0) {
    fail(`${specifier}: exported at runtime but not declared: [${illegal}]`);
  }
  console.log(
    `✓ ${specifier} — import + require (${esmKeys.length} exports, ${dtsKeys.length} declared)`,
  );
}

/* ---------- 3. ESM and CJS builds agree ---------- */

const theme = JSON.parse(readFileSync(exampleTheme, "utf8"));
const esmCss = (await import(pkg.name)).generate(theme).css;
const cjsCss = require(pkg.name).generate(theme).css;
if (esmCss !== cjsCss) fail("generate() CSS differs between ESM and CJS");
if (!esmCss.includes("@theme inline")) {
  fail("generate() CSS has no @theme inline block");
}
console.log("✓ generate() — ESM and CJS emit identical CSS");

/* ---------- 4. CLI ---------- */

// The CLI confines paths to its cwd, so every file it reads lives in `work`.
const work = mkdtempSync(join(tmpdir(), "style-gen-smoke-"));
process.on("exit", () => rmSync(work, { recursive: true, force: true }));

const version = runNode("style-gen --version", [cli, "--version"], work);
if (!version.includes(`style-gen v${pkg.version}`)) {
  fail(`--version printed "${version.trim()}", expected v${pkg.version}`);
}

runNode("style-gen schema", [cli, "schema", "--out", "schema.json"], work);
const schema = JSON.parse(readFileSync(join(work, "schema.json"), "utf8"));
if (!schema.properties?.colors) fail("schema.json has no colors property");

copyFileSync(exampleTheme, join(work, "theme.json"));
runNode(
  "style-gen generate",
  [cli, "generate", "--theme", "theme.json", "--out", "theme.css"],
  work,
);
if (readFileSync(join(work, "theme.css"), "utf8") !== esmCss) {
  fail("style-gen generate CSS differs from generate().css");
}

// `init` in an empty ESM project that resolves the package by name.
const project = join(work, "project");
mkdirSync(join(project, "node_modules", "@duydpdev"), { recursive: true });
symlinkSync(
  root,
  join(project, "node_modules", pkg.name),
  process.platform === "win32" ? "junction" : "dir",
);
writeFileSync(
  join(project, "package.json"),
  JSON.stringify({ name: "smoke", private: true, type: "module" }),
);
runNode("style-gen init", [cli, "init"], project);

const config = JSON.parse(
  readFileSync(join(project, "style-gen.config.json"), "utf8"),
);
// Node >= 22.18 / 23.6 strips types by default; 22.6–22.17 needs the flag.
// Node 20.19 (the `engines` floor) cannot run a .ts file at all; `init`
// documents that its script needs Node >= 22.18, so only that step is skipped.
const stripsByDefault = Boolean(process.features.typescript);
const acceptsStripFlag = process.allowedNodeEnvironmentFlags.has(
  "--experimental-strip-types",
);
if (!stripsByDefault && !acceptsStripFlag) {
  console.log(
    `- scaffolded ${config.plugin} not run: Node ${process.version} cannot strip TypeScript types`,
  );
} else {
  const stripFlag = stripsByDefault ? [] : ["--experimental-strip-types"];
  runNode(
    `scaffolded ${config.plugin}`,
    [...stripFlag, config.plugin],
    project,
  );
  const scaffolded = readFileSync(join(project, config.output), "utf8");
  if (!scaffolded.includes("@theme inline")) {
    fail(`${config.output} written by ${config.plugin} has no @theme inline`);
  }
}

console.log("✓ smoke-dist passed");
