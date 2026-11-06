import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { writeFileAtomic } from "./writeFileAtomic";

describe("writeFileAtomic", () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "write-atomic-"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("replaces an existing file and leaves no temp file behind", () => {
    const target = path.join(dir, "theme.css");
    fs.writeFileSync(target, "old");

    writeFileAtomic(target, "new");

    expect(fs.readFileSync(target, "utf8")).toBe("new");
    expect(fs.readdirSync(dir)).toEqual(["theme.css"]);
  });

  it("keeps the previous contents and removes the temp file when the rename fails", () => {
    const target = path.join(dir, "theme.css");
    fs.writeFileSync(target, "old");
    vi.spyOn(fs, "renameSync").mockImplementation(() => {
      throw new Error("EXDEV");
    });

    expect(() => {
      writeFileAtomic(target, "new");
    }).toThrow("EXDEV");

    expect(fs.readFileSync(target, "utf8")).toBe("old");
    expect(fs.readdirSync(dir)).toEqual(["theme.css"]);
  });

  it("stages the temp file in the target's own directory (same filesystem)", () => {
    const target = path.join(dir, "theme.css");
    const renameSpy = vi.spyOn(fs, "renameSync");

    writeFileAtomic(target, "x");

    const [from, to] = renameSpy.mock.calls[0] ?? [];
    expect(path.dirname(String(from))).toBe(dir);
    expect(to).toBe(target);
  });
});
