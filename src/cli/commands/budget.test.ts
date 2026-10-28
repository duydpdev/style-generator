import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";

import { logger } from "../logger";

import { budgetCommand } from "./budget";

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

describe("budgetCommand", () => {
  let dir: string;
  let logSpy: MockInstance<typeof logger.log>;
  let errorSpy: MockInstance<typeof logger.error>;

  // Every line the command logged through `logger.log`.
  const logged = (): string => logSpy.mock.calls.map(String).join("\n");

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "css-budget-"));
    logSpy = vi.spyOn(logger, "log").mockImplementation(() => undefined);
    errorSpy = vi.spyOn(logger, "error").mockImplementation(() => undefined);
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("returns 0 and reports the headroom when under the budget", () => {
    const css = cssOf(1, 200);
    writeFileSync(join(dir, "app.css"), css);
    const gzip = gzipSync(css).length;

    const code = budgetCommand(
      { target: "app.css", maxGzip: String(gzip + 100) },
      dir,
    );

    expect(code).toBe(0);
    expect(logged()).toContain(
      `OK: ${String(gzip)} B gzip across 1 file(s), budget ${String(gzip + 100)} B (100 B headroom)`,
    );
  });

  it("returns 0 exactly at the budget and 1 one byte over it", () => {
    const css = cssOf(2, 200);
    writeFileSync(join(dir, "app.css"), css);
    const gzip = gzipSync(css).length;

    expect(
      budgetCommand({ target: "app.css", maxGzip: String(gzip) }, dir),
    ).toBe(0);
    expect(
      budgetCommand({ target: "app.css", maxGzip: String(gzip - 1) }, dir),
    ).toBe(1);
    expect(logged()).toContain("OVER BUDGET: ");
    expect(logged()).toContain("(1 B over)");
  });

  it("sums gzip across every .css file in a directory tree and ignores other files", () => {
    const a = cssOf(3, 150);
    const b = cssOf(4, 150);
    mkdirSync(join(dir, "nested"));
    writeFileSync(join(dir, "a.css"), a);
    writeFileSync(join(dir, "nested", "b.css"), b);
    writeFileSync(join(dir, "ignored.js"), cssOf(5, 500));
    const sum = gzipSync(a).length + gzipSync(b).length;

    expect(budgetCommand({ target: ".", maxGzip: String(sum) }, dir)).toBe(0);
    expect(logged()).toContain("across 2 file(s)");
    // Either file alone fits under `sum`, so only the summed total can fail.
    expect(budgetCommand({ target: ".", maxGzip: String(sum - 1) }, dir)).toBe(
      1,
    );
  });

  it("lists each file with its own gzip size, sorted by name", () => {
    writeFileSync(join(dir, "b.css"), cssOf(6, 20));
    writeFileSync(join(dir, "a.css"), cssOf(7, 20));

    budgetCommand({ target: ".", maxGzip: "100000" }, dir);

    const lines = logSpy.mock.calls.map(String);
    expect(lines[0]).toContain(join(dir, "a.css"));
    expect(lines[1]).toContain(join(dir, "b.css"));
  });

  it.each([
    ["no target", { maxGzip: "10" }],
    ["missing --max-gzip", { target: "app.css" }],
    ["non-numeric --max-gzip", { target: "app.css", maxGzip: "1e3" }],
    ["negative --max-gzip", { target: "app.css", maxGzip: "-5" }],
  ])("returns 2 on %s", (_label, args) => {
    writeFileSync(join(dir, "app.css"), cssOf(8, 10));

    expect(budgetCommand(args, dir)).toBe(2);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it("returns 2 when the target has no CSS or does not exist", () => {
    writeFileSync(join(dir, "note.txt"), "not css");

    expect(budgetCommand({ target: ".", maxGzip: "100000" }, dir)).toBe(2);
    expect(errorSpy).toHaveBeenLastCalledWith(
      expect.stringContaining("No .css files found"),
    );
    expect(budgetCommand({ target: "missing", maxGzip: "1" }, dir)).toBe(2);
    expect(errorSpy).toHaveBeenLastCalledWith(
      expect.stringMatching(/^Cannot read missing: /),
    );
  });
});
