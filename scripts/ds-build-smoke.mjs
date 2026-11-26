#!/usr/bin/env node
/**
 * `style-gen ds build` smoke: the packed tarball in a scratch project whose only peer is `tailwindcss`, the way a
 * product installs it. Needs dist/ (`yarn build:all`) and network access (the install comes from the npm registry).
 *
 * Packs the repo root with the repo's own Yarn release, installs it next to `tailwindcss` (lifecycle scripts off), then
 * runs `style-gen ds build` on the committed fixture theme with a `.mjs` preset and checks the files it wrote: the
 * stylesheet holds a utility from Tailwind's own sheet, the focus ring the preset names, a theme colour and the
 * typography class the cover title uses, and the bundle names no workspace package. No Vite, React or oxide is
 * installed there, so any import of them from the bundled command would fail the run.
 *
 * `DS_SMOKE_TAILWIND` picks the `tailwindcss` release (unset or empty: the one this repo resolved); CI runs the floor and
 * the current release. The scratch directory is removed in every case.
 */
import { spawnSync } from "node:child_process";
import {
  existsSync,
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
const fixture = join(root, "src/__integration__/__fixtures__/ds-build");

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
 * @param {string} file - Absolute path
 * @returns {Record<string, string>} The parsed JSON
 */
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));

/**
 * Print an error and exit 1. Never called inside the `try` below: it would skip `finally`.
 * @param {string} message - What went wrong
 * @returns {never} Never returns
 */
const fail = (message) => {
  console.error(`ds-build-smoke: ${message}`);
  process.exit(1);
};

/**
 * Run Node with `args` in `cwd` with the allow-listed environment.
 * @param {string[]} args - Arguments after the node executable
 * @param {string} cwd - Working directory
 * @returns {number} Exit status (1 when the process did not start)
 */
const node = (args, cwd) =>
  spawnSync(process.execPath, args, {
    cwd,
    env: childEnv,
    stdio: "inherit",
  }).status ?? 1;

if (!existsSync(join(root, "dist")))
  fail("dist/ does not exist; run `yarn build:all` first");
const yarnPath = /^yarnPath:\s*(\S+)\s*$/m.exec(
  readFileSync(join(root, ".yarnrc.yml"), "utf8"),
)?.[1];
if (yarnPath === undefined) fail(".yarnrc.yml has no yarnPath");
const yarn = join(root, yarnPath ?? "");

const requested = process.env.DS_SMOKE_TAILWIND;
const tailwindcss =
  requested === undefined || requested === ""
    ? readJson(join(root, "node_modules", "tailwindcss", "package.json"))
        .version
    : requested;

/** What the stylesheet must select: Tailwind's own utility, the preset's focus ring, a theme colour, the title class. */
const EXPECTED_SELECTORS = [
  [".inline-flex", "a utility from Tailwind's sheet"],
  [String.raw`.focus-visible\:outline-focus`, "the preset's focus ring"],
  [".bg-primary", "a theme colour utility"],
  [".text-16-regular", "a typography class"],
];
/** Packages a product that installs only `tailwindcss` must not need. */
const ABSENT = [
  "vite",
  "react",
  "@tailwindcss/oxide",
  "class-variance-authority",
];

const scratch = mkdtempSync(join(realpathSync(tmpdir()), "sg-ds-build-"));
const problems = [];
try {
  if (
    node(
      [yarn, "pack", "--out", join(scratch, "style-generator.tgz")],
      root,
    ) !== 0
  ) {
    problems.push("yarn pack failed");
  } else {
    writeFileSync(join(scratch, "yarn.lock"), "");
    writeFileSync(
      join(scratch, ".yarnrc.yml"),
      'nodeLinker: node-modules\nenableScripts: false\nenableTelemetry: false\nnpmRegistryServer: "https://registry.npmjs.org"\n',
    );
    writeFileSync(
      join(scratch, "package.json"),
      `${JSON.stringify(
        {
          name: "ds-build-smoke",
          private: true,
          type: "module",
          dependencies: {
            "@duydpdev/style-generator": "file:./style-generator.tgz",
            tailwindcss,
          },
        },
        null,
        2,
      )}\n`,
    );
    for (const file of ["theme.json", "style-gen.config.json"])
      writeFileSync(
        join(scratch, file),
        readFileSync(join(fixture, file), "utf8"),
      );
    // The fixture preset is TypeScript: `as const` is its only type syntax.
    writeFileSync(
      join(scratch, "ds.preset.mjs"),
      readFileSync(join(fixture, "ds.preset.ts"), "utf8").replaceAll(
        " as const",
        "",
      ),
    );
    if (node([yarn, "install"], scratch) !== 0) {
      problems.push("yarn install in the scratch project failed");
    } else {
      for (const name of ABSENT)
        if (existsSync(join(scratch, "node_modules", name)))
          problems.push(
            `${name} was installed; the product needs only tailwindcss`,
          );
      const out = join(scratch, "ds");
      const status = node(
        [
          join(
            scratch,
            "node_modules/@duydpdev/style-generator/dist/cli/index.mjs",
          ),
          "ds",
          "build",
          "--theme",
          "theme.json",
          "--config",
          "style-gen.config.json",
          "--preset",
          "ds.preset.mjs",
          "--namespace",
          "Fixture",
          "--out",
          out,
        ],
        scratch,
      );
      if (status !== 0) problems.push(`style-gen ds build exited ${status}`);
      else {
        const css = readFileSync(join(out, "components/bundle.css"), "utf8");
        for (const [selector, what] of EXPECTED_SELECTORS)
          if (!css.includes(selector))
            problems.push(`bundle.css has no ${what} (\`${selector}\`)`);
        const bundle = readFileSync(join(out, "components/bundle.js"), "utf8");
        if (bundle.includes("design-system-example"))
          problems.push("bundle.js names the design-system-example package");
        const stamp = readJson(join(out, "ds-stamp.json"));
        if (!stamp.tailwindVersion || stamp.tailwindVersion === "unknown")
          problems.push("ds-stamp.json does not name the tailwindcss version");
      }
    }
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
if (problems.length > 0) fail(problems.join("\n  "));
console.log(
  `✓ ds-build: style-gen ds build works with tailwindcss@${tailwindcss} as the only peer`,
);
