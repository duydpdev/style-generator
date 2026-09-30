import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

const script = join(__dirname, "..", "..", "scripts", "check-css-budget.mjs");

/**
 * Runs `check-css-budget.mjs` with the given CLI args.
 * @param {string[]} args - CLI arguments passed to the script
 * @returns {{ status: number | null, output: string }} Exit code and combined stdout/stderr
 */
function runBudget(...args: string[]) {
  const result = spawnSync(process.execPath, [script, ...args], {
    encoding: "utf8",
  });
  return {
    status: result.status,
    output: `${result.stdout}${result.stderr}`,
  };
}

/**
 * Deterministic, poorly compressible CSS so gzip sizes are far from trivial.
 * @param {number} seed - LCG seed
 * @param {number} rules - Number of rules to emit
 * @returns {string} CSS text
 */
function cssOf(seed: number, rules: number): string {
  let state = seed;
  let css = "";
  for (let i = 0; i < rules; i++) {
    state = (state * 1103515245 + 12345) % 2147483648;
    css += `.c${String(i)}{color:#${state.toString(16).padStart(6, "0").slice(0, 6)}}`;
  }
  return css;
}

describe("integration: scripts/check-css-budget.mjs", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "css-budget-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("exits 0 when the gzip size is under the budget", () => {
    const css = cssOf(1, 200);
    const file = join(dir, "app.css");
    writeFileSync(file, css);
    const gzip = gzipSync(css).length;

    const result = runBudget(file, "--max-gzip", String(gzip + 100));

    expect(result.status).toBe(0);
    expect(result.output).toContain("OK");
  });

  it("exits 0 exactly at the budget and 1 one byte over it", () => {
    const css = cssOf(2, 200);
    const file = join(dir, "app.css");
    writeFileSync(file, css);
    const gzip = gzipSync(css).length;

    expect(runBudget(file, "--max-gzip", String(gzip)).status).toBe(0);
    const over = runBudget(file, "--max-gzip", String(gzip - 1));
    expect(over.status).toBe(1);
    expect(over.output).toContain("OVER BUDGET");
  });

  it("sums gzip across every .css file in a directory tree and ignores other files", () => {
    const a = cssOf(3, 150);
    const b = cssOf(4, 150);
    mkdirSync(join(dir, "nested"));
    writeFileSync(join(dir, "a.css"), a);
    writeFileSync(join(dir, "nested", "b.css"), b);
    writeFileSync(join(dir, "ignored.js"), cssOf(5, 500));
    const sum = gzipSync(a).length + gzipSync(b).length;

    expect(runBudget(dir, "--max-gzip", String(sum)).status).toBe(0);
    // Either file alone fits under `sum`, so only the summed total can fail.
    expect(runBudget(dir, "--max-gzip", String(sum - 1)).status).toBe(1);
  });

  it.each([
    ["missing --max-gzip", (file: string) => [file]],
    ["non-numeric --max-gzip", (file: string) => [file, "--max-gzip", "1e3"]],
    ["negative --max-gzip", (file: string) => [file, "--max-gzip", "-5"]],
  ])("exits 2 on %s", (_label, build) => {
    const file = join(dir, "app.css");
    writeFileSync(file, cssOf(6, 10));

    expect(runBudget(...build(file)).status).toBe(2);
  });

  it("exits 2 when the target has no CSS or does not exist", () => {
    writeFileSync(join(dir, "note.txt"), "not css");

    expect(runBudget(dir, "--max-gzip", "100000").status).toBe(2);
    expect(runBudget(join(dir, "missing"), "--max-gzip", "1").status).toBe(2);
  });
});
