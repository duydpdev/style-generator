import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { writeTmpFile } from "./__fixtures__/tmpProject";

const script = join(__dirname, "..", "..", "scripts", "check-comments.mjs");

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "check-comments-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

/**
 * @param {string[]} extra - Arguments after `--root <fixture>`
 * @returns {{ status: number | null, out: string }} Exit status and merged output
 */
function run(extra: string[] = []) {
  const result = spawnSync(
    process.execPath,
    [script, "--root", root, ...extra],
    { encoding: "utf8" },
  );
  return { status: result.status, out: result.stdout + result.stderr };
}

/**
 * @param {number} lines - Total lines of the block, delimiters included
 * @returns {string} A JSDoc block of that many lines
 */
const jsdoc = (lines: number) =>
  ["/**", ...Array.from({ length: lines - 2 }, () => " * text"), " */"].join(
    "\n",
  );

/**
 * @param {number} lines - Number of consecutive `//` lines
 * @returns {string} A comment run of that length
 */
const commentRun = (lines: number) =>
  Array.from({ length: lines }, () => "// text").join("\n");

/**
 * @param {number} count - Number of declarations
 * @returns {string} That many one-line exports
 */
const codeLines = (count: number) =>
  Array.from(
    { length: count },
    (_, i) => "export const v" + String(i) + " = 1;",
  ).join("\n");

/**
 * @param {string} comment - Comment placed above the declaration
 * @returns {string} A source file that is mostly code, so the ratio passes
 */
const withCode = (comment: string) => `${comment}\n${codeLines(60)}\n`;

describe("check-comments", () => {
  it("accepts an 8-line JSDoc block and rejects a 9-line one", () => {
    writeTmpFile(root, "src/a.ts", withCode(jsdoc(8)));
    expect(run().status).toBe(0);

    writeTmpFile(root, "src/a.ts", withCode(jsdoc(9)));
    const result = run();
    expect(result.status).toBe(1);
    expect(result.out).toContain("src/a.ts:1: JSDoc block of 9 lines (max 8)");
  });

  it("accepts a 3-line comment run and rejects a 4-line one", () => {
    writeTmpFile(root, "src/a.ts", withCode(commentRun(3)));
    expect(run().status).toBe(0);

    writeTmpFile(root, "src/a.ts", withCode(commentRun(4)));
    const result = run();
    expect(result.status).toBe(1);
    expect(result.out).toContain("src/a.ts:1: comment run of 4 lines (max 3)");
  });

  it("ignores // and /* inside string, template and regex literals", () => {
    writeTmpFile(
      root,
      "src/a.ts",
      withCode(
        'export const url = "https://example.com//a//b//c//d";\nexport const re = /\\/\\/\\//;\nexport const t = `// x\n// y\n// z\n// w`;',
      ),
    );
    expect(run().status).toBe(0);
  });

  it("fails when comment-only lines reach 20% of all lines", () => {
    const body = [commentRun(3), "export const a = 1;"].join("\n");
    writeTmpFile(
      root,
      "src/a.ts",
      Array.from({ length: 4 }, () => body).join("\n"),
    );
    const result = run();
    expect(result.status).toBe(1);
    expect(result.out).toContain("comment-only lines are");
  });

  it("passes when the ratio stays under 20%", () => {
    const comment = "// one\n";
    const code = codeLines(9);
    writeTmpFile(root, "src/a.ts", `${comment}${code}\n`);
    expect(run().status).toBe(0);
  });

  it("skips tests, type tests, declarations and __integration__", () => {
    for (const name of [
      "src/a.test.ts",
      "src/a.test-d.ts",
      "src/a.d.ts",
      "src/__integration__/a.ts",
    ])
      writeTmpFile(root, name, withCode(jsdoc(20)));
    writeTmpFile(root, "src/real.ts", withCode(jsdoc(3)));
    const result = run();
    expect(result.status).toBe(0);
    expect(result.out).toContain("1 files");
  });

  it("limits the scan to --dirs and leaves other folders unchecked", () => {
    writeTmpFile(root, "src/core/a.ts", withCode(jsdoc(3)));
    writeTmpFile(root, "src/node/b.ts", withCode(jsdoc(12)));
    expect(run(["--dirs", "src/core"]).status).toBe(0);
    expect(run(["--dirs", "src/node"]).status).toBe(1);
    expect(run(["--dirs", "src/core,src/node"]).status).toBe(1);
  });

  it("prints ratio, longest and per-group numbers with --report and exits 0", () => {
    writeTmpFile(root, "src/core/a.ts", withCode(jsdoc(12)));
    const result = run(["--report"]);
    expect(result.status).toBe(0);
    expect(result.out).toMatch(/^ratio: \d+\.\d%$/m);
    expect(result.out).toContain("longest: 12");
    expect(result.out).toContain("violations: 1");
    expect(result.out).toMatch(/^src\/core: ratio /m);
  });

  it("counts a block comment that starts after code on the same line", () => {
    writeTmpFile(
      root,
      "src/a.ts",
      `export const first = 1; /* a\n b\n c\n d */\n${codeLines(60)}\n`,
    );
    const result = run();
    expect(result.status).toBe(1);
    expect(result.out).toContain("src/a.ts:1: comment run of 4 lines (max 3)");

    writeTmpFile(
      root,
      "src/a.ts",
      `export const first = 1; /* a\n b\n c */\n${codeLines(60)}\n`,
    );
    expect(run().status).toBe(0);
  });

  it("exits 2 when the scope holds no checked file", () => {
    writeTmpFile(root, "src/only.test.ts", withCode(jsdoc(3)));
    const result = run();
    expect(result.status).toBe(2);
    expect(result.out).toContain("no checked .ts files");
  });

  it("exits 2 when a --dirs path does not exist", () => {
    const result = run(["--dirs", "src/missing"]);
    expect(result.status).toBe(2);
    expect(result.out).toContain("check-comments:");
  });
});
