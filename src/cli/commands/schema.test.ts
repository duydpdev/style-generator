import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { buildConfigJsonSchema } from "../configJsonSchema";
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

  // C-L6: an invalid config is when an upgrader needs the config schema most.
  it("returns 1 and writes the config schema but no theme schema when the config file has schema issues", () => {
    fs.writeFileSync(
      path.join(tmp, "style-gen.config.json"),
      JSON.stringify({ theme: "custom/theme.json", extraSources: ["x"] }),
    );
    const errorSpy = vi
      .spyOn(logger, "error")
      .mockImplementation(() => undefined);

    expect(schemaCommand({}, tmp)).toBe(1);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^Invalid config \(style-gen\.config\.json\):/),
    );
    expect(
      JSON.parse(
        fs.readFileSync(path.join(tmp, "style-gen.config.schema.json"), "utf8"),
      ),
    ).toEqual(buildConfigJsonSchema());
    expect(fs.existsSync(path.join(tmp, "custom"))).toBe(false);
    expect(fs.existsSync(path.join(tmp, "styles"))).toBe(false);
  });

  it("writes the config schema and warns when the config file is not valid JSON", () => {
    fs.writeFileSync(path.join(tmp, "style-gen.config.json"), "{ not json");
    const warnSpy = vi
      .spyOn(logger, "warn")
      .mockImplementation(() => undefined);

    expect(schemaCommand({}, tmp)).toBe(0);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringMatching(
        /^Ignoring style-gen\.config\.json is not valid JSON/,
      ),
    );
    expect(fs.existsSync(path.join(tmp, "styles/theme.schema.json"))).toBe(
      true,
    );
    expect(fs.existsSync(path.join(tmp, "style-gen.config.schema.json"))).toBe(
      true,
    );
  });

  it("writes both schemas with --out even when the config has a removed key (init merges it afterwards)", () => {
    fs.writeFileSync(
      path.join(tmp, "style-gen.config.json"),
      JSON.stringify({ plugin: "plugins/theme-plugin.ts" }),
    );

    expect(schemaCommand({ out: "styles/theme.schema.json" }, tmp)).toBe(0);

    expect(fs.existsSync(path.join(tmp, "styles/theme.schema.json"))).toBe(
      true,
    );
    expect(fs.existsSync(path.join(tmp, "style-gen.config.schema.json"))).toBe(
      true,
    );
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

  describe("config schema", () => {
    it("writes style-gen.config.schema.json in the project root by default", () => {
      expect(schemaCommand({ out: "custom/theme.schema.json" }, tmp)).toBe(0);

      const written: unknown = JSON.parse(
        fs.readFileSync(path.join(tmp, "style-gen.config.schema.json"), "utf8"),
      );
      expect(written).toEqual(buildConfigJsonSchema());
      expect(written).toMatchObject({
        type: "object",
        additionalProperties: false,
      });
      expect(written).toHaveProperty("properties.$schema");
    });

    it("writes the config schema to --config-out, creating parent directories", () => {
      expect(
        schemaCommand(
          { out: "t.schema.json", configOut: "custom/c.json" },
          tmp,
        ),
      ).toBe(0);

      expect(fs.existsSync(path.join(tmp, "custom/c.json"))).toBe(true);
      expect(
        fs.existsSync(path.join(tmp, "style-gen.config.schema.json")),
      ).toBe(false);
    });

    it("returns 1 and writes nothing when --config-out escapes the project root", () => {
      const errorSpy = vi
        .spyOn(logger, "error")
        .mockImplementation(() => undefined);

      expect(
        schemaCommand({ out: "t.schema.json", configOut: "../x.json" }, tmp),
      ).toBe(1);

      expect(errorSpy).toHaveBeenCalledWith(
        "--config-out escapes project root: ../x.json",
      );
      expect(fs.existsSync(path.join(tmp, "t.schema.json"))).toBe(false);
      expect(fs.existsSync(path.join(tmp, "..", "x.json"))).toBe(false);
    });
  });

  // C-L7: a target that is another target, or the theme file itself, would
  // overwrite one document with the other.
  describe("target collisions", () => {
    it("returns 1 and writes nothing when --out and --config-out are the same file", () => {
      const errorSpy = vi
        .spyOn(logger, "error")
        .mockImplementation(() => undefined);

      expect(
        schemaCommand(
          { out: "gen/x.json", configOut: "./gen/../gen/x.json" },
          tmp,
        ),
      ).toBe(1);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining("--out and --config-out"),
      );
      expect(fs.existsSync(path.join(tmp, "gen"))).toBe(false);
    });

    it.each([
      ["--out", { out: "styles/theme.json" }],
      [
        "--config-out",
        { out: "t.schema.json", configOut: "styles/theme.json" },
      ],
    ])("returns 1 and keeps the theme file when %s names it", (flag, args) => {
      fs.mkdirSync(path.join(tmp, "styles"));
      fs.writeFileSync(path.join(tmp, "styles/theme.json"), '{"colors":{}}');
      const errorSpy = vi
        .spyOn(logger, "error")
        .mockImplementation(() => undefined);

      expect(schemaCommand(args, tmp)).toBe(1);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining(`${flag} would overwrite the theme file`),
      );
      expect(fs.readFileSync(path.join(tmp, "styles/theme.json"), "utf8")).toBe(
        '{"colors":{}}',
      );
      expect(fs.existsSync(path.join(tmp, "t.schema.json"))).toBe(false);
      expect(
        fs.existsSync(path.join(tmp, "style-gen.config.schema.json")),
      ).toBe(false);
    });

    it("returns 1 when a theme named theme.schema.json would receive its own schema", () => {
      fs.writeFileSync(
        path.join(tmp, "style-gen.config.json"),
        JSON.stringify({ theme: "theme.schema.json" }),
      );
      fs.writeFileSync(path.join(tmp, "theme.schema.json"), '{"colors":{}}');
      vi.spyOn(logger, "error").mockImplementation(() => undefined);

      expect(schemaCommand({}, tmp)).toBe(1);

      expect(fs.readFileSync(path.join(tmp, "theme.schema.json"), "utf8")).toBe(
        '{"colors":{}}',
      );
    });

    // M2a: the theme stays protected when the config cannot be merged.
    it("returns 1 and keeps the theme a config with issues declares when --out names it (M2a)", () => {
      fs.mkdirSync(path.join(tmp, "custom"));
      fs.writeFileSync(path.join(tmp, "custom/theme.json"), '{"colors":{}}');
      fs.writeFileSync(
        path.join(tmp, "style-gen.config.json"),
        JSON.stringify({ theme: "custom/theme.json", extraSources: ["x"] }),
      );
      const errorSpy = vi
        .spyOn(logger, "error")
        .mockImplementation(() => undefined);

      expect(schemaCommand({ out: "custom/theme.json" }, tmp)).toBe(1);

      expect(errorSpy).toHaveBeenCalledWith(
        "--out would overwrite the theme file: custom/theme.json",
      );
      expect(fs.readFileSync(path.join(tmp, "custom/theme.json"), "utf8")).toBe(
        '{"colors":{}}',
      );
      expect(
        fs.existsSync(path.join(tmp, "style-gen.config.schema.json")),
      ).toBe(false);
    });

    it("returns 1 and keeps the default theme when the config is malformed and --out names it (M2a)", () => {
      fs.mkdirSync(path.join(tmp, "styles"));
      fs.writeFileSync(path.join(tmp, "styles/theme.json"), '{"colors":{}}');
      fs.writeFileSync(path.join(tmp, "style-gen.config.json"), "{ not json");
      vi.spyOn(logger, "warn").mockImplementation(() => undefined);
      const errorSpy = vi
        .spyOn(logger, "error")
        .mockImplementation(() => undefined);

      expect(schemaCommand({ out: "styles/theme.json" }, tmp)).toBe(1);

      expect(errorSpy).toHaveBeenCalledWith(
        "--out would overwrite the theme file: styles/theme.json",
      );
      expect(fs.readFileSync(path.join(tmp, "styles/theme.json"), "utf8")).toBe(
        '{"colors":{}}',
      );
    });

    it("returns 1 and keeps the declared theme when --config-out names it and the config has issues (M2a)", () => {
      fs.mkdirSync(path.join(tmp, "custom"));
      fs.writeFileSync(path.join(tmp, "custom/theme.json"), '{"colors":{}}');
      fs.writeFileSync(
        path.join(tmp, "style-gen.config.json"),
        JSON.stringify({ theme: "custom/theme.json", extraSources: ["x"] }),
      );
      vi.spyOn(logger, "error").mockImplementation(() => undefined);

      expect(
        schemaCommand(
          { out: "t.schema.json", configOut: "custom/theme.json" },
          tmp,
        ),
      ).toBe(1);

      expect(fs.readFileSync(path.join(tmp, "custom/theme.json"), "utf8")).toBe(
        '{"colors":{}}',
      );
    });

    it("returns 1 and keeps the theme when --out reaches it through a symlinked directory", () => {
      fs.mkdirSync(path.join(tmp, "styles"));
      fs.writeFileSync(path.join(tmp, "styles/theme.json"), '{"colors":{}}');
      fs.symlinkSync(path.join(tmp, "styles"), path.join(tmp, "link"));
      vi.spyOn(logger, "error").mockImplementation(() => undefined);

      expect(schemaCommand({ out: "link/theme.json" }, tmp)).toBe(1);

      expect(fs.readFileSync(path.join(tmp, "styles/theme.json"), "utf8")).toBe(
        '{"colors":{}}',
      );
    });

    // M2b: the config files are protected too.
    it.each([
      ["--config-out", { configOut: "style-gen.config.json" }],
      ["--config-out", { configOut: "package.json" }],
      ["--out", { out: "style-gen.config.json" }],
      ["--out", { out: "package.json" }],
    ])(
      "returns 1 and keeps the config when %s names it (M2b)",
      (flag, args) => {
        fs.writeFileSync(
          path.join(tmp, "style-gen.config.json"),
          '{"theme":"styles/theme.json"}',
        );
        fs.writeFileSync(path.join(tmp, "package.json"), '{"name":"app"}');
        const errorSpy = vi
          .spyOn(logger, "error")
          .mockImplementation(() => undefined);

        expect(schemaCommand(args, tmp)).toBe(1);

        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining(`${flag} would overwrite the config file`),
        );
        expect(
          fs.readFileSync(path.join(tmp, "style-gen.config.json"), "utf8"),
        ).toBe('{"theme":"styles/theme.json"}');
        expect(fs.readFileSync(path.join(tmp, "package.json"), "utf8")).toBe(
          '{"name":"app"}',
        );
      },
    );

    it("protects package.json even when it holds no style-gen section (M2b)", () => {
      fs.writeFileSync(path.join(tmp, "package.json"), '{"name":"app"}');
      vi.spyOn(logger, "error").mockImplementation(() => undefined);

      expect(schemaCommand({ out: "package.json" }, tmp)).toBe(1);

      expect(fs.readFileSync(path.join(tmp, "package.json"), "utf8")).toBe(
        '{"name":"app"}',
      );
    });

    it("warns about a malformed config with --out too, and still writes", () => {
      fs.writeFileSync(path.join(tmp, "style-gen.config.json"), "{ not json");
      const warnSpy = vi
        .spyOn(logger, "warn")
        .mockImplementation(() => undefined);

      expect(schemaCommand({ out: "gen/theme.schema.json" }, tmp)).toBe(0);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /^Ignoring style-gen\.config\.json is not valid JSON/,
        ),
      );
      expect(fs.existsSync(path.join(tmp, "gen/theme.schema.json"))).toBe(true);
    });
  });

  describe('"$schema" in style-gen.config.json', () => {
    const POINTER = "./style-gen.config.schema.json";
    const configFile = (): string => path.join(tmp, "style-gen.config.json");
    const read = (): string => fs.readFileSync(configFile(), "utf8");
    const silenceInfo = () =>
      vi.spyOn(logger, "info").mockImplementation(() => undefined);

    it("inserts one line after the opening brace and keeps every other byte", () => {
      silenceInfo();
      const before =
        '{\n  "theme": "styles/theme.json",\n  "breakpoints": ["md", "lg"]\n}\n';
      fs.writeFileSync(configFile(), before);

      expect(schemaCommand({}, tmp)).toBe(0);

      expect(read()).toBe(
        before.replace("{\n", `{\n  "$schema": "${POINTER}",\n`),
      );
    });

    it("follows the file's CRLF line ending and indent", () => {
      silenceInfo();
      const before =
        '{\r\n    "theme": "styles/theme.json",\r\n    "breakpoints": ["md", "lg"]\r\n}\r\n';
      fs.writeFileSync(configFile(), before);

      expect(schemaCommand({}, tmp)).toBe(0);

      expect(read()).toBe(
        before.replace("{\r\n", `{\r\n    "$schema": "${POINTER}",\r\n`),
      );
    });

    it.each([
      ["{}", `{\n  "$schema": "${POINTER}"\n}`],
      ["{}\n", `{\n  "$schema": "${POINTER}"\n}\n`],
    ])("fills the empty object %j", (before, after) => {
      silenceInfo();
      fs.writeFileSync(configFile(), before);

      expect(schemaCommand({}, tmp)).toBe(0);

      expect(read()).toBe(after);
      expect(JSON.parse(read())).toEqual({ $schema: POINTER });
    });

    it("points at the --config-out target", () => {
      silenceInfo();
      fs.writeFileSync(configFile(), '{\n  "theme": "styles/theme.json"\n}\n');

      expect(schemaCommand({ configOut: "schemas/c.json" }, tmp)).toBe(0);

      expect(JSON.parse(read())).toMatchObject({
        $schema: "./schemas/c.json",
      });
    });

    it("leaves a file that already has $schema as it is", () => {
      const infoSpy = silenceInfo();
      const before = '{\n  "$schema": "./x.json",\n  "theme": "t.json"\n}\n';
      fs.writeFileSync(configFile(), before);

      expect(schemaCommand({}, tmp)).toBe(0);

      expect(read()).toBe(before);
      expect(infoSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Add "$schema"'),
      );
    });

    it.each([
      ["without --out", {}, 1],
      ["with --out", { out: "t.schema.json" }, 0],
    ])(
      "leaves an invalid config as it is and prints the line to add %s",
      (_label, args, exitCode) => {
        const infoSpy = silenceInfo();
        vi.spyOn(logger, "error").mockImplementation(() => undefined);
        const before = '{\n  "theme": "t.json",\n  "extraSources": ["x"]\n}\n';
        fs.writeFileSync(configFile(), before);

        expect(schemaCommand(args, tmp)).toBe(exitCode);

        expect(read()).toBe(before);
        expect(infoSpy).toHaveBeenCalledWith(
          expect.stringContaining(`Add "$schema": "${POINTER}"`),
        );
      },
    );

    it("never edits package.json#style-gen", () => {
      const infoSpy = silenceInfo();
      const before = '{\n  "name": "app",\n  "style-gen": {}\n}\n';
      fs.writeFileSync(path.join(tmp, "package.json"), before);

      expect(schemaCommand({}, tmp)).toBe(0);

      expect(fs.readFileSync(path.join(tmp, "package.json"), "utf8")).toBe(
        before,
      );
      expect(infoSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Add "$schema"'),
      );
    });

    it.skipIf(process.platform === "win32")(
      "writes through a symlinked config and keeps the link",
      () => {
        silenceInfo();
        const real = path.join(tmp, "real.json");
        fs.writeFileSync(real, '{\n  "theme": "styles/theme.json"\n}\n');
        fs.symlinkSync(real, configFile());

        expect(schemaCommand({}, tmp)).toBe(0);

        expect(fs.lstatSync(configFile()).isSymbolicLink()).toBe(true);
        expect(fs.readFileSync(real, "utf8")).toBe(
          `{\n  "$schema": "${POINTER}",\n  "theme": "styles/theme.json"\n}\n`,
        );
      },
    );
  });
});
