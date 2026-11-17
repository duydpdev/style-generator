#!/usr/bin/env node
/**
 * TypeScript peer smoke: the declarations of the packed package, type-checked
 * by each TypeScript major the `typescript` peer range names. Needs dist/
 * (`yarn build:all`), the repo's Yarn release and network access (TypeScript
 * and the peers come from the npm registry).
 *
 * Packs the repo root with the repo's own Yarn release, then, per leg of
 * `LEGS`, creates a scratch npm project in the OS temp directory (lifecycle
 * scripts off, public npm registry), installs the tarball, that TypeScript
 * release and the peers the declarations import, writes
 * `scripts/dist-types.cjs.assert.cts` (it imports every subpath through the
 * package name) as `check.cts` and `check.mts`, and runs `tsc` with
 * `module`/`moduleResolution` `node16`. The `.cts` file resolves the
 * `require` condition (`dist/*.d.cts`, `dist/vite.legacy.d.cts` below
 * TypeScript 5.3), the `.mts` file the `import` condition (`dist/*.d.ts`).
 * Yarn 4.10 cannot install TypeScript 7 (its built-in `compat/typescript`
 * patch does not apply), which is why this runs under npm. Every scratch
 * directory is removed in every case; the exit code is 0 only when every leg
 * passed.
 */
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
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

/**
 * One TypeScript release per leg, `skipLibCheck` as a consumer sets it:
 * `true` below 5.3 (the default of most setups; the legacy `.d.cts` of
 * `./vite` keeps the `assert` spelling there), `false` from 5.9 on so every
 * declaration of the package is checked. Change a leg by hand to move the
 * check forward.
 */
const LEGS = [
  { typescript: "5.0.4", skipLibCheck: true },
  { typescript: "5.2.2", skipLibCheck: true },
  { typescript: "5.9.3", skipLibCheck: false },
  { typescript: "6", skipLibCheck: false },
  { typescript: "7.0.2", skipLibCheck: false },
];

/** Installed next to the package and TypeScript in every leg; mirrors the optional peers the declarations import. */
const PEERS = [
  "vite@7",
  "tailwindcss@4",
  "@types/node",
  "class-variance-authority",
  "clsx",
  "tailwind-merge@3",
  "@types/react@19",
];

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

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
  npm_config_update_notifier: "false",
};

/**
 * Print an error and exit 1. Never called inside the `try` below: it would skip `finally`.
 * @param {string} message - What went wrong
 * @returns {never} Never returns
 */
const fail = (message) => {
  console.error(`✗ ts-peer: ${message}`);
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
const yarnPath = /^yarnPath:\s*(\S+)\s*$/m.exec(
  readFileSync(join(root, ".yarnrc.yml"), "utf8"),
)?.[1];
if (yarnPath === undefined) fail(".yarnrc.yml has no yarnPath");
const consumerFile = join(root, "scripts", "dist-types.cjs.assert.cts");

const scratch = mkdtempSync(join(realpathSync(tmpdir()), "sg-ts-peer-"));
const problems = [];
// `fail()` exits immediately, which would skip `finally`: record the problems
// and exit once the scratch directory is removed (scripts/check-types-pack.mjs).
try {
  const tarball = join(scratch, "style-generator.tgz");
  if (
    run(
      process.execPath,
      [join(root, yarnPath), "pack", "--out", tarball],
      root,
    ) !== 0
  ) {
    problems.push("yarn pack failed");
  } else {
    for (const { typescript, skipLibCheck } of LEGS) {
      const label = `typescript@${typescript} (skipLibCheck ${skipLibCheck})`;
      const dir = join(scratch, `ts-${typescript}`);
      mkdirSync(dir);
      writeFileSync(
        join(dir, "package.json"),
        `${JSON.stringify({ name: "ts-peer-leg", private: true }, null, 2)}\n`,
      );
      copyFileSync(consumerFile, join(dir, "check.cts"));
      copyFileSync(consumerFile, join(dir, "check.mts"));
      writeFileSync(
        join(dir, "tsconfig.json"),
        `${JSON.stringify(
          {
            compilerOptions: {
              module: "node16",
              moduleResolution: "node16",
              strict: true,
              noEmit: true,
              types: ["node"],
              skipLibCheck,
            },
            files: ["check.cts", "check.mts"],
          },
          null,
          2,
        )}\n`,
      );
      if (
        run(
          "npm",
          [
            "install",
            "--ignore-scripts",
            "--no-audit",
            "--no-fund",
            tarball,
            `typescript@${typescript}`,
            ...PEERS,
          ],
          dir,
        ) !== 0
      ) {
        problems.push(`${label}: npm install failed`);
      } else if (
        run(
          process.execPath,
          [join(dir, "node_modules", "typescript", "bin", "tsc"), "-p", "."],
          dir,
        ) !== 0
      ) {
        problems.push(`${label}: tsc reported errors`);
      } else {
        const version = JSON.parse(
          readFileSync(
            join(dir, "node_modules", "typescript", "package.json"),
            "utf8",
          ),
        ).version;
        console.log(
          `✓ ts-peer: typescript@${version} (skipLibCheck ${skipLibCheck}) type-checks every subpath`,
        );
      }
    }
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
if (problems.length > 0) fail(problems.join("\n  "));
