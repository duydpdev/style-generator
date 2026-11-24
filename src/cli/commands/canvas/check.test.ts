import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";

import { writeTmpFile } from "../../../__integration__/__fixtures__/tmpProject";
import defaultManifest from "../../canvas/design-canvas-standard.json";
import { logger } from "../../logger";
import { runCli } from "../../run";

const repoRoot = join(__dirname, "..", "..", "..", "..");
const BROKEN = join(repoRoot, "src/__integration__/__fixtures__/canvas-broken");
const BROKEN_THEME = join(BROKEN, "theme.json");

describe("style-gen canvas check", () => {
  let dir: string;
  let logSpy: MockInstance<(msg: string) => void>;
  let errorSpy: MockInstance<(msg: string) => void>;
  const stdout = (): string[] => logSpy.mock.calls.map((c) => c[0]);
  const stderr = (): string => errorSpy.mock.calls.map((c) => c[0]).join("\n");
  const canvas = (...args: string[]) =>
    runCli(["canvas", "check", ...args], dir);

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "sg-canvas-check-"));
    mkdirSync(join(dir, "canvas"));
    writeTmpFile(dir, "theme.json", { colors: { primary: "#000" } });
    logSpy = vi.spyOn(logger, "log").mockImplementation(() => undefined);
    errorSpy = vi.spyOn(logger, "error").mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(dir, { recursive: true, force: true });
  });

  describe("exit 0", () => {
    it("prints OK with the file count, resolving paths against the cwd", async () => {
      writeTmpFile(
        dir,
        "canvas/a.css",
        ".a { color: var(--sg-color-primary); }",
      );
      expect(await canvas("--canvas", "canvas", "--theme", "theme.json")).toBe(
        0,
      );
      expect(stdout()).toEqual(["OK: 1 files"]);
    });

    it("prints the inventory without --theme", async () => {
      writeTmpFile(
        dir,
        "canvas/a.css",
        ".a { color: var(--sg-color-primary); }",
      );
      expect(await canvas("--inventory", "--canvas", "canvas")).toBe(0);
      const inventory = JSON.parse(stdout().join("\n")) as { files: number };
      expect(inventory.files).toBe(1);
    });
  });

  describe("exit 1", () => {
    it("knows the variables of every registry category with a CSS variable", async () => {
      writeTmpFile(dir, "theme.json", {
        colors: { primary: "#000" },
        motionDuration: { fast: "150ms", slow: "0.4s" },
        motionEasing: { standard: "ease-out", emphasized: "ease-in" },
        controlHeight: { sm: "32px", md: "40px" },
        iconSize: { sm: "16px", md: "20px" },
        opacity: { muted: 0.64, disabled: 0.4 },
        zIndex: { overlay: 40, modal: 50 },
      });
      writeTmpFile(
        dir,
        "canvas/a.css",
        [
          ".a { transition: opacity var(--sg-duration-fast) var(--sg-ease-standard); }",
          ".b { height: var(--sg-control-md); width: var(--sg-icon-sm); }",
          ".c { opacity: var(--sg-opacity-muted); z-index: var(--sg-z-modal); }",
          ".d { z-index: var(--sg-z-nope); }",
        ].join("\n"),
      );
      expect(await canvas("--canvas", "canvas", "--theme", "theme.json")).toBe(
        1,
      );
      expect(stdout()).toEqual([
        "a.css:4 unknown token --sg-z-nope",
        "1 violation(s)",
      ]);
    });

    it("prints every violation, then the count", async () => {
      const args = ["--canvas", BROKEN, "--theme", BROKEN_THEME];
      expect(await canvas(...args, "--naming", "--boards")).toBe(1);
      const lines = stdout();
      expect(lines).toContain(
        "cl-moi.dc.html:1 cl-* boards are retired (split into one c-* board per component)",
      );
      expect(lines.at(-1)).toBe(`${String(lines.length - 1)} violation(s)`);
    });

    it("reports an empty canvas under --boards", async () => {
      const args = ["--canvas", "canvas", "--theme", "theme.json", "--boards"];
      expect(await canvas(...args)).toBe(1);
      expect(stdout()).toContain("no .dc.html files under canvas");
    });
  });

  describe("exit 2", () => {
    it.each([
      ["an unknown flag", ["check", "--nope"]],
      ["a missing check", ["--canvas", "canvas", "--theme", "theme.json"]],
      ["another subcommand", ["run", "--canvas", "canvas"]],
      ["a missing --canvas", ["check", "--theme", "theme.json"]],
      ["a missing --theme", ["check", "--canvas", "canvas"]],
      ["a flag without its value", ["check", "--canvas"]],
      [
        "a malformed --ds-version",
        [
          "check",
          "--canvas",
          "canvas",
          "--theme",
          "theme.json",
          "--ds-version",
          "x",
        ],
      ],
    ])("for %s", async (_label, args) => {
      expect(await runCli(["canvas", ...args], dir)).toBe(2);
      const result = /^(?:\d+ violation\(s\)|OK: \d+ files)$/;
      expect(stdout().filter((line) => result.test(line))).toEqual([]);
    });

    it("names an unreadable theme", async () => {
      expect(await canvas("--canvas", "canvas", "--theme", "nope.json")).toBe(
        2,
      );
      expect(stderr()).toBe("nope.json: cannot read (ENOENT)");
    });

    it("names a canvas that is not a directory", async () => {
      expect(
        await canvas("--canvas", "theme.json", "--theme", "theme.json"),
      ).toBe(2);
      expect(stderr()).toContain(": cannot read (ENOTDIR)");
    });

    it("names a truncated canvas.json", async () => {
      writeTmpFile(dir, "canvas/a.dc.html", "<p>x</p>");
      writeTmpFile(dir, "canvas/canvas.json", '{"pages": [');
      const args = ["--canvas", "canvas", "--theme", "theme.json", "--boards"];
      expect(await canvas(...args)).toBe(2);
      expect(stderr()).toMatch(/canvas\.json: cannot parse \(/);
    });

    it("names the missing key of an invalid --standard", async () => {
      const older: Record<string, unknown> = { ...defaultManifest };
      delete older.dsComponents;
      writeTmpFile(dir, "standard.json", older);
      const args = ["--canvas", "canvas", "--theme", "theme.json"];
      expect(await canvas(...args, "--standard", "standard.json")).toBe(2);
      expect(stderr()).toMatch(/^standard\.json: dsComponents /);
    });
  });

  it("skips the content rule for a --standard without content", async () => {
    const older: Record<string, unknown> = { ...defaultManifest };
    delete older.content;
    delete older.provenanceBoard;
    writeTmpFile(dir, "standard.json", older);
    const args = ["--canvas", BROKEN, "--theme", BROKEN_THEME, "--boards"];
    expect(await canvas(...args)).toBe(1);
    const all = stdout().join("\n");
    expect(all).toMatch(/missing section|provenance/);
    logSpy.mockClear();
    expect(await canvas(...args, "--standard", "standard.json")).toBe(1);
    const older_ = stdout().join("\n");
    expect(older_).not.toMatch(/missing section|literal |provenance/);
    expect(older_).toContain("cl-* boards are retired");
  });
});
