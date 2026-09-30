import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, it, expect, afterEach } from "vitest";

import { resolveSafePath } from "./resolveSafePath";

describe("resolveSafePath", () => {
  it("resolves a plain relative path inside root", () => {
    const root = "/project";
    expect(resolveSafePath(root, "./theme.json", "themePath")).toBe(
      "/project/theme.json",
    );
    expect(resolveSafePath(root, "sub/theme.json", "themePath")).toBe(
      "/project/sub/theme.json",
    );
  });

  it("rejects `..` traversal above root", () => {
    const root = "/project";
    expect(() => resolveSafePath(root, "../theme.json", "themePath")).toThrow(
      /escapes project root/,
    );
    expect(() =>
      resolveSafePath(root, "../../theme.json", "themePath"),
    ).toThrow(/escapes project root/);
  });

  it("rejects an absolute path outside root", () => {
    const root = "/project";
    expect(() => resolveSafePath(root, "/etc/passwd", "themePath")).toThrow(
      /escapes project root/,
    );
  });

  it("rejects root itself resolved as its own parent (rel === '..')", () => {
    expect(() => resolveSafePath("/project/sub", "..", "outDir")).toThrow(
      /escapes project root/,
    );
  });

  it("allows an absolute path that IS inside root", () => {
    const root = "/project";
    expect(resolveSafePath(root, "/project/theme.json", "themePath")).toBe(
      "/project/theme.json",
    );
  });

  describe("sibling directory whose name starts with dots", () => {
    let root: string;

    afterEach(() => {
      if (root) rmSync(root, { recursive: true, force: true });
    });

    it("allows a `..foo` sibling dir inside root (not `..` traversal)", () => {
      root = mkdtempSync(join(tmpdir(), "resolve-safe-path-"));
      mkdirSync(join(root, "..foo"));

      expect(resolveSafePath(root, "..foo/theme.json", "themePath")).toBe(
        join(root, "..foo", "theme.json"),
      );
    });
  });
});
