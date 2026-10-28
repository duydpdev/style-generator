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

  it("valid theme + configured generator script + output → success path", () => {
    writeProject(tmp, {
      "style-gen.config.json": {
        theme: "styles/theme.json",
        plugin: "plugins/theme-plugin.ts",
        output: "styles/theme.css",
      },
      "styles/theme.json": {
        colors: { primary: "#3B82F6" },
        typography: { h1: typo },
      },
      "plugins/theme-plugin.ts": "// stub",
      "styles/theme.css": "text-primary",
    });

    expect(doctorCommand(tmp)).toBe(0);
    const out = lines();
    expect(out).toMatch(/Valid JSON, schema OK/);
    expect(out).toMatch(/Everything looks good/);
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

    expect(doctorCommand(tmp)).toBe(0);

    const out = lines();
    expect(out).not.toContain("Script");
    expect(out).toMatch(/Everything looks good/);
  });

  it("points at `generate` when the output has not been generated yet", () => {
    writeProject(tmp, {
      "styles/theme.json": { colors: { primary: "#3B82F6" } },
    });

    expect(doctorCommand(tmp)).toBe(0);

    expect(lines()).toMatch(/Not generated yet/);
    expect(lines()).toMatch(/yarn style-gen generate/);
  });

  it("configured generator script that does not exist → 1", () => {
    writeProject(tmp, {
      "style-gen.config.json": {
        theme: "styles/theme.json",
        plugin: "plugins/theme-plugin.ts",
        output: "styles/theme.css",
      },
      "styles/theme.json": { colors: { primary: "#3B82F6" } },
    });

    expect(doctorCommand(tmp)).toBe(1);
    expect(lines()).toMatch(
      /Script {2}\(plugins\/theme-plugin\.ts\s*\) ❌ Not found/,
    );
  });

  it("v1 nested colors (object values) → schema error naming the offending path, 1", () => {
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
    it("a stale $-alias holder under axes.scope 'element' → ❌ Invalid theme/options, 1", () => {
      writeProject(tmp, {
        "style-gen.config.json": { axes: { scope: "element" } },
        "styles/theme.json": {
          colors: { brand: "#00f", primary: "$brand" },
          themeAxes: { theme: { dark: { colors: { brand: "#0af" } } } },
        },
      });

      expect(doctorCommand(tmp)).toBe(1);

      expect(lines()).toMatch(/Theme .*❌ Invalid theme\/options/);
      expect(lines()).toMatch(/themeAxes\.theme\.dark\.colors\.brand → /);
      expect(lines()).not.toContain("Valid JSON, schema OK");
    });

    it("resetTailwindDefaults radius without borderRadius → ❌ Invalid theme/options, 1", () => {
      writeProject(tmp, {
        "style-gen.config.json": { resetTailwindDefaults: ["radius"] },
        "styles/theme.json": { colors: { primary: "#3B82F6" } },
      });

      expect(doctorCommand(tmp)).toBe(1);

      expect(lines()).toMatch(/Invalid theme\/options/);
      expect(lines()).toMatch(/resetTailwindDefaults\.0 → /);
    });

    it("the same theme passes when the option does not conflict", () => {
      writeProject(tmp, {
        "style-gen.config.json": { axes: { scope: "root" } },
        "styles/theme.json": {
          colors: { brand: "#00f", primary: "$brand" },
          themeAxes: { theme: { dark: { colors: { brand: "#0af" } } } },
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

    it.each([
      ["output", { output: "../out/theme.css" }, "Output"],
      [
        "plugin",
        { plugin: "../out/plugin.ts", output: "styles/theme.css" },
        "Script",
      ],
    ])(
      "an escaping %s → ❌ with the escape message, 1",
      (label, config, heading) => {
        writeProject(tmp, {
          "style-gen.config.json": config,
          "styles/theme.json": { colors: { primary: "#3B82F6" } },
        });

        expect(doctorCommand(tmp)).toBe(1);

        expect(lines()).toMatch(
          new RegExp(`${heading} +\\(.*\\) ❌ Escapes project root`),
        );
        expect(lines()).toContain(`${label} escapes project root: ../out/`);
      },
    );
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

    it("warns for every curated collision without failing (exit 0, schema still OK)", () => {
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

      expect(doctorCommand(tmp)).toBe(0);
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

  describe("legacy --sg-<color> variable warnings", () => {
    const writeBase = (): void => {
      writeProject(tmp, {
        "style-gen.config.json": {
          theme: "styles/theme.json",
          plugin: "plugins/theme-plugin.ts",
          output: "styles/theme.css",
        },
        "styles/theme.json": { colors: { primary: "#3B82F6" } },
        "plugins/theme-plugin.ts": "// stub",
      });
    };

    it("prints a file:line warning per leftover reference/declaration, skips the output file, exit code unchanged", () => {
      writeBase();
      writeProject(tmp, {
        "src/a.css": [
          ".a { color: var(--sg-primary); }",
          "ok { color: var(--sg-color-primary); }",
          'html[data-palette="x"] {',
          "  --sg-primary: #111;",
          "}",
        ].join("\n"),
        // The generated file legitimately mentions its own variables.
        "styles/theme.css": ":root { --sg-primary: #000; }",
      });

      expect(doctorCommand(tmp)).toBe(0);

      const out = lines();
      expect(out).toContain(
        "Theme   ⚠️  src/a.css:1: --sg-primary was renamed to --sg-color-primary in 5.0",
      );
      expect(out).toContain(
        "Theme   ⚠️  src/a.css:4: --sg-primary was renamed to --sg-color-primary in 5.0",
      );
      expect(out.match(/was renamed to/g)).toHaveLength(2);
      expect(out).not.toContain("styles/theme.css:");
    });

    it("stays silent for a migrated project", () => {
      writeBase();
      writeProject(tmp, {
        "src/a.css": "html[data-x] { --sg-color-primary: #111; }",
        "styles/theme.css": "x",
      });

      expect(doctorCommand(tmp)).toBe(0);

      expect(lines()).not.toContain("was renamed to");
    });
  });
});
