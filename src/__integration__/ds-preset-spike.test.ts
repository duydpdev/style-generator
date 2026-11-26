import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createRuleCompiler } from "../cli/commands/canvas/compileCss";
import { generate } from "../core/generate";
import { toKebabCase } from "../shared/helpers";

import theme from "./__fixtures__/ds-build/theme.json";

const fixture = join(__dirname, "__fixtures__", "ds-build");

// Imports `file` in a fresh Node process, so Vite's transform cannot stand in for Node's own loader.
function importInNode(file: string): Record<string, unknown> {
  const script = `import(${JSON.stringify(pathToFileURL(file).href)}).then((m) => console.log(JSON.stringify(m)));`;
  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", script],
    { encoding: "utf8" },
  );
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout) as Record<string, unknown>;
}

describe("loading a design-system preset with Node alone", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "sg-ds-spike-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("imports a .mjs preset", () => {
    const file = join(dir, "ds.preset.mjs");
    writeFileSync(
      file,
      'export const buttonPreset = { intents: ["primary"], focusRing: "focus-visible:outline-focus" };\n',
    );
    expect(importInNode(file)).toEqual({
      buttonPreset: {
        intents: ["primary"],
        focusRing: "focus-visible:outline-focus",
      },
    });
  });

  it.runIf(Boolean(process.features.typescript))(
    "imports a .ts preset by native type stripping",
    () => {
      const file = join(dir, "ds.preset.ts");
      copyFileSync(join(fixture, "ds.preset.ts"), file);
      const loaded = importInNode(file) as {
        buttonPreset: { intents: string[]; focusRing: string };
      };
      expect(loaded.buttonPreset.intents).toEqual(["primary", "danger"]);
      expect(loaded.buttonPreset.focusRing).toBe("focus-visible:outline-focus");
    },
  );

  it("compiles the component candidates and a typography class with core tailwindcss", async () => {
    const { css } = generate(theme as never, {
      resetTailwindDefaults: ["colors"],
    });
    const compiler = await createRuleCompiler({ css, cwd: process.cwd() });
    const typography = Object.keys(
      (theme as { typography: Record<string, unknown> }).typography,
    ).map((key) => toKebabCase(key));
    const wanted = [
      "inline-flex",
      "focus-visible:outline-focus",
      "bg-primary",
      "hover:bg-primary-subtle",
      ...typography,
    ];
    expect(compiler.producing(wanted)).toEqual(new Set(wanted));
    expect([...compiler.producing(["bg-nothing-here"])]).toEqual([]);
  });
});
