import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { logger } from "../logger";

import { schemaCommand } from "./schema";

describe("schemaCommand", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "style-gen-schema-"));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("writes theme.schema.json to the configured theme's directory by default", () => {
    fs.mkdirSync(path.join(tmp, "custom"), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, "style-gen.config.json"),
      JSON.stringify({ theme: "custom/theme.json" }),
    );

    expect(schemaCommand({}, tmp)).toBe(0);

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
    expect(schemaCommand({ out: "generated/theme.schema.json" }, tmp)).toBe(0);

    expect(fs.existsSync(path.join(tmp, "generated/theme.schema.json"))).toBe(
      true,
    );
  });

  it("returns 1 and writes nothing when the config file has schema issues", () => {
    fs.writeFileSync(
      path.join(tmp, "style-gen.config.json"),
      JSON.stringify({ theme: "custom/theme.json", breakpoint: ["xl"] }),
    );
    const errorSpy = vi
      .spyOn(logger, "error")
      .mockImplementation(() => undefined);

    expect(schemaCommand({}, tmp)).toBe(1);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^Invalid config \(style-gen\.config\.json\):/),
    );
    expect(fs.existsSync(path.join(tmp, "custom"))).toBe(false);
    expect(fs.existsSync(path.join(tmp, "styles"))).toBe(false);
  });

  it("returns 1 when --out escapes the project root", () => {
    const errorSpy = vi
      .spyOn(logger, "error")
      .mockImplementation(() => undefined);

    expect(schemaCommand({ out: "../elsewhere/theme.schema.json" }, tmp)).toBe(
      1,
    );

    expect(errorSpy).toHaveBeenCalledWith(
      "--out escapes project root: ../elsewhere/theme.schema.json",
    );
    expect(fs.existsSync(path.join(tmp, "..", "elsewhere"))).toBe(false);
  });

  it("treats a leading-slash theme as the absolute path it says it is, so the derived schema target escapes the root", () => {
    fs.writeFileSync(
      path.join(tmp, "style-gen.config.json"),
      JSON.stringify({ theme: "/custom/theme.json" }),
    );
    const errorSpy = vi
      .spyOn(logger, "error")
      .mockImplementation(() => undefined);

    expect(schemaCommand({}, tmp)).toBe(1);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringMatching(
        /^schema output escapes project root: .*\n💡 Pass --out/,
      ),
    );
    expect(fs.existsSync(path.join(tmp, "custom"))).toBe(false);
  });
});
