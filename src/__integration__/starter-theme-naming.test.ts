import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { doctorCommand } from "../cli/commands/doctor";
import { initCommand } from "../cli/commands/init";
import { logger } from "../cli/logger";
import { themeTemplate, themeTemplateDark } from "../cli/templates";
import { generate } from "../core/generate";

interface CheckDesignCanvasModule {
  checkCanvas: (options: {
    canvasDir: string;
    theme: string;
    naming?: boolean | undefined;
  }) => string[];
}

const script = join(
  __dirname,
  "..",
  "..",
  "scripts",
  "check-design-canvas.mjs",
);

const scratch: string[] = [];
afterEach(() => {
  for (const dir of scratch.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

/**
 * The naming violations of a theme text: an empty canvas, so only the theme rules run.
 * @param {CheckDesignCanvasModule} mod - The checker module
 * @param {string} text - The theme JSON
 * @returns {string[]} One line per violation
 */
function namingViolations(
  mod: CheckDesignCanvasModule,
  text: string,
): string[] {
  const dir = mkdtempSync(join(tmpdir(), "starter-naming-"));
  scratch.push(dir);
  const theme = join(dir, "theme.json");
  writeFileSync(theme, text);
  const canvasDir = join(dir, "canvas");
  mkdirSync(canvasDir);
  return mod.checkCanvas({ canvasDir, theme, naming: true });
}

describe("the theme style-gen init writes", () => {
  let mod: CheckDesignCanvasModule;
  beforeAll(async () => {
    mod = (await import(pathToFileURL(script).href)) as CheckDesignCanvasModule;
  });

  it.each([
    ["light", themeTemplate],
    ["dark", themeTemplateDark],
  ])("the %s starter follows the naming convention", (_name, text) => {
    expect(namingViolations(mod, text)).toEqual([]);
  });

  it("reports a semantic key that holds a literal (control)", () => {
    const literal = themeTemplate.replace(
      '"primary": "$blue600"',
      '"primary": "#2563EB"',
    );
    expect(literal).not.toBe(themeTemplate);
    expect(namingViolations(mod, literal)).not.toEqual([]);
  });

  it.each([
    ["light", themeTemplate],
    ["dark", themeTemplateDark],
  ])("generate() accepts the %s starter", (_name, text) => {
    const theme = JSON.parse(text) as Record<string, unknown>;
    delete theme.$schema;
    expect(() => generate(theme as never)).not.toThrow();
  });

  it.each([
    ["light", false],
    ["dark", true],
  ])(
    "style-gen doctor prints no theme warning after init --yes (%s)",
    async (_name, dark) => {
      const dir = mkdtempSync(join(tmpdir(), "starter-doctor-"));
      scratch.push(dir);
      const rules = join(dir, "rules.md");
      writeFileSync(rules, "# rules\n");
      const project = join(dir, "app");
      mkdirSync(project);
      const isTTY = process.stdin.isTTY;
      Object.defineProperty(process.stdin, "isTTY", {
        value: false,
        configurable: true,
      });
      const lines: string[] = [];
      for (const method of ["log", "info", "warn", "error", "success"] as const)
        vi.spyOn(logger, method).mockImplementation((message: unknown) => {
          lines.push(String(message));
        });
      try {
        expect(await initCommand({ yes: true, dark }, project, rules)).toBe(0);
        lines.length = 0;

        expect(doctorCommand(project)).toBe(0);
      } finally {
        vi.restoreAllMocks();
        Object.defineProperty(process.stdin, "isTTY", {
          value: isTTY,
          configurable: true,
        });
      }

      const report = lines.join("\n");
      expect(report).toMatch(/Theme {3}\(.*\) ✅ Valid JSON, schema OK/);
      expect(report).not.toMatch(/Theme {3}⚠️/);
    },
  );
});
