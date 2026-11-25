#!/usr/bin/env node
/**
 * Starter smoke: starters/vite-react installs from the packed library with
 * npm, builds, type-checks and agrees with `style-gen generate --check`.
 * Needs dist/ (`yarn build:all`), the repo's node_modules and network access
 * (the other dependencies come from the npm registry).
 *
 * Packs the repo root with the repo's own Yarn release, copies the starter
 * (no node_modules, dist or generated files) into a scratch directory in the
 * OS temp directory, points `@duydpdev/style-generator` at the tarball and
 * every other dependency at the exact version the repo resolves, then runs
 * `npm install --ignore-scripts` against the public registry, `npm run build`
 * (the plugin writes src/theme.css and src/theme.tokens.ts at build start),
 * `npm run typecheck` and `npm exec --no -- style-gen generate --check`.
 * The built CSS must carry `--sg-color-primary` and `.bg-primary`, and
 * the tarball must ship `dist/canvas/design-canvas-standard.json`, and
 * `style-gen canvas check --boards` on an empty canvas must exit 1 with
 * `canvas.json:1 no .dc.html files under empty-canvas` (the bundled manifest
 * loads). The scratch
 * directory is removed in every case; the exit code is 1 on any failure.
 */
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const starter = join(root, "starters", "vite-react");

/** The only variables the children inherit: no token or registry credential reaches the install. */
const ENV_ALLOWLIST = [
  "PATH",
  "HOME",
  "TMPDIR",
  "CI",
  "SystemRoot",
  "TEMP",
  "TMP",
  "USERPROFILE",
];
const childEnv = {
  ...Object.fromEntries(
    ENV_ALLOWLIST.filter((name) => process.env[name] !== undefined).map(
      (name) => [name, process.env[name]],
    ),
  ),
  YARN_ENABLE_IMMUTABLE_INSTALLS: "false",
  YARN_ENABLE_TELEMETRY: "false",
  npm_config_registry: "https://registry.npmjs.org",
};

/**
 * @typedef {object} Manifest
 * @property {string} version - Package version
 * @property {Record<string, string>} dependencies - Runtime dependencies
 * @property {Record<string, string>} devDependencies - Dev dependencies
 */

/**
 * Parse a package.json.
 * @param {string} file - Absolute path
 * @returns {Manifest} The parsed value
 */
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));

/**
 * Print an error and exit 1. Never called inside the `try` below: it would skip `finally`.
 * @param {string} message - What went wrong
 * @returns {never} Never returns
 */
const fail = (message) => {
  console.error(`starter-smoke: ${message}`);
  process.exit(1);
};

/**
 * Run `command` in `cwd`, inheriting stdio, with the allow-listed environment.
 * @param {string} command - Executable
 * @param {string[]} args - Arguments
 * @param {string} cwd - Working directory
 * @returns {number} Exit status (1 when the process did not start)
 */
const run = (command, args, cwd) =>
  spawnSync(command, args, { cwd, stdio: "inherit", env: childEnv }).status ??
  1;

/**
 * The version of `name` the repo resolved (hoisted at the root node_modules).
 * @param {string} name - Package name
 * @returns {string} The exact installed version
 */
const installed = (name) => {
  const file = join(root, "node_modules", name, "package.json");
  return existsSync(file)
    ? readJson(file).version
    : fail(`${file} does not exist; run \`yarn install\``);
};

if (!existsSync(join(root, "dist", "index.js")))
  fail("dist/index.js does not exist; run `yarn build:all` first");
const yarnPath = /^yarnPath:\s*(\S+)\s*$/m.exec(
  readFileSync(join(root, ".yarnrc.yml"), "utf8"),
)?.[1];
if (yarnPath === undefined) fail(".yarnrc.yml has no yarnPath");

const scratch = mkdtempSync(join(realpathSync(tmpdir()), "sg-starter-"));
const app = join(scratch, "app");
const tarball = join(scratch, "package.tgz");
let problem;
// `fail()` exits immediately, which would skip `finally`: record the problem
// and exit once the scratch directory is removed (scripts/check-types-pack.mjs).
try {
  if (
    run(
      process.execPath,
      [join(root, yarnPath), "pack", "--out", tarball],
      root,
    ) !== 0
  ) {
    problem = "yarn pack failed";
  } else {
    console.log("✓ starter: packed the library");
    cpSync(starter, app, {
      recursive: true,
      filter: (source) =>
        !/[\\/](node_modules|dist)$/.test(source) &&
        !/[\\/]src[\\/]theme\.(css|tokens\.ts)$/.test(source),
    });
    const manifestFile = join(app, "package.json");
    const manifest = readJson(manifestFile);
    for (const field of ["dependencies", "devDependencies"]) {
      for (const name of Object.keys(manifest[field])) {
        manifest[field][name] =
          name === "@duydpdev/style-generator"
            ? `file:${tarball}`
            : installed(name);
      }
    }
    writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);

    /** @type {[string, string[]][]} */
    const steps = [
      [
        "installs from the tarball with npm",
        ["install", "--ignore-scripts", "--no-audit", "--no-fund"],
      ],
      ["builds with vite", ["run", "build"]],
      ["type-checks", ["run", "typecheck"]],
      [
        "agrees with `style-gen generate --check`",
        ["exec", "--no", "--", "style-gen", "generate", "--check"],
      ],
    ];
    for (const [label, args] of steps) {
      if (run("npm", args, app) !== 0) {
        problem = `${label}: npm ${args.join(" ")} failed`;
        break;
      }
      console.log(`✓ starter: ${label}`);
    }

    if (problem === undefined) {
      const assets = join(app, "dist", "assets");
      const css = readdirSync(assets)
        .filter((file) => file.endsWith(".css"))
        .map((file) => readFileSync(join(assets, file), "utf8"))
        .join("\n");
      for (const needle of ["--sg-color-primary", ".bg-primary"]) {
        if (!css.includes(needle)) {
          problem = `the built CSS does not contain ${needle}`;
          break;
        }
      }
      if (problem === undefined)
        console.log(
          "✓ starter: the built CSS carries the theme and its utilities",
        );
    }

    // The manifest `canvas check` applies is bundled into the installed CLI:
    // `--boards` reads it and reports the empty canvas (exit 1, not 2).
    const bundledManifest = join(
      app,
      "node_modules/@duydpdev/style-generator/dist/canvas/design-canvas-standard.json",
    );
    if (problem === undefined && !existsSync(bundledManifest))
      problem = `the packed tarball has no dist/canvas/design-canvas-standard.json`;
    if (problem === undefined) {
      mkdirSync(join(app, "empty-canvas"));
      const canvasArgs = [
        "canvas",
        "check",
        "--canvas",
        "empty-canvas",
        "--theme",
        "styles/theme.json",
      ];
      const canvas = spawnSync(
        // eslint-disable-next-line sonarjs/no-os-command-from-path -- npm is resolved from PATH like every other step of this smoke; the arguments are fixed
        "npm",
        ["exec", "--no", "--", "style-gen", ...canvasArgs, "--boards"],
        { cwd: app, encoding: "utf8", env: childEnv },
      );
      const expected = "canvas.json:1 no .dc.html files under empty-canvas";
      if (
        canvas.status !== 1 ||
        !canvas.stdout.split(/\r?\n/).includes(expected)
      )
        problem = `style-gen canvas check --boards on an empty canvas: expected exit 1 and "${expected}", got ${String(canvas.status)}:\n${canvas.stdout}${canvas.stderr}`;
      else
        console.log(
          "✓ starter: style-gen canvas check loads the bundled manifest",
        );
    }
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
if (problem !== undefined) fail(problem);
