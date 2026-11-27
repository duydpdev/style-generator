#!/usr/bin/env node
/**
 * Smoke-run the built package the way consumers load it (CI-04). Run after
 * `yarn build:all`:
 *
 * 1. every file named in `package.json#exports` and `bin` exists (nested
 *    `import`/`require` → `types`/`default` conditions included), and each
 *    `.d.cts` is its `.d.ts` rewritten by `scripts/cjs-declaration.mjs` (the
 *    `./vite` `types@<5.3` target is the `assert` spelling of that rewrite);
 * 2. every subpath loads through the package name with both `import` and
 *    `require`, exposes the same export names, and those names match the
 *    value exports its `.d.ts` declares (`./tokens` may add one-letter
 *    internal aliases); a real `cn()` call through `require` also merges
 *    classes (`createCn` is the one default import of an external, `clsx`,
 *    where a bundler's CommonJS interop can differ);
 * 3. `generate()` from the ESM and CJS builds returns identical CSS;
 * 4. the CLI bundle runs: `--version`, `schema`, `generate` (same CSS as the
 *    library), `tokens`, `budget` (each also with `--help`) and `init`: in an
 *    empty project it prints the `style-gen generate` fallback and writes no
 *    generator script (`generate` then builds CSS from what it scaffolded);
 *    next to a `vite.config.ts` it prints the `styleGenVite()` snippet;
 *    `canvas check --naming --boards` passes a minimal canvas built from the
 *    emitted manifest and the theme `init` wrote, exits 1 with the retired
 *    line once a `cl-*` board is added, and exits 2 without `--theme`.
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
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  toCjsDeclaration,
  toLegacyCjsDeclaration,
} from "./cjs-declaration.mjs";

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
/**
 * Every file path an `exports` target names, however deeply the conditions
 * (`import`/`require` → `types`/`default`) nest.
 * @param {string | Record<string, unknown>} target - An `exports` value
 * @returns {string[]} File paths
 */
const targetFiles = (target) =>
  typeof target === "string"
    ? [target]
    : Object.values(target).flatMap((value) =>
        targetFiles(/** @type {string | Record<string, unknown>} */ (value)),
      );

