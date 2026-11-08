#!/usr/bin/env node
/**
 * Next.js build smoke: `styleGenNext` (`./next`) inside a real `next build`,
 * the way a consumer wires it. Needs dist/ (`yarn build:all`), the repo's
 * node_modules and network access (Next and the peers come from the npm
 * registry).
 *
 * Packs the repo root with the repo's own Yarn release, creates a scratch
 * project in the OS temp directory (lifecycle scripts off, public npm
 * registry), writes the documented `next.config.ts` (`documents/reference/cli.md`,
 * `#### Next.js`), runs `style-gen init --dark` there (stack detection must
 * print the `styleGenNext` snippet; `init` writes no `styles/theme.css`),
 * then runs `next build`. The CSS the build ships can only come from
 * `styleGenNext` reading `style-gen.config.json` in the
 * `phase-production-build` phase. Only the default bundler (Turbopack) runs:
 * `styleGenNext` has no bundler hook, it emits while Next loads the config,
 * so `--webpack` would retest Next's PostCSS path, not this package.
 * `next.config.ts` is transpiled to CommonJS, so `./next` resolves through
 * the `require` condition (`dist/next.cjs`, `require(esm)` of chokidar): CI
 * runs this on the Node engines floor. The scratch directory is removed in
 * every case; the exit code is 0 only when every check passed.
 */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  realpathSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** The Next.js release the smoke builds with; bump it by hand to move the check forward. */
const NEXT_VERSION = "16.4.5";

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
  NEXT_TELEMETRY_DISABLED: "1",
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
  console.error(`next-build-smoke: ${message}`);
  process.exit(1);
};

/**
 * Run Node with `args` in `cwd` with the allow-listed environment.
 * @param {string[]} args - Arguments after the node executable
 * @param {string} cwd - Working directory
 * @param {boolean} [capture] - Return stdout instead of inheriting stdio
 * @returns {{ status: number, stdout: string }} Exit status (1 when the process did not start) and captured stdout
 */
const node = (args, cwd, capture = false) => {
  const result = spawnSync(process.execPath, args, {
    cwd,
    env: childEnv,
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
  });
  return { status: result.status ?? 1, stdout: result.stdout ?? "" };
};

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

/**
 * Every file below `dir` whose name ends with `extension`, concatenated.
 * @param {string} dir - Absolute directory
 * @param {string} extension - File name suffix, such as `.css`
 * @returns {string} The text ("" when `dir` does not exist)
 */
