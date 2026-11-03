#!/usr/bin/env node
/**
 * Copy-out smoke (G2): a component folder copied out of examples/plain-react
 * type-checks in a fresh project whose only dependencies are the packed
 * library and its documented peers. Needs dist/ (`yarn build:all`), the
 * repo's node_modules and network access (the peers come from the npm
 * registry).
 *
 * Packs the repo root with the repo's own Yarn release, creates a scratch
 * project in the OS temp directory (lifecycle scripts off, public npm
 * registry, the exact versions the repo itself resolves), copies
 * src/theme.ts, src/theme/theme.json and src/ui/button/ (stories
 * excluded), installs with nodeLinker node-modules and runs
 * `tsc --noEmit`. The scratch directory is removed in every case; the exit
 * code is tsc's (1 for an earlier failure).
 */
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const COMPONENT = "button";
const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(app, "../..");

/** The only variables the Yarn and tsc children inherit: no token or registry credential reaches the install. */
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
};

/**
 * Parse a JSON file.
 * @param {string} file - Absolute path
 * @returns {Record<string, string>} The parsed value
 */
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));

/**
 * Print an error and exit 1. Never called inside the `try` below: it would skip `finally`.
 * @param {string} message - What went wrong
 * @returns {never} Never returns
 */
const fail = (message) => {
  console.error(`copy-out-smoke: ${message}`);
  process.exit(1);
};

/**
 * Run Node with `args` in `cwd`, inheriting stdio, with the allow-listed environment.
 * @param {string[]} args - Arguments after the node executable
 * @param {string} cwd - Working directory
 * @returns {number} Exit status (1 when the process did not start)
 */
const node = (args, cwd) =>
  spawnSync(process.execPath, args, { cwd, stdio: "inherit", env: childEnv })
    .status ?? 1;

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

if (!existsSync(join(root, "dist")))
  fail("dist/ does not exist; run `yarn build:all` first");
const yarnPath = /^yarnPath:\s*(\S+)\s*$/m.exec(
  readFileSync(join(root, ".yarnrc.yml"), "utf8"),
)?.[1];
if (yarnPath === undefined) fail(".yarnrc.yml has no yarnPath");
const yarn = join(root, yarnPath);

const manifest = {
  name: "copy-out-smoke",
  private: true,
  type: "module",
  dependencies: {
    "@duydpdev/style-generator": "file:./style-generator.tgz",
    ...Object.fromEntries(
      ["class-variance-authority", "clsx", "react", "tailwind-merge"].map(
        (name) => [name, installed(name)],
      ),
    ),
  },
  devDependencies: Object.fromEntries(
    ["@types/react", "typescript"].map((name) => [name, installed(name)]),
  ),
};

const tsconfig = {
  compilerOptions: {
    target: "ES2022",
    lib: ["ES2022", "DOM", "DOM.Iterable"],
    module: "ESNext",
    moduleResolution: "bundler",
    jsx: "react-jsx",
    strict: true,
    exactOptionalPropertyTypes: true,
    noUncheckedIndexedAccess: true,
    // A bare `import "pkg"` of a package that is not installed is an error too.
    noUncheckedSideEffectImports: true,
    resolveJsonModule: true,
    isolatedModules: true,
    noEmit: true,
    skipLibCheck: true,
    types: [],
  },
  include: ["src"],
};

const scratch = mkdtempSync(join(tmpdir(), "sg-copy-out-"));
let problem;
let status = 1;
// `fail()` exits immediately, which would skip `finally`: record the problem
// and exit once the scratch directory is removed (scripts/check-types-pack.mjs).
try {
  if (
    node(
      [yarn, "pack", "--out", join(scratch, "style-generator.tgz")],
      root,
    ) !== 0
  ) {
    problem = "yarn pack failed";
  } else {
    writeFileSync(join(scratch, "yarn.lock"), "");
    writeFileSync(
      join(scratch, ".yarnrc.yml"),
      'nodeLinker: node-modules\nenableScripts: false\nenableTelemetry: false\nnpmRegistryServer: "https://registry.npmjs.org"\n',
    );
    writeFileSync(
      join(scratch, "package.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    writeFileSync(
      join(scratch, "tsconfig.json"),
      `${JSON.stringify(tsconfig, null, 2)}\n`,
    );
    mkdirSync(join(scratch, "src", "theme"), { recursive: true });
    cpSync(join(app, "src", "theme.ts"), join(scratch, "src", "theme.ts"));
    cpSync(
      join(app, "src", "theme", "theme.json"),
      join(scratch, "src", "theme", "theme.json"),
    );
    cpSync(
      join(app, "src", "ui", COMPONENT),
      join(scratch, "src", "ui", COMPONENT),
      {
        recursive: true,
        filter: (source) =>
          !source.endsWith(".stories.tsx") &&
          !source.includes("__screenshots__"),
      },
    );
    if (node([yarn, "install"], scratch) !== 0) {
      problem = "yarn install in the scratch project failed";
    } else {
      status = node(
        [
          join(scratch, "node_modules", "typescript", "bin", "tsc"),
          "--noEmit",
          "-p",
          scratch,
        ],
        scratch,
      );
    }
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
if (problem !== undefined) fail(problem);
if (status === 0) {
  console.log(
    `✓ copy-out: src/ui/${COMPONENT}/ type-checks with the packed package and its peers only`,
  );
}
process.exit(status);