for (const key of subpaths) {
  for (const target of targetFiles(pkg.exports[key])) {
    if (!existsSync(join(root, target))) {
      fail(`exports["${key}"] points at missing ${target}`);
    }
  }
  // The `.d.cts` is its `.d.ts` rewritten by scripts/cjs-declaration.mjs.
  const { import: esm, require: cjs } = pkg.exports[key];
  if (
    readFileSync(join(root, cjs.types), "utf8") !==
    toCjsDeclaration(readFileSync(join(root, esm.types), "utf8"), esm.types)
  ) {
    fail(`exports["${key}"]: ${cjs.types} differs from ${esm.types}`);
  }
  // `./vite` also ships the `assert` spelling for TypeScript before 5.3.
  const legacy = cjs["types@<5.3"];
  if (
    legacy !== undefined &&
    readFileSync(join(root, legacy), "utf8") !==
      toLegacyCjsDeclaration(
        readFileSync(join(root, esm.types), "utf8"),
        esm.types,
      )
  ) {
    fail(`exports["${key}"]: ${legacy} differs from ${esm.types}`);
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
  // `./types` and `./ui-react` are type-only; every other subpath ships runtime values.
  if (key !== "./types" && key !== "./ui-react" && esmKeys.length === 0) {
    fail(`${specifier}: no runtime exports`);
  }

  const dtsKeys = dtsValueExports(join(root, pkg.exports[key].import.types));
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

// `createCn` default-imports `clsx`: a CommonJS build that mishandles that
// interop only breaks when the function is called.
const cn = require(`${pkg.name}/ui`).createCn(
  require(`${pkg.name}/tokens`).createDesignTokens({
    colors: { primary: "#000" },
  }).DesignTokens.Web,
);
const merged = cn("px-2", undefined, "px-4");
if (merged !== "px-4") {
  fail(`cn() through require returned "${merged}", expected "px-4"`);
}
console.log('✓ cn() through require merges "px-2 px-4" into "px-4"');

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

for (const command of ["tokens", "budget"]) {
  const help = runNode(
    `style-gen ${command} --help`,
    [cli, command, "--help"],
    work,
  );
  if (!help.includes(`Usage: style-gen ${command}`)) {
    fail(`${command} --help printed no "Usage: style-gen ${command}" line`);
  }
}

runNode(
  "style-gen tokens",
  [cli, "tokens", "--theme", "theme.json", "--out", "theme.tokens.ts"],
  work,
);
if (!readFileSync(join(work, "theme.tokens.ts"), "utf8").includes("tokens")) {
  fail("style-gen tokens wrote no tokens export");
}

// A generous budget: the smoke checks the command runs and exits 0, not the size.
runNode(
  "style-gen budget",
  [cli, "budget", "theme.css", "--max-gzip", "100000"],
  work,
);
const costOut = runNode(
  "style-gen budget --coverage-cost",
  [
    cli,
    "budget",
    "theme.css",
    "--max-gzip",
    "100000",
    "--coverage-cost",
    "--theme",
    "theme.json",
  ],
  work,
);
if (!costOut.includes("Coverage cost")) {
  fail(`budget --coverage-cost printed no cost header:\n${costOut}`);
}

// `init` in an empty project: no bundler config, so it prints the
// `style-gen generate` fallback; `generate` then writes the CSS from what
// `init` scaffolded. No generator script exists any more (5.2.0).
const project = join(work, "project");
mkdirSync(project);
const initOut = runNode("style-gen init", [cli, "init"], project);
if (!initOut.includes("style-gen generate")) {
  fail(
    `init without a bundler config printed no style-gen generate fallback:\n${initOut}`,
  );
}
const config = JSON.parse(
  readFileSync(join(project, "style-gen.config.json"), "utf8"),
);
if ("plugin" in config || existsSync(join(project, "plugins"))) {
  fail("init still scaffolds a generator script (plugin key or plugins/)");
}
// `init` copies the agent rules the build emitted, stamped with this
// version, and tells the app to keep Tailwind out of `.claude/`.
const rulesFile = join(project, ".claude/rules/style-generator.md");
if (!existsSync(rulesFile)) {
  fail(`init wrote no .claude/rules/style-generator.md:\n${initOut}`);
}
if (
  !readFileSync(rulesFile, "utf8")
    .split("\n")[0]
    ?.startsWith(`<!-- @duydpdev/style-generator ${pkg.version} `)
) {
  fail(`.claude/rules/style-generator.md is not stamped v${pkg.version}`);
}
if (!initOut.includes('@source not "../.claude";')) {
  fail(`init printed no @source not line for .claude:\n${initOut}`);
}
// After an upgrade, `init --rules-only` replaces a copy stamped with another
// version without a terminal (the header format init.ts parses) and leaves
// the theme alone.
const themeBefore = readFileSync(join(project, config.theme), "utf8");
writeFileSync(
  rulesFile,
  "<!-- @duydpdev/style-generator 0.0.0-old — generated by style-gen init -->\n",
);
const rulesOnlyOut = runNode(
  "style-gen init --rules-only",
  [cli, "init", "--rules-only"],
  project,
);
if (
  !readFileSync(rulesFile, "utf8").startsWith(
    `<!-- @duydpdev/style-generator ${pkg.version} `,
  )
) {
  fail(`init --rules-only did not refresh the rules:\n${rulesOnlyOut}`);
}
if (readFileSync(join(project, config.theme), "utf8") !== themeBefore) {
  fail("init --rules-only changed the theme");
}
const skipProject = join(work, "skip-rules-project");
mkdirSync(skipProject);
runNode(
  "style-gen init --skip-rules",
  [cli, "init", "--skip-rules"],
  skipProject,
);
if (existsSync(join(skipProject, ".claude"))) {
  fail("init --skip-rules still wrote .claude/");
}
runNode("style-gen generate (init project)", [cli, "generate"], project);
if (
  !readFileSync(join(project, config.output), "utf8").includes("@theme inline")
) {
  fail(`${config.output} written by style-gen generate has no @theme inline`);
}

// `canvas check` on the smallest canvas that passes `--naming --boards`: the
// pages, core boards (sections, theme literals, provenance) and component
// boards of the manifest the build emitted, over the theme `init` wrote.
const standard = JSON.parse(
  readFileSync(join(root, "dist/canvas/design-canvas-standard.json"), "utf8"),
);
const themeFile = join(project, config.theme);
const starterTheme = JSON.parse(readFileSync(themeFile, "utf8"));
const canvasDir = join(project, "canvas");
mkdirSync(canvasDir);
const frame = { w: 400, h: 300 };
/**
 * A board in the editor's markup, its root padded to the component minimum.
 * @param {string} inner - Root content, on one line
 * @returns {string} The board
 */
const boardHtml = (inner) =>
  [
    "<x-dc>",
    `<div style="padding: calc(var(--spacing) * 8)">${inner}</div>`,
    "</x-dc>",
    `<script type="text/x-dc" data-dc-script data-props='${JSON.stringify({ $preview: { width: frame.w, height: frame.h } })}'></script>`,
  ].join("\n");
/** @type {{ pages: unknown[], boards: Record<string, unknown>, order: string[] }} */
const canvasJson = { pages: standard.pages, boards: {}, order: [] };
for (const { file, page, title } of standard.boards) {
  const { sections = [], literals = [] } = standard.content?.[file] ?? {};
  const blocks = [
    ...sections.map((id) => `<section data-sg-section="${id}"></section>`),
    ...literals.map(
      (path) =>
        `<script type="application/json" data-sg-literal="${path}">${JSON.stringify(starterTheme[path] ?? {})}</script>`,
    ),
  ];
  if (file === standard.provenanceBoard)
    blocks.push(
      `<script type="application/json" data-sg-provenance="main">${JSON.stringify({ theme: "", lib: pkg.version, ds: "1", built: "2026-01-01" })}</script>`,
    );
  canvasJson.boards[file] = { title, page, ...frame };
  canvasJson.order.push(file);
  writeFileSync(join(canvasDir, file), boardHtml(blocks.join("")));
}
for (const name of standard.dsComponents) {
  const file = `c-${name}.dc.html`;
  const { page, titlePrefix } = standard.componentBoards;
  canvasJson.boards[file] = { title: `${titlePrefix}${name}`, page, ...frame };
  canvasJson.order.push(file);
  writeFileSync(
    join(canvasDir, file),
    boardHtml('<p style="color: var(--sg-color-primary)">x</p>'),
  );
}
writeFileSync(join(canvasDir, "canvas.json"), JSON.stringify(canvasJson));
const canvasArgs = [cli, "canvas", "check", "--canvas", "canvas"];
const canvasOk = runNode(
  "style-gen canvas check --naming --boards",
  [...canvasArgs, "--theme", config.theme, "--naming", "--boards"],
  project,
);
// The sample boards read one colour, so unread tokens are reported as findings; the run still passes.
const canvasLast = canvasOk.trimEnd().split("\n").at(-1) ?? "";
if (!/^(?:OK|FINDINGS): /.test(canvasLast)) {
  fail(`canvas check on a valid canvas printed no OK line:\n${canvasOk}`);
}
writeFileSync(join(canvasDir, "cl-x.dc.html"), boardHtml("x"));
const retired = spawnSync(
  process.execPath,
  [...canvasArgs, "--theme", config.theme, "--naming", "--boards"],
  { cwd: project, encoding: "utf8" },
);
const retiredLine =
  "cl-x.dc.html:1 cl-* boards are retired (split into one c-* board per component)";
if (retired.status !== 1 || !retired.stdout.split("\n").includes(retiredLine)) {
  fail(
    `canvas check with a cl-* board: expected exit 1 and "${retiredLine}", got ${retired.status}:\n${retired.stdout}${retired.stderr}`,
  );
}
console.log("✓ style-gen canvas check reports a cl-* board");
const usage = spawnSync(process.execPath, canvasArgs, {
  cwd: project,
  encoding: "utf8",
});
if (usage.status !== 2) {
  fail(
    `canvas check without --theme: expected exit 2, got ${usage.status}:\n${usage.stdout}${usage.stderr}`,
  );
}
console.log("✓ style-gen canvas check exits 2 without --theme");

// Next to a vite.config.ts, `init` prints the styleGenVite() snippet.
const viteProject = join(work, "vite-project");
mkdirSync(viteProject);
writeFileSync(join(viteProject, "vite.config.ts"), "");
const viteOut = runNode("style-gen init (vite)", [cli, "init"], viteProject);
if (!viteOut.includes("styleGenVite()")) {
  fail(
    `init next to vite.config.ts printed no styleGenVite() snippet:\n${viteOut}`,
  );
}

console.log("✓ smoke-dist passed");