const filesBelow = (dir, extension) =>
  existsSync(dir)
    ? readdirSync(dir, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
        .map((entry) =>
          readFileSync(join(entry.parentPath, entry.name), "utf8"),
        )
        .join("\n")
    : "";

if (!existsSync(join(root, "dist")))
  fail("dist/ does not exist; run `yarn build:all` first");
const yarnPath = /^yarnPath:\s*(\S+)\s*$/m.exec(
  readFileSync(join(root, ".yarnrc.yml"), "utf8"),
)?.[1];
if (yarnPath === undefined) fail(".yarnrc.yml has no yarnPath");
const yarn = join(root, yarnPath);

const tailwind = installed("tailwindcss");
const manifest = {
  name: "next-build-smoke",
  private: true,
  type: "module",
  dependencies: {
    "@duydpdev/style-generator": "file:./style-generator.tgz",
    // Released in lockstep with tailwindcss.
    "@tailwindcss/postcss": tailwind,
    next: NEXT_VERSION,
    react: installed("react"),
    "react-dom": installed("react-dom"),
    tailwindcss: tailwind,
  },
  devDependencies: Object.fromEntries(
    ["@types/node", "@types/react", "@types/react-dom", "typescript"].map(
      (name) => [name, installed(name)],
    ),
  ),
};

const files = {
  ".gitignore": "node_modules\n.next\n",
  // documents/reference/cli.md, `#### Next.js`.
  "next.config.ts": `import type { NextConfig } from "next";
import { styleGenNext } from "@duydpdev/style-generator/next";

const nextConfig: NextConfig = {
  /* config options here */
};

// No arguments: reads style-gen.config.json (theme, output, options).
export default styleGenNext()(nextConfig);
`,
  "postcss.config.mjs": `export default { plugins: { "@tailwindcss/postcss": {} } };
`,
  "app/globals.css": `@import "tailwindcss";
@import "../styles/theme.css";
`,
  "app/layout.tsx": `import type { ReactNode } from "react";
import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`,
  "app/page.tsx": `export default function Page() {
  return <main className="bg-primary text-secondary">style-gen</main>;
}
`,
};

/**
 * What the shipped CSS must contain: the theme variables, the page's theme
 * utilities and the dark axis override, each only present when `styleGenNext`
 * wrote `styles/theme.css` before Tailwind compiled `app/globals.css`.
 */
const EXPECTED_CSS = [
  ["--sg-color-primary", "theme variable"],
  [".bg-primary", "bg-primary utility"],
  [".text-secondary", "text-secondary utility"],
  ["data-theme", "html[data-theme] dark override"],
];

const scratch = mkdtempSync(join(realpathSync(tmpdir()), "sg-next-build-"));
const problems = [];
// `fail()` exits immediately, which would skip `finally`: record the problems
// and exit once the scratch directory is removed (scripts/check-types-pack.mjs).
try {
  if (
    node([yarn, "pack", "--out", join(scratch, "style-generator.tgz")], root)
      .status !== 0
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
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    for (const [file, content] of Object.entries(files)) {
      mkdirSync(dirname(join(scratch, file)), { recursive: true });
      writeFileSync(join(scratch, file), content);
    }
    const bin = (pkg, path) => join(scratch, "node_modules", pkg, path);
    if (node([yarn, "install"], scratch).status !== 0) {
      problems.push("yarn install in the scratch project failed");
    } else if (
      !readdirSync(join(scratch, "node_modules", "@next")).some((name) =>
        name.startsWith(`swc-${process.platform}-${process.arch}`),
      )
    ) {
      // Without it Next downloads a WASM fallback that Turbopack cannot use.
      problems.push(
        `no native @next/swc-${process.platform}-${process.arch}* binding was installed`,
      );
    } else {
      const themeCss = join(scratch, "styles", "theme.css");
      const init = node(
        [
          bin("@duydpdev/style-generator", "dist/cli/index.mjs"),
          "init",
          "--dark",
        ],
        scratch,
        true,
      );
      process.stdout.write(init.stdout);
      if (init.status !== 0) problems.push("style-gen init failed");
      else if (!init.stdout.includes("styleGenNext()"))
        problems.push(
          "init next to next.config.ts printed no styleGenNext() snippet",
        );
      else if (existsSync(themeCss))
        problems.push(
          "init wrote styles/theme.css; only the build may write it",
        );
      else if (
        node([bin("next", "dist/bin/next"), "build"], scratch).status !== 0
      )
        problems.push("next build failed");
      else if (!existsSync(themeCss))
        problems.push(
          "next build did not write styles/theme.css (styleGenNext, phase-production-build)",
        );
      else {
        const emitted = readFileSync(themeCss, "utf8");
        for (const needle of ["@theme inline", "--sg-color-primary"]) {
          if (!emitted.includes(needle))
            problems.push(`styles/theme.css has no \`${needle}\``);
        }
        const css = filesBelow(join(scratch, ".next", "static"), ".css");
        for (const [needle, what] of EXPECTED_CSS) {
          if (!css.includes(needle))
            problems.push(
              `the CSS under .next/static has no ${what} (\`${needle}\`)`,
            );
        }
        if (
          !filesBelow(
            join(scratch, ".next", "server", "app"),
            ".html",
          ).includes('class="bg-primary text-secondary"')
        )
          problems.push(
            "the prerendered page has no bg-primary text-secondary",
          );
      }
    }
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
if (problems.length > 0) fail(problems.join("\n  "));
console.log(
  `✓ next-build: next@${NEXT_VERSION} (Turbopack) builds with styleGenNext() and ships the theme CSS`,
);
