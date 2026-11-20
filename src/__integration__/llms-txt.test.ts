import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { writeTmpFile } from "./__fixtures__/tmpProject";

const repoRoot = join(__dirname, "..", "..");

const meta = {
  "documents/b.md": {
    slug: "second",
    title: "Second",
    group: "Start",
    order: 2,
    vi: { title: "Thứ hai" },
  },
  "README.md": {
    slug: "introduction",
    title: "Introduction",
    group: "Start",
    order: 1,
    vi: { title: "Giới thiệu" },
  },
  "documents/c.md": {
    slug: "reference-c",
    title: "C",
    group: "Reference",
    order: 1,
    vi: { title: "C" },
  },
};

/**
 * Run `site/scripts/build-llms.mjs` with explicit paths.
 * @param {string} metaFile - Docs meta fixture
 * @param {string} outFile - Output path
 * @returns {{ status: number | null, output: string }} Exit code and combined stdout/stderr
 */
function run(metaFile: string, outFile: string) {
  const result = spawnSync(
    process.execPath,
    [
      join(repoRoot, "site", "scripts", "build-llms.mjs"),
      "--meta",
      metaFile,
      "--out",
      outFile,
    ],
    { encoding: "utf8" },
  );
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

describe(
  "integration: site/scripts/build-llms.mjs",
  { timeout: 60_000 },
  () => {
    let dir = "";
    beforeEach(() => {
      dir = mkdtempSync(join(tmpdir(), "style-gen-llms-"));
    });
    afterEach(() => {
      rmSync(dir, { recursive: true, force: true });
    });

    it("writes the index: description, groups in first-seen order, entries by order", () => {
      const metaFile = writeTmpFile(dir, "meta.json", meta);
      const outFile = join(dir, "out", "llms.txt");
      mkdirSync(join(dir, "out"));
      const result = run(metaFile, outFile);
      expect(result.status).toBe(0);

      const pkg = JSON.parse(
        readFileSync(join(repoRoot, "package.json"), "utf8"),
      ) as { description: string };
      const description = pkg.description;
      const lines = readFileSync(outFile, "utf8").split("\n");
      expect(lines[0]).toBe("# @duydpdev/style-generator");
      expect(description.length).toBeGreaterThan(0);
      expect(lines[2]).toBe(`> ${description}`);
      expect(lines[4]).toBe(
        "Site: https://duydpdev.github.io/style-generator/",
      );
      expect(lines.filter((line) => line.startsWith("## "))).toEqual([
        "## Start",
        "## Reference",
      ]);
      expect(lines.filter((line) => line.startsWith("- ["))).toEqual([
        "- [Introduction](https://raw.githubusercontent.com/duydpdev/style-generator/main/README.md): https://duydpdev.github.io/style-generator/docs/introduction",
        "- [Second](https://raw.githubusercontent.com/duydpdev/style-generator/main/documents/b.md): https://duydpdev.github.io/style-generator/docs/second",
        "- [C](https://raw.githubusercontent.com/duydpdev/style-generator/main/documents/c.md): https://duydpdev.github.io/style-generator/docs/reference-c",
      ]);
      expect(readFileSync(outFile, "utf8")).not.toContain("Thứ hai");
    });

    it("fails when the output directory does not exist", () => {
      const metaFile = writeTmpFile(dir, "meta.json", meta);
      const result = run(metaFile, join(dir, "missing", "llms.txt"));
      expect(result.status).toBe(1);
      expect(result.output).toContain(
        `build-llms: ${join(dir, "missing")} does not exist; run vite build first`,
      );
    });
  },
);
