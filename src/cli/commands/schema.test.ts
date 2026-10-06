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

  it("writes theme.schema.json to the configured theme's directory by default", () => {
    fs.mkdirSync(path.join(tmp, "custom"), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, "style-gen.config.json"),
      JSON.stringify({ theme: "custom/theme.json" }),
    );

    schemaCommand({});

    const outPath = path.join(tmp, "custom/theme.schema.json");
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

  it("exits with code 1 and writes nothing when the config file has schema issues", () => {
    fs.writeFileSync(
      path.join(tmp, "style-gen.config.json"),
      JSON.stringify({ theme: "custom/theme.json", breakpoint: ["xl"] }),
    );
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const origExitCode = process.exitCode;

    try {
      schemaCommand({});
      expect(process.exitCode).toBe(1);
    } finally {
      process.exitCode = origExitCode;
    }
    expect(fs.existsSync(path.join(tmp, "custom"))).toBe(false);
    expect(fs.existsSync(path.join(tmp, "styles"))).toBe(false);
  });

  it("keeps a leading-slash theme path inside the project, like generate", () => {
    fs.writeFileSync(
      path.join(tmp, "style-gen.config.json"),
      JSON.stringify({ theme: "/custom/theme.json" }),
    );

    schemaCommand({});

    expect(fs.existsSync(path.join(tmp, "custom/theme.schema.json"))).toBe(
      true,
    );
  });
});
