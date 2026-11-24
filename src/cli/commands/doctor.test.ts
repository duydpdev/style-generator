import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  onTestFinished,
  vi,
  type MockInstance,
} from "vitest";

import { writeTmpFile } from "../../__integration__/__fixtures__/tmpProject";
import { logger } from "../logger";

import { doctorCommand } from "./doctor";

const writeProject = (
  tmp: string,
  files: Record<string, string | object>,
): void => {
  for (const [rel, content] of Object.entries(files)) {
    writeTmpFile(tmp, rel, content);
  }
};

const typo = {
  fontSize: "32px",
  lineHeight: "40px",
  fontWeight: 700,
  letterSpacing: "0",
};

describe("doctorCommand", () => {
  let tmp: string;
  let logSpy: MockInstance<typeof logger.log>;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "style-gen-doctor-"));
    logSpy = vi.spyOn(logger, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  const lines = (): string => logSpy.mock.calls.map((c) => c[0]).join("\n");

  it("valid theme + output → success path", () => {
    writeProject(tmp, {
      "style-gen.config.json": {
        theme: "styles/theme.json",
        output: "styles/theme.css",
      },
      "styles/theme.json": {
        colors: { primary: "#3B82F6" },
        typography: { h1: typo },
      },
      "styles/theme.css": "text-primary",
    });

    expect(doctorCommand(tmp)).toBe(0);
    const out = lines();
    expect(out).toMatch(/Valid JSON, schema OK/);
    expect(out).toMatch(/Everything looks good/);
  });

  it("prints no Script line: doctor does not look for a generator script", () => {
    writeProject(tmp, {
      "style-gen.config.json": {
        theme: "styles/theme.json",
        output: "styles/theme.css",
      },
      "styles/theme.json": { colors: { primary: "#3B82F6" } },
      "styles/theme.css": "x",
    });

    expect(doctorCommand(tmp)).toBe(0);

    const out = lines();
    expect(out).not.toContain("Script");
    expect(out).toMatch(/Everything looks good/);
  });

  it("points at `generate` when the output has not been generated yet", () => {
    vi.stubEnv(
      "npm_config_user_agent",
      "bun/1.1.30 npm/? node/v22.6.0 darwin arm64",
    );
    onTestFinished(() => {
      vi.unstubAllEnvs();
    });
    writeProject(tmp, {
      "styles/theme.json": { colors: { primary: "#3B82F6" } },
    });

    expect(doctorCommand(tmp)).toBe(0);

    expect(lines()).toMatch(/Not generated yet/);
    expect(lines()).toContain("bun run style-gen generate");
  });

  it("a config that has a `plugin` key stops with a config error and prints no Script line", () => {
    writeProject(tmp, {
      "style-gen.config.json": {
        theme: "styles/theme.json",
        plugin: "plugins/theme-plugin.ts",
        output: "styles/theme.css",
      },
      "styles/theme.json": { colors: { primary: "#3B82F6" } },
    });

    expect(doctorCommand(tmp)).toBe(1);

    expect(lines()).toMatch(/^ *plugin → /m);
    expect(lines()).not.toContain("Script");
  });

  it("nested colors (object values) → schema error naming the offending path, 1", () => {
    writeProject(tmp, {
      "style-gen.config.json": {
        theme: "styles/theme.json",
        output: "styles/theme.css",
      },
      "styles/theme.json": {
        colors: { base: { primary: "#3B82F6" }, text: {}, common: {} },
        typography: { h1: typo },
      },
    });

    expect(doctorCommand(tmp)).toBe(1);
    expect(lines()).toMatch(/colors\.base/);
  });

  it("misspelled 'colours' key → schema error names the offending path, 1", () => {
    writeProject(tmp, {
      "styles/theme.json": {
        colors: { primary: "#3B82F6" },
        colours: { primary: "#3B82F6" },
      },
    });

    expect(doctorCommand(tmp)).toBe(1);
    expect(lines()).toMatch(/colours/);
  });

  it("invalid JSON theme → 1 with 'Invalid JSON'", () => {
    writeProject(tmp, { "styles/theme.json": "{ this is not json" });

    expect(doctorCommand(tmp)).toBe(1);
    expect(lines()).toMatch(/Invalid JSON/);
  });

  it("missing theme file → 1 with 'Not found'", () => {
    writeProject(tmp, {
      "style-gen.config.json": { theme: "styles/missing.json" },
    });

    expect(doctorCommand(tmp)).toBe(1);
    expect(lines()).toMatch(/Not found/);
  });

  describe("config file problems", () => {
    it("malformed style-gen.config.json → reported on its own, 1, theme and output not checked against the defaults", () => {
      writeProject(tmp, {
        "style-gen.config.json": "{ not json",
        "styles/theme.json": { colors: { primary: "#3B82F6" } },
      });

      expect(doctorCommand(tmp)).toBe(1);

      const out = lines();
      expect(out).toMatch(/style-gen\.config\.json is not valid JSON/);
      expect(out).not.toContain("Theme");
      expect(out).not.toContain("Output");
    });

    it.each([
      [{ breakpoints: "md" }, /breakpoints → /],
      [{ breakpoints: ["tablet"] }, /breakpoints\.0 → /],
    ])(
      "schema-invalid config %o → issue printed, 1, nothing else checked",
      (cfg, line) => {
        writeProject(tmp, {
          "style-gen.config.json": cfg,
          "styles/theme.json": { colors: { primary: "#3B82F6" } },
        });

        expect(doctorCommand(tmp)).toBe(1);

        expect(lines()).toMatch(line);
        expect(lines()).not.toContain("Theme");
      },
    );
  });

  describe("theme × options", () => {
    it("resetTailwindDefaults radius without borderRadius → ❌ Invalid theme/options, 1", () => {
      writeProject(tmp, {
        "style-gen.config.json": { resetTailwindDefaults: ["radius"] },
        "styles/theme.json": { colors: { primary: "#3B82F6" } },
      });

      expect(doctorCommand(tmp)).toBe(1);

      expect(lines()).toMatch(/Theme .*❌ Invalid theme\/options/);
      expect(lines()).toMatch(/resetTailwindDefaults\.0 → /);
      expect(lines()).not.toContain("Valid JSON, schema OK");
    });

    it("the same option passes when the theme provides the replacement", () => {
      writeProject(tmp, {
        "style-gen.config.json": { resetTailwindDefaults: ["shadow"] },
        "styles/theme.json": {
          colors: { primary: "#3B82F6" },
          shadows: { base: "0 1px 2px #000" },
        },
      });

      expect(doctorCommand(tmp)).toBe(0);
    });
  });

  describe("project root", () => {
    it("accepts a theme outside the project root (a shared monorepo theme)", () => {
      const shared = fs.mkdtempSync(
        path.join(os.tmpdir(), "style-gen-doctor-shared-"),
      );
      try {
        fs.writeFileSync(
          path.join(shared, "theme.json"),
          JSON.stringify({ colors: { primary: "#3B82F6" } }),
        );
        writeProject(tmp, {
          "style-gen.config.json": { theme: path.join(shared, "theme.json") },
        });

        expect(doctorCommand(tmp)).toBe(0);
        expect(lines()).toMatch(/Valid JSON, schema OK/);
      } finally {
        fs.rmSync(shared, { recursive: true, force: true });
      }
    });

    it("treats a leading-slash theme as an absolute path, not as project-relative", () => {
      writeProject(tmp, {
        "style-gen.config.json": { theme: "/styles/theme.json" },
        "styles/theme.json": { colors: { primary: "#3B82F6" } },
      });

      expect(doctorCommand(tmp)).toBe(1);
      expect(lines()).toMatch(/Not found/);
    });

    it("an escaping output → ❌ with the escape message, 1", () => {
      writeProject(tmp, {
        "style-gen.config.json": { output: "../out/theme.css" },
        "styles/theme.json": { colors: { primary: "#3B82F6" } },
      });

      expect(doctorCommand(tmp)).toBe(1);

      expect(lines()).toMatch(/Output +\(.*\) ❌ Invalid emit paths/);
      expect(lines()).toContain("output escapes project root: ../out/");
    });

    it.each([
      [
        "escapes the project root",
        { tokensOutput: "../keys.ts" },
        "tokensOutput escapes project root: ../keys.ts",
      ],
      [
        "is not a TypeScript file",
        { tokensOutput: "gen/keys.js" },
        "tokensOutput must be a .ts, .mts or .cts file",
      ],
      [
        "is a declaration file",
        { tokensOutput: "gen/keys.d.ts" },
        "tokensOutput must be a .ts, .mts or .cts file",
      ],
    ])(
      "a tokensOutput that %s → ❌, 1, as generate refuses it (C-M2)",
      (_name, config, message) => {
        writeProject(tmp, {
          "style-gen.config.json": config,
          "styles/theme.json": { colors: { primary: "#3B82F6" } },
        });

        expect(doctorCommand(tmp)).toBe(1);

        expect(lines()).toMatch(/Output +\(.*\) ❌ Invalid emit paths/);
        expect(lines()).toContain(message);
        expect(lines()).not.toContain("Setup looks complete");
      },
    );

    it("an output that is the theme file → ❌, 1 (N-M3)", () => {
      writeProject(tmp, {
        "style-gen.config.json": {
          theme: "styles/theme.json",
          output: "styles/theme.json",
        },
        "styles/theme.json": { colors: { primary: "#3B82F6" } },
      });

      expect(doctorCommand(tmp)).toBe(1);

      expect(lines()).toContain("theme and output must be different files");
    });

    it("an output that is the tokens module → ❌, 1 (N-M1)", () => {
      writeProject(tmp, {
        "style-gen.config.json": { output: "styles/theme.tokens.ts" },
        "styles/theme.json": { colors: { primary: "#3B82F6" } },
      });

      expect(doctorCommand(tmp)).toBe(1);

      expect(lines()).toContain("output and tokens file");
    });

    // M1: doctor reports what generate refuses.
    it("an output that reaches the theme through a symlinked directory → ❌, 1 (M1)", () => {
      writeProject(tmp, {
        "style-gen.config.json": {
          theme: "styles/theme.json",
          output: "link/theme.json",
        },
        "styles/theme.json": { colors: { primary: "#3B82F6" } },
      });
      fs.symlinkSync(path.join(tmp, "styles"), path.join(tmp, "link"));

      expect(doctorCommand(tmp)).toBe(1);

      expect(lines()).toContain("theme and output must be different files");
    });

    it.each(["style-gen.config.json", "package.json"])(
      "an output that is %s → ❌, 1 (L4)",
      (output) => {
        writeProject(tmp, {
          "style-gen.config.json": { output },
          "package.json": { name: "app" },
          "styles/theme.json": { colors: { primary: "#3B82F6" } },
        });

        expect(doctorCommand(tmp)).toBe(1);

        expect(lines()).toContain(
          `output and ${output} must be different files`,
        );
      },
    );
  });

  describe("Tailwind utility collision warnings", () => {
    const runWithTheme = (theme: object): void => {
      writeProject(tmp, {
        "style-gen.config.json": {
          theme: "styles/theme.json",
          output: "styles/theme.css",
        },
        "styles/theme.json": theme,
        "styles/theme.css": "x",
      });
    };

    it("warns for every curated collision without failing (exit 0, schema still OK)", () => {
      runWithTheme({
        colors: {
          primary: "#3B82F6",
          none: "#000",
          transparent: "transparent",
          current: "currentColor",
          inherit: "inherit",
          inset: "#000",
          solid: "#000",
          "3": "#000",
          offset2: "#000",
          xReverse: "#000",
        },
        shadows: { none: "none" },
        backdropBlurs: { none: "0" },
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

      expect(doctorCommand(tmp)).toBe(0);
      const out = lines();

      expect(out).toMatch(/Valid JSON, schema OK/);
      for (const collision of [
        "colors.none",
        "shadows.none",
        "backdropBlurs.none",
        "borderRadius.none",
        "colors.transparent",
        "colors.current",
        "colors.inherit",
        "colors.inset",
        "colors.solid",
        "colors.3",
        "colors.offset2",
        "colors.xReverse",
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
      expect(out.match(/colors\.solid →/g)).toHaveLength(2);
      expect(out.match(/colors\.3 →/g)).toHaveLength(2);
    });

    it("prints no collision warning for a clean theme", () => {
      runWithTheme({
        colors: { primary: "#3B82F6" },
        borderWidth: { thin: "1px" },
        typography: { heading1: typo, textHeading: typo, body: typo },
      });

      expect(doctorCommand(tmp)).toBe(0);

      expect(lines()).not.toContain("⚠️");
    });

    it("still returns 1 on a schema error and prints no collision warnings for it", () => {
      runWithTheme({
        colors: { none: "#000" },
        colours: {},
      });

      expect(doctorCommand(tmp)).toBe(1);
      expect(lines()).not.toContain("colors.none →");
    });
  });

  describe("alias hints (override repeats a base literal)", () => {
    const runWithAxes = (themeAxes: object): void => {
      writeProject(tmp, {
        "style-gen.config.json": {
          theme: "styles/theme.json",
          output: "styles/theme.css",
        },
        "styles/theme.json": {
          colors: { blue500: "#3B82F6", primary: "#000" },
          themeAxes,
        },
        "styles/theme.css": "x",
      });
    };

    it("warns naming the base key, without changing the exit code", () => {
      runWithAxes({ theme: { dark: { colors: { primary: "#3b82f6" } } } });

      expect(doctorCommand(tmp)).toBe(0);

      expect(lines()).toContain(
        'Theme   ⚠️  Override theme.dark.colors.primary repeats base value #3b82f6 → use alias "$blue500"',
      );
    });

    it("stays silent once the override uses the alias", () => {
      runWithAxes({ theme: { dark: { colors: { primary: "$blue500" } } } });

      expect(doctorCommand(tmp)).toBe(0);

      expect(lines()).not.toContain("repeats base value");
    });
  });
});
