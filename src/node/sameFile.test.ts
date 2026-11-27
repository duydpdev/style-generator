import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isCaseInsensitiveDir, sameFile } from "./sameFile";

/**
 * Swap the case of every letter.
 * @param {string} name - A file name
 * @returns {string} The name with its case flipped
 */
const flipCase = (name: string): string =>
  name.replace(/\p{L}/gu, (char) =>
    char === char.toLowerCase() ? char.toUpperCase() : char.toLowerCase(),
  );

/**
 * Whether this machine's temp filesystem ignores case (an independent probe).
 * @returns {boolean} True on a case-insensitive filesystem
 */
const probeTmp = (): boolean => {
  const dir = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "style-gen-same-probe-")),
  );
  try {
    return fs.existsSync(
      path.join(path.dirname(dir), flipCase(path.basename(dir))),
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

const caseInsensitiveTmp = probeTmp();

describe("sameFile", () => {
  let root: string;

  beforeEach(() => {
    root = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), "style-gen-same-file-")),
    );
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  const at = (...parts: string[]): string => path.join(root, ...parts);

  it("treats `./a` and `a` as one file", () => {
    expect(sameFile(`${root}/./a.json`, `${root}/a.json`)).toBe(true);
    expect(sameFile(`${root}/x/../a.json`, at("a.json"))).toBe(true);
  });

  it("resolves a relative path against the working directory", () => {
    expect(
      sameFile(path.relative(process.cwd(), at("a.json")), at("a.json")),
    ).toBe(true);
  });

  it("returns true early for equal strings, whatever the filesystem says (A14)", () => {
    const stat = vi.spyOn(fs, "statSync");
    expect(sameFile(at("never", "a.json"), at("never", "a.json"))).toBe(true);
    expect(stat).not.toHaveBeenCalled();
  });

  it("tells two different existing files apart", () => {
    fs.writeFileSync(at("a.json"), "{}");
    fs.writeFileSync(at("b.json"), "{}");

    expect(sameFile(at("a.json"), at("b.json"))).toBe(false);
  });

  it("calls a path that exists and one that does not different files", () => {
    fs.writeFileSync(at("a.json"), "{}");

    expect(sameFile(at("a.json"), at("b.json"))).toBe(false);
    expect(sameFile(at("b.json"), at("a.json"))).toBe(false);
  });

  it("follows a symlinked directory, for existing and for new files (M1, L3)", () => {
    fs.mkdirSync(at("real"));
    fs.symlinkSync(at("real"), at("link"));
    fs.writeFileSync(at("real", "a.json"), "{}");

    expect(sameFile(at("link", "a.json"), at("real", "a.json"))).toBe(true);
    expect(sameFile(at("link", "new.json"), at("real", "new.json"))).toBe(true);
    expect(sameFile(at("link", "new.json"), at("real", "other.json"))).toBe(
      false,
    );
  });

  it("sees a hard link as the same file", () => {
    fs.writeFileSync(at("a.json"), "{}");
    fs.linkSync(at("a.json"), at("b.json"));

    expect(sameFile(at("a.json"), at("b.json"))).toBe(true);
  });

  it("falls back to the canonical path when an inode number is unknown (A14)", () => {
    fs.mkdirSync(at("real"));
    fs.symlinkSync(at("real"), at("link"));
    fs.writeFileSync(at("real", "a.json"), "{}");
    fs.writeFileSync(at("real", "b.json"), "{}");
    const original = fs.statSync;
    vi.spyOn(fs, "statSync").mockImplementation(
      (file: fs.PathLike, options?: fs.StatSyncOptions) => {
        const stats = original(file, options) as fs.BigIntStats | undefined;
        return stats === undefined ? stats : Object.assign(stats, { ino: 0n });
      },
    );

    expect(sameFile(at("link", "a.json"), at("real", "a.json"))).toBe(true);
    expect(sameFile(at("real", "a.json"), at("real", "b.json"))).toBe(false);
  });

  describe("two paths that do not exist", () => {
    it("are different files when only the case differs and the filesystem is case-sensitive", () => {
      expect(
        sameFile(at("Theme.json"), at("theme.json"), {
          caseInsensitive: () => false,
        }),
      ).toBe(false);
    });

    it("are the same file when only the case differs and the filesystem ignores case", () => {
      const probe = vi.fn(() => true);

      expect(
        sameFile(at("Theme.json"), at("theme.json"), {
          caseInsensitive: probe,
        }),
      ).toBe(true);
      // The probe is asked about the deepest ancestor that exists.
      expect(probe).toHaveBeenCalledWith(root);
    });

    it("are different files when the names differ by more than case", () => {
      const probe = vi.fn(() => true);

      expect(
        sameFile(at("a.json"), at("b.json"), { caseInsensitive: probe }),
      ).toBe(false);
      expect(probe).not.toHaveBeenCalled();
    });

    it.skipIf(!caseInsensitiveTmp)(
      "differ in case only: the same file on this case-insensitive filesystem (M1)",
      () => {
        expect(sameFile(at("Theme.json"), at("theme.json"))).toBe(true);
        expect(sameFile(at("styles", "Out.ts"), at("styles", "OUT.ts"))).toBe(
          true,
        );
      },
    );

    it.skipIf(caseInsensitiveTmp)(
      "differ in case only: different files on this case-sensitive filesystem",
      () => {
        expect(sameFile(at("Theme.json"), at("theme.json"))).toBe(false);
      },
    );
  });

  it.skipIf(!caseInsensitiveTmp)(
    "sees an existing file reached by a different case as one file (M1)",
    () => {
      fs.writeFileSync(at("theme.json"), "{}");

      expect(sameFile(at("Theme.json"), at("theme.json"))).toBe(true);
    },
  );
});

describe("isCaseInsensitiveDir", () => {
  it("reads the filesystem of the directory, not the platform", () => {
    const dir = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), "style-gen-same-dir-")),
    );
    try {
      expect(isCaseInsensitiveDir(dir)).toBe(caseInsensitiveTmp);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reads a basename without a letter as case-sensitive", () => {
    expect(isCaseInsensitiveDir(path.parse(process.cwd()).root)).toBe(false);
  });
});
