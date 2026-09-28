import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { schemaCommand } from "./schema";

describe("schemaCommand", () => {
  let tmp: string;
  let origCwd: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "style-gen-schema-"));
    origCwd = process.cwd();
    process.chdir(tmp);
  });

  afterEach(() => {
    process.chdir(origCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("writes theme.schema.json by default, matching ThemeSchema's JSON Schema", () => {
    schemaCommand({});

    const outPath = path.join(tmp, "theme.schema.json");
    expect(fs.existsSync(outPath)).toBe(true);

    const schema: unknown = JSON.parse(fs.readFileSync(outPath, "utf8"));
    expect(schema).toMatchObject({
      type: "object",
      additionalProperties: false,
      required: ["colors"],
    });
  });

  it("writes to a custom --out path, creating parent directories", () => {
    schemaCommand({ out: "generated/theme.schema.json" });

    const outPath = path.join(tmp, "generated/theme.schema.json");
    expect(fs.existsSync(outPath)).toBe(true);
  });
});
