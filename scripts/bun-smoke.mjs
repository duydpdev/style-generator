#!/usr/bin/env node
/**
 * Bun smoke: the packed package installed and run with Bun. Needs dist/
 * (`yarn build:all`), the repo's Yarn release, network access and `bun` on the
 * PATH (or `BUN_BIN`). CI installs Bun with `npm install -g bun@<version>`
 * (the repo allows GitHub-owned actions only), see `.github/workflows/nightly.yml`.
 *
 * Packs the repo root with the repo's own Yarn release, creates a scratch
 * project in the OS temp directory, installs the tarball and the Tailwind
 * version the repo pins with `bun add` (Bun runs no dependency lifecycle
 * script it does not trust), then checks:
 *   1. `node_modules/.bin/style-gen` exists (the bin link);
 *   2. `bun node_modules/@duydpdev/style-generator/dist/cli/index.mjs generate`
 *      writes a `theme.css` with the theme's variables;
 *   3. `generate()` imported by Bun from the package name returns that CSS.
 * The CLI file is run by `bun` directly: `bun x style-gen` honours the
 * `#!/usr/bin/env node` shebang (runs under Node) and could download an
 * unrelated `style-gen` package. The scratch directory is removed in every
 * case; the exit code is 0 only when every step passed.
 */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bun = process.env.BUN_BIN ?? "bun";

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
};

/**
 * Print an error and exit 1. Never called inside the `try` below: it would skip `finally`.
 * @param {string} message - What went wrong
 * @returns {never} Never returns
 */
const fail = (message) => {
  console.error(`✗ bun-smoke: ${message}`);
  process.exit(1);
};

/**
 * Run `command` with `args` in `cwd` with the allow-listed environment.
 * @param {string} command - Executable
 * @param {string[]} args - Arguments
 * @param {string} cwd - Working directory
 * @returns {number} Exit status (1 when the process did not start)
 */
const run = (command, args, cwd) =>
  spawnSync(command, args, { cwd, env: childEnv, stdio: "inherit" }).status ??
  1;

if (!existsSync(join(root, "dist")))
  fail("dist/ does not exist; run `yarn build:all` first");
if (spawnSync(bun, ["--version"], { env: childEnv }).status !== 0)
  fail("bun not found");
const yarnPath = /^yarnPath:\s*(\S+)\s*$/m.exec(
  readFileSync(join(root, ".yarnrc.yml"), "utf8"),
)?.[1];
if (yarnPath === undefined) fail(".yarnrc.yml has no yarnPath");
const tailwind = JSON.parse(readFileSync(join(root, "package.json"), "utf8"))
  .devDependencies?.tailwindcss;
if (typeof tailwind !== "string" || !/^\d+\.\d+\.\d+$/.test(tailwind))
  fail("package.json devDependencies.tailwindcss is not an exact version");

const scratch = mkdtempSync(join(realpathSync(tmpdir()), "sg-bun-smoke-"));
const problems = [];
// `fail()` exits immediately, which would skip `finally`: record the problems
// and exit once the scratch directory is removed (scripts/ts-peer-smoke.mjs).
try {
  const tarball = join(scratch, "package.tgz");
  const app = join(scratch, "app");
  mkdirSync(join(app, "styles"), { recursive: true });
  if (
    run(
      process.execPath,
      [join(root, yarnPath), "pack", "--out", tarball],
      root,
    ) !== 0
  ) {
    problems.push("yarn pack failed");
  } else {
    writeFileSync(
      join(app, "package.json"),
      `${JSON.stringify({ name: "bun-smoke", private: true, type: "module" })}\n`,
    );
    writeFileSync(
      join(app, "styles", "theme.json"),
      `${JSON.stringify({ colors: { primary: "#123456" } })}\n`,
    );
    if (run(bun, ["add", tarball, `tailwindcss@${tailwind}`], app) !== 0) {
      problems.push("bun add failed");
    } else if (!existsSync(join(app, "node_modules", ".bin", "style-gen"))) {
      problems.push("bin link missing");
    } else {
      console.log("✓ bun-smoke: bin link node_modules/.bin/style-gen exists");
      const cli = join(
        "node_modules",
        "@duydpdev",
        "style-generator",
        "dist",
        "cli",
        "index.mjs",
      );
      const css = join(app, "styles", "theme.css");
      if (run(bun, [cli, "generate"], app) !== 0) {
        problems.push("the CLI under bun exited non-zero");
      } else if (
        !existsSync(css) ||
        !readFileSync(css, "utf8").includes("--sg-color-primary")
      ) {
        problems.push("styles/theme.css lacks --sg-color-primary");
      } else {
        console.log("✓ bun-smoke: the CLI under bun wrote styles/theme.css");
        if (
          run(
            bun,
            [
              "-e",
              "import { generate } from '@duydpdev/style-generator'; const r = generate({ colors: { primary: '#123456' } }); if (!r.css.includes('--sg-color-primary')) process.exit(1);",
            ],
            app,
          ) !== 0
        ) {
          problems.push("generate() under bun lacks --sg-color-primary");
        } else {
          console.log("✓ bun-smoke: generate() under bun returns the CSS");
        }
      }
    }
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
if (problems.length > 0) fail(problems.join("\n  "));
