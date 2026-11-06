import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { writeTmpFile } from "./__fixtures__/tmpProject";

describe("writeTmpFile", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "sg-tmp-project-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("creates the missing parent folders and returns the absolute path", () => {
    const abs = writeTmpFile(root, "a/b/c.txt", "x");

    expect(abs).toBe(join(root, "a", "b", "c.txt"));
    expect(readFileSync(abs, "utf8")).toBe("x");
  });

  it("writes a string verbatim", () => {
    const abs = writeTmpFile(root, "t.css", '{ "a": 1 }\n');

    expect(readFileSync(abs, "utf8")).toBe('{ "a": 1 }\n');
  });

  it("writes an object as compact JSON", () => {
    const abs = writeTmpFile(root, "theme.json", { colors: { a: "#fff" } });

    expect(readFileSync(abs, "utf8")).toBe('{"colors":{"a":"#fff"}}');
  });
});
