import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "..", "..");
const repoPkg = JSON.parse(
  readFileSync(join(repoRoot, "package.json"), "utf8"),
) as {
  exports: Record<string, unknown>;
  dependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
};

type Gate = "check-externals" | "check-sizes" | "check-browser-safe";

/** Export names as the gates derive them (`.` → `index`, `./vite` → `vite`). */
const exportNames = Object.keys(repoPkg.exports)
  .filter((key) => key !== "./package.json")
  .map((key) => (key === "." ? "index" : key.replace(/^\.\//, "")));

/**
 * Write `content` to `<root>/<rel>`, creating parent directories.
 * @param {string} root - Fixture root
 * @param {string} rel - Root-relative file path
 * @param {string} content - File contents
 */
function put(root: string, rel: string, content: string) {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), content);
}

/**
 * Write a bundle file plus a sourcemap listing `sources`.
 * @param {string} root - Fixture root
 * @param {string} rel - Root-relative bundle path
 * @param {string} code - Bundle source
 * @param {string[]} sources - Sourcemap `sources`
 */
function bundle(root: string, rel: string, code: string, sources: string[]) {
  put(root, rel, code);
  put(root, `${rel}.map`, JSON.stringify({ version: 3, sources }));
}

/**
 * A minimal build the three gates accept: every subpath in both formats, the
 * CLI bundle, sourcemaps that only list project sources, the repo's
 * dependency lists.
 * @param {string} root - Fixture root
 */
function writeCleanBuild(root: string) {
  put(
    root,
    "package.json",
    JSON.stringify({
      exports: repoPkg.exports,
      dependencies: repoPkg.dependencies,
      peerDependencies: repoPkg.peerDependencies,
    }),
  );
  for (const name of exportNames) {
    bundle(root, `dist/${name}.js`, `export const ${name} = 1;\n`, [
      `../src/exports/${name}.ts`,
    ]);
    bundle(root, `dist/${name}.cjs`, `exports.${name} = 1;\n`, [
      `../src/exports/${name}.ts`,
    ]);
  }
  bundle(
    root,
    "dist/cli/index.mjs",
    '#!/usr/bin/env node\nimport { z } from "zod";\n',
    ["../../src/cli/index.ts"],
  );
}

/**
 * Run a publish gate against the fixture. The gates resolve the repo root
 * from their own location, so the script is copied to `<root>/scripts/`.
 * @param {string} root - Fixture root
 * @param {Gate} gate - Script name without extension
 * @returns {{ status: number | null, output: string }} Exit code and combined stdout/stderr
 */
function runGate(root: string, gate: Gate) {
  const copy = join(root, "scripts", `${gate}.mjs`);
  mkdirSync(dirname(copy), { recursive: true });
  copyFileSync(join(repoRoot, "scripts", `${gate}.mjs`), copy);
  const result = spawnSync(process.execPath, [copy], { encoding: "utf8" });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

/**
 * Incompressible text: random hex carries 4 bits per character, so gzip
 * cannot shrink it much below half its length.
 * @param {number} bytes - Length of the returned string
 * @returns {string} Random hex string
 */
const noise = (bytes: number) => randomBytes(bytes / 2).toString("hex");

describe("integration: publish gates reject bad builds", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "style-gen-gates-"));
    writeCleanBuild(dir);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it.each<Gate>(["check-externals", "check-sizes", "check-browser-safe"])(
    "%s passes on the clean fixture build",
    (gate) => {
      expect(runGate(dir, gate).status).toBe(0);
    },
  );

  describe("check-externals", () => {
    it("fails when a shared chunk's sourcemap lists a dependency's source", () => {
      bundle(dir, "dist/generate-abc123.js", "export const g = 1;\n", [
        "../src/core/generate.ts",
        "../node_modules/zod/v4/classic/schemas.js",
      ]);

      const { status, output } = runGate(dir, "check-externals");

      expect(status).toBe(1);
      expect(output).toContain("dist/generate-abc123.js.map");
      expect(output).toContain("node_modules/zod/v4/classic/schemas.js");
    });

    it("fails when the CLI bundle inlines a scoped dependency (Yarn cache path)", () => {
      bundle(dir, "dist/cli/index.mjs", "#!/usr/bin/env node\n", [
        "../../src/cli/index.ts",
        "../../.yarn/cache/@clack-prompts-npm-1.1.0-0a.zip/node_modules/@clack/prompts/dist/index.mjs",
      ]);

      const { status, output } = runGate(dir, "check-externals");

      expect(status).toBe(1);
      expect(output).toContain("node_modules/@clack/prompts/dist/index.mjs");
    });

    it("fails when a sourcemap lists a devDependency's source (any node_modules path, not only dependencies)", () => {
      bundle(dir, "dist/recipes.js", "export const recipes = 1;\n", [
        "../src/exports/recipes.ts",
        "../node_modules/class-variance-authority/dist/index.mjs",
      ]);

      const { status, output } = runGate(dir, "check-externals");

      expect(status).toBe(1);
      expect(output).toContain("dist/recipes.js.map");
      expect(output).toContain(
        "node_modules/class-variance-authority/dist/index.mjs",
      );
    });

    it("fails when a bundle ships without a sourcemap", () => {
      put(dir, "dist/helpers-xyz.js", "export const h = 1;\n");

      const { status, output } = runGate(dir, "check-externals");

      expect(status).toBe(1);
      expect(output).toContain("dist/helpers-xyz.js has no sourcemap");
    });

    it("fails when the CLI bundle is missing", () => {
      rmSync(join(dir, "dist/cli"), { recursive: true });

      const { status, output } = runGate(dir, "check-externals");

      expect(status).toBe(1);
      expect(output).toContain("Missing build artifact: dist/cli/index.mjs");
    });
  });

  describe("check-sizes", () => {
    it("fails when an export has no budget", () => {
      const pkgPath = join(dir, "package.json");
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
        exports: Record<string, unknown>;
      };
      pkg.exports["./extra"] = { import: "./dist/extra.js" };
      writeFileSync(pkgPath, JSON.stringify(pkg));
      put(dir, "dist/extra.js", "export const extra = 1;\n");

      const { status, output } = runGate(dir, "check-sizes");

      expect(status).toBe(1);
      expect(output).toContain("no size budget configured for export: extra");
    });

    it("fails when a chunk imported by an entry pushes it over budget", () => {
      put(dir, "dist/tokens.js", 'export * from "./shared-big.js";\n');
      put(dir, "dist/shared-big.js", `export const s = "${noise(8_000)}";\n`);

      const { status, output } = runGate(dir, "check-sizes");

      expect(status).toBe(1);
      expect(output).toMatch(
        /✗ dist\/tokens\.js: \d+B gzip transitive \(entry \d+B, 2 files\)/,
      );
    });

    it("fails when the CLI bundle exceeds its budget", () => {
      put(dir, "dist/cli/index.mjs", `const s = "${noise(200_000)}";\n`);

      const { status, output } = runGate(dir, "check-sizes");

      expect(status).toBe(1);
      expect(output).toContain("✗ dist/cli/index.mjs");
    });

    it("fails when the CLI bundle is missing", () => {
      rmSync(join(dir, "dist/cli"), { recursive: true });

      const { status, output } = runGate(dir, "check-sizes");

      expect(status).toBe(1);
      expect(output).toContain("missing: dist/cli/index.mjs");
    });
  });

  describe("check-browser-safe", () => {
    it("fails when a browser-safe entry reaches Zod through a shared chunk", () => {
      put(dir, "dist/tokens.js", 'import { h } from "./helpers-q.js";\n');
      put(dir, "dist/helpers-q.js", 'import { z } from "zod";\n');

      const { status, output } = runGate(dir, "check-browser-safe");

      expect(status).toBe(1);
      expect(output).toContain(
        "forbidden import chain: dist/tokens.js -> dist/helpers-q.js -> zod",
      );
    });

    it("fails when a CJS browser-safe entry requires a Node builtin", () => {
      put(dir, "dist/cva.cjs", 'const fs = require("node:fs");\n');

      const { status, output } = runGate(dir, "check-browser-safe");

      expect(status).toBe(1);
      expect(output).toContain(
        "forbidden import chain: dist/cva.cjs -> node:fs",
      );
    });

    it("fails when a browser-safe entry imports @tailwindcss/*", () => {
      put(dir, "dist/spacing.js", 'import "@tailwindcss/node";\n');

      const { status, output } = runGate(dir, "check-browser-safe");

      expect(status).toBe(1);
      expect(output).toContain("dist/spacing.js -> @tailwindcss/node");
    });

    it.each([
      ["chokidar", 'import { watch } from "chokidar";\n'],
      ["chokidar/handler.js", 'import "chokidar/handler.js";\n'],
      ["@clack/prompts", 'import * as p from "@clack/prompts";\n'],
    ])("fails when a shared chunk reaches %s", (specifier, chunk) => {
      put(dir, "dist/tokens.js", 'import { h } from "./helpers-q.js";\n');
      put(dir, "dist/helpers-q.js", chunk);

      const { status, output } = runGate(dir, "check-browser-safe");

      expect(status).toBe(1);
      expect(output).toContain(
        `forbidden import chain: dist/tokens.js -> dist/helpers-q.js -> ${specifier}`,
      );
    });

    it("does not forbid a bare import whose name merely starts with a dependency's name", () => {
      put(
        dir,
        "dist/cva.js",
        'import "chokidar-fake";\nimport "@clack/other";\n',
      );

      expect(runGate(dir, "check-browser-safe").status).toBe(0);
    });
  });
});
