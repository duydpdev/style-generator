import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, it, expect, afterEach } from "vitest";

import { resolveProjectPath } from "./resolveProjectPath";

describe("resolveProjectPath", () => {
  it("resolves a plain relative path inside root", () => {
    const root = "/project";
    expect(resolveProjectPath(root, "./theme.json", "themePath")).toBe(
      "/project/theme.json",
    );
    expect(resolveProjectPath(root, "sub/theme.json", "themePath")).toBe(
      "/project/sub/theme.json",
    );
  });

  it("rejects `..` traversal above root", () => {
    const root = "/project";
    expect(() =>
      resolveProjectPath(root, "../theme.json", "themePath"),
    ).toThrow(/themePath escapes project root: \.\.\/theme\.json/);
    expect(() =>
      resolveProjectPath(root, "../../theme.json", "themePath"),
    ).toThrow(/escapes project root/);
  });

  it("rejects an absolute path outside root", () => {
    const root = "/project";
    expect(() => resolveProjectPath(root, "/etc/passwd", "themePath")).toThrow(
      /escapes project root/,
    );
  });

  it("rejects root resolved as its own parent (rel === '..')", () => {
    expect(() => resolveProjectPath("/project/sub", "..", "outDir")).toThrow(
      /escapes project root/,
    );
  });

  it("allows an absolute path that IS inside root", () => {
    expect(
      resolveProjectPath("/project", "/project/theme.json", "themePath"),
    ).toBe("/project/theme.json");
  });

  describe("normalisation of absolute inputs", () => {
    it("collapses `..`, `.` and doubled separators in an absolute path inside root", () => {
      expect(
        resolveProjectPath("/project", "/project/a/../b//./theme.json", "t"),
      ).toBe("/project/b/theme.json");
    });

    it("gives the same result for every spelling of one file (usable as a key)", () => {
      const spellings = [
        "styles/theme.json",
        "./styles/theme.json",
        "styles//theme.json",
        "styles/../styles/theme.json",
        "/project/styles/theme.json",
        "/project/x/../styles/./theme.json",
      ];
      const resolved = new Set(
        spellings.map((s) => resolveProjectPath("/project", s, "t")),
      );
      expect([...resolved]).toEqual(["/project/styles/theme.json"]);
    });

    it("judges containment on the normalised path: an absolute path that climbs out is rejected", () => {
      expect(() =>
        resolveProjectPath("/project", "/project/../etc/theme.json", "t"),
      ).toThrow(/t escapes project root: \/project\/\.\.\/etc\/theme\.json/);
      expect(() =>
        resolveProjectPath("/project", "/project/a/../../etc", "t"),
      ).toThrow(/escapes project root/);
    });

    it("an absolute path that climbs out and back in is accepted, normalised", () => {
      expect(
        resolveProjectPath("/project", "/project/../project/theme.json", "t"),
      ).toBe("/project/theme.json");
    });

    it("normalises with allowOutsideRoot too", () => {
      expect(
        resolveProjectPath("/project", "/shared/a/../theme.json", "t", {
          allowOutsideRoot: true,
        }),
      ).toBe("/shared/theme.json");
    });
  });

  it("does not rewrite a leading slash into a relative path (4.x did)", () => {
    // `/styles/theme.json` is the absolute filesystem path it says it is:
    // outside the root, so rejected; with `allowOutsideRoot` it is returned as is.
    expect(() =>
      resolveProjectPath("/project", "/styles/theme.json", "themePath"),
    ).toThrow(/escapes project root/);
    expect(
      resolveProjectPath("/project", "/styles/theme.json", "themePath", {
        allowOutsideRoot: true,
      }),
    ).toBe("/styles/theme.json");
  });

  describe("allowOutsideRoot", () => {
    it("accepts `..` traversal and an absolute path outside root", () => {
      const opts = { allowOutsideRoot: true };
      expect(
        resolveProjectPath("/project/app", "../shared/theme.json", "t", opts),
      ).toBe("/project/shared/theme.json");
      expect(resolveProjectPath("/project", "/etc/theme.json", "t", opts)).toBe(
        "/etc/theme.json",
      );
    });

    it("still resolves a relative path against root", () => {
      expect(
        resolveProjectPath("/project", "sub/theme.json", "t", {
          allowOutsideRoot: true,
        }),
      ).toBe("/project/sub/theme.json");
    });

    it("`allowOutsideRoot: false` behaves like no option", () => {
      expect(() =>
        resolveProjectPath("/project", "../x", "t", {
          allowOutsideRoot: false,
        }),
      ).toThrow(/escapes project root/);
    });
  });

  describe("sibling directory whose name starts with dots", () => {
    let root: string;

    afterEach(() => {
      if (root) rmSync(root, { recursive: true, force: true });
    });

    it("allows a `..foo` sibling dir inside root (not `..` traversal)", () => {
      root = mkdtempSync(join(tmpdir(), "resolve-project-path-"));
      mkdirSync(join(root, "..foo"));

      expect(resolveProjectPath(root, "..foo/theme.json", "themePath")).toBe(
        join(root, "..foo", "theme.json"),
      );
    });
  });
});
