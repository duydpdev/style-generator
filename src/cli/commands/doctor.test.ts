import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type MockInstance,
} from "vitest";

import { logger } from "../logger";

import { doctorCommand } from "./doctor";

const writeProject = (
  tmp: string,
  files: Record<string, string | object>,
): void => {
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(tmp, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(
      abs,
      typeof content === "string" ? content : JSON.stringify(content),
    );
  }
};

describe("doctorCommand", () => {
  let tmp: string;
  let origCwd: string;
  let logSpy: MockInstance<typeof logger.log>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "style-gen-doctor-"));
    origCwd = process.cwd();
    process.chdir(tmp);
    logSpy = vi.spyOn(logger, "log").mockImplementation(() => undefined);
    exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`__exit_${String(code ?? 0)}__`);
    }) as never);
  });

  afterEach(() => {
    process.chdir(origCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  const lines = (): string => logSpy.mock.calls.map((c) => c[0]).join("\n");

  it("valid theme + configured generator script + output → success path", () => {
    writeProject(tmp, {
      "style-gen.config.json": {
        theme: "styles/theme.json",
        plugin: "plugins/theme-plugin.ts",
        output: "styles/theme.css",
      },
      "styles/theme.json": {
        colors: { primary: "#3B82F6" },
        typography: {
          h1: {
            fontSize: "32px",
            lineHeight: "40px",
            fontWeight: 700,
            letterSpacing: "0",
          },
        },
      },
      "plugins/theme-plugin.ts": "// stub",
      "styles/theme.css": "text-primary",
    });

    expect(() => {
      doctorCommand();
    }).not.toThrow();
    const out = lines();
    expect(out).toMatch(/Valid JSON, schema OK/);
    expect(out).toMatch(/Everything looks good/);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("passes a CLI-only/plugin setup: no generator script configured, none checked", () => {
    writeProject(tmp, {
      "style-gen.config.json": {
        theme: "styles/theme.json",
        output: "styles/theme.css",
      },
      "styles/theme.json": { colors: { primary: "#3B82F6" } },
      "styles/theme.css": "x",
    });

    doctorCommand();

    const out = lines();
    expect(out).not.toContain("Script");
    expect(out).toMatch(/Everything looks good/);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("configured generator script that does not exist → exit 1", () => {
    writeProject(tmp, {
      "style-gen.config.json": {
        theme: "styles/theme.json",
        plugin: "plugins/theme-plugin.ts",
        output: "styles/theme.css",
      },
      "styles/theme.json": { colors: { primary: "#3B82F6" } },
    });

    expect(() => {
      doctorCommand();
    }).toThrow(/__exit_1__/);
    expect(lines()).toMatch(
      /Script {2}\(plugins\/theme-plugin\.ts\s*\) ❌ Not found/,
    );
  });

  it("malformed style-gen.config.json → reported as an error, exit 1", () => {
    writeProject(tmp, {
      "style-gen.config.json": "{ not json",
      "styles/theme.json": { colors: { primary: "#3B82F6" } },
    });

    expect(() => {
      doctorCommand();
    }).toThrow(/__exit_1__/);
    expect(lines()).toMatch(/style-gen\.config\.json is not valid JSON/);
  });

  it("v1 nested colors (object values) → schema error naming the offending path, exit 1", () => {
    writeProject(tmp, {
      "style-gen.config.json": {
        theme: "styles/theme.json",
        plugin: "plugins/theme-plugin.ts",
        output: "styles/theme.css",
      },
      "styles/theme.json": {
        colors: { base: { primary: "#3B82F6" }, text: {}, common: {} },
        typography: {
          h1: {
            fontSize: "32px",
            lineHeight: "40px",
            fontWeight: 700,
            letterSpacing: "0",
          },
        },
      },
      "plugins/theme-plugin.ts": "// stub",
    });

    expect(() => {
      doctorCommand();
    }).toThrow(/__exit_1__/);
    expect(lines()).toMatch(/colors\.base/);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("misspelled 'colours' key → schema error names the offending path, exit 1", () => {
    writeProject(tmp, {
      "style-gen.config.json": {
        theme: "styles/theme.json",
        plugin: "plugins/theme-plugin.ts",
        output: "styles/theme.css",
      },
      "styles/theme.json": {
        colors: { primary: "#3B82F6" },
        colours: { primary: "#3B82F6" },
      },
      "plugins/theme-plugin.ts": "// stub",
    });

    expect(() => {
      doctorCommand();
    }).toThrow(/__exit_1__/);
    expect(lines()).toMatch(/colours/);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("invalid JSON theme → exit 1 with 'Invalid JSON'", () => {
    writeProject(tmp, {
      "style-gen.config.json": {
        theme: "styles/theme.json",
        plugin: "plugins/theme-plugin.ts",
        output: "styles/theme.css",
      },
      "styles/theme.json": "{ this is not json",
      "plugins/theme-plugin.ts": "// stub",
    });

    expect(() => {
      doctorCommand();
    }).toThrow(/__exit_1__/);
    expect(lines()).toMatch(/Invalid JSON/);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("missing theme file → exit 1 with 'Not found'", () => {
    writeProject(tmp, {
      "style-gen.config.json": {
        theme: "styles/missing.json",
        plugin: "plugins/theme-plugin.ts",
        output: "styles/theme.css",
      },
      "plugins/theme-plugin.ts": "// stub",
    });

    expect(() => {
      doctorCommand();
    }).toThrow(/__exit_1__/);
    expect(lines()).toMatch(/Not found/);
  });

  describe("Tailwind utility collision warnings", () => {
    const runWithTheme = (theme: object): void => {
      writeProject(tmp, {
        "style-gen.config.json": {
          theme: "styles/theme.json",
          plugin: "plugins/theme-plugin.ts",
          output: "styles/theme.css",
        },
        "styles/theme.json": theme,
        "plugins/theme-plugin.ts": "// stub",
        "styles/theme.css": "x",
      });
    };

    const typo = {
      fontSize: "32px",
      lineHeight: "40px",
      fontWeight: 700,
      letterSpacing: "0",
    };

    it("warns for every curated collision without failing (no exit, schema still OK)", () => {
      runWithTheme({
        colors: {
          primary: "#3B82F6",
          none: "#000",
          transparent: "transparent",
          current: "currentColor",
          inherit: "inherit",
        },
        shadows: { none: "none" },
        backDropBlurs: { none: "0" },
        borderRadius: { none: "0px" },
        borderWidth: { "0": "0px", "2": "2px", thin: "1px" },
        typography: {
          textXs: typo,
          text2xl: typo,
          textCenter: typo,
          h1: typo,
          p2: typo,
          italic: typo,
        },
        themeAxes: { theme: { dark: { colors: { none: "#111" } } } },
      });

      expect(() => {
        doctorCommand();
      }).not.toThrow();
      const out = lines();

      expect(out).toMatch(/Valid JSON, schema OK/);
      for (const collision of [
        "colors.none",
        "shadows.none",
        "backDropBlurs.none",
        "borderRadius.none",
        "colors.transparent",
        "colors.current",
        "colors.inherit",
        "borderWidth.0",
        "borderWidth.2",
        "typography.textXs",
        "typography.text2xl",
        "typography.textCenter",
        "typography.h1",
        "typography.p2",
        "typography.italic",
      ]) {
        expect(out).toContain(`${collision} →`);
      }
      expect(out).not.toContain("borderWidth.thin");
      expect(out).not.toContain("colors.primary");
      // Override `none` is reported once via the base record, not duplicated.
      expect(out.match(/colors\.none →/g)).toHaveLength(1);
      expect(exitSpy).not.toHaveBeenCalled();
    });

    it("prints no collision warning for a clean theme", () => {
      runWithTheme({
        colors: { primary: "#3B82F6" },
        borderWidth: { thin: "1px" },
        typography: { heading1: typo, textHeading: typo, body: typo },
      });

      doctorCommand();

      expect(lines()).not.toContain("⚠️");
      expect(exitSpy).not.toHaveBeenCalled();
    });

    it("still exits 1 on a schema error and prints no collision warnings for it", () => {
      runWithTheme({
        colors: { none: "#000" },
        colours: {},
      });

      expect(() => {
        doctorCommand();
      }).toThrow(/__exit_1__/);
      expect(lines()).not.toContain("colors.none →");
    });
  });
});
