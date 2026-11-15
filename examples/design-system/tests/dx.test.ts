import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import * as ts from "typescript";
import { describe, expect, it } from "vitest";
import { generate } from "@duydpdev/style-generator";
import type { StyleGeneratorOptions } from "@duydpdev/style-generator/types";

import { theme } from "../src/tokens";

/**
 * DX contract of the design system, proven with the real TypeScript compiler:
 * renaming a color in `theme.json` must fail to compile, in the recipe that
 * names it — not at runtime, and not somewhere unrelated. Needs the library's
 * `dist/*.d.ts` (`yarn build:all` at the repo root), which the package
 * resolves through its `link:../..` dependency.
 */
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const themePath = resolve(root, "src/theme.json");
const buttonPath = resolve(root, "src/recipes/button.ts");

const compilerOptions = (): ts.CompilerOptions => {
  const configPath = resolve(root, "tsconfig.json");
  const result = ts.readConfigFile(configPath, (file) => ts.sys.readFile(file));
  if (result.error !== undefined) {
    throw new Error(
      ts.flattenDiagnosticMessageText(result.error.messageText, "\n"),
    );
  }
  const config: unknown = result.config;
  return {
    ...ts.parseJsonConfigFileContent(config, ts.sys, root).options,
    noEmit: true,
  };
};

/**
 * Type-check `src/recipes/button.ts` and everything it imports. When
 * `themeSource` is given, the compiler reads it instead of `theme.json`: TS
 * loads JSON modules through `host.getSourceFile`, not `readFile`.
 */
const diagnose = (themeSource?: string): readonly ts.Diagnostic[] => {
  const opts = compilerOptions();
  const host = ts.createCompilerHost(opts, true);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (
    fileName,
    languageVersionOrOptions,
    onError,
    shouldCreateNewSourceFile,
  ) =>
    themeSource !== undefined && resolve(fileName) === themePath
      ? ts.createSourceFile(
          fileName,
          themeSource,
          languageVersionOrOptions,
          true,
          ts.ScriptKind.JSON,
        )
      : getSourceFile(
          fileName,
          languageVersionOrOptions,
          onError,
          shouldCreateNewSourceFile,
        );
  const program = ts.createProgram([buttonPath], opts, host);
  return ts.getPreEmitDiagnostics(program);
};

const format = (diagnostics: readonly ts.Diagnostic[]): string =>
  diagnostics
    .map(
      (d) =>
        `${d.file?.fileName ?? "<global>"}: ${ts.flattenDiagnosticMessageText(d.messageText, "\n")}`,
    )
    .join("\n");

describe("design-system DX", () => {
  it("the shipped theme compiles with no diagnostics", () => {
    const diagnostics = diagnose();
    expect(format(diagnostics)).toBe("");
  });

  it("renaming `danger` in theme.json fails to compile in src/recipes/button.ts", () => {
    const mutated = readFileSync(themePath, "utf8").replaceAll(
      '"danger"',
      '"dangerX"',
    );
    expect(mutated).not.toBe(readFileSync(themePath, "utf8"));

    const diagnostics = diagnose(mutated);
    expect(diagnostics.length).toBeGreaterThanOrEqual(1);
    expect(
      diagnostics.some((d) =>
        d.file?.fileName
          .replaceAll("\\", "/")
          .endsWith("src/recipes/button.ts"),
      ),
      format(diagnostics),
    ).toBe(true);
  });
});

describe("design-system configuration", () => {
  const readConfig = (file: string): Record<string, unknown> =>
    JSON.parse(readFileSync(resolve(root, file), "utf8")) as Record<
      string,
      unknown
    >;

  it("keeps the opacity coverage equal in the design-system config and the harness package.json", () => {
    const config = readConfig("style-gen.config.json");
    const harness = readConfig("../harness/package.json");
    expect(harness["style-gen"]).toMatchObject({ coverage: config.coverage });
  });

  it("theme.json and the config's generator options pass generate() validation", () => {
    // `theme`, `output` and `tokensOutput` are the file settings, not generate() options.
    const { breakpoints, coverage } = readConfig(
      "style-gen.config.json",
    ) as Required<Pick<StyleGeneratorOptions, "breakpoints" | "coverage">>;
    const { css } = generate(theme, { breakpoints, coverage });
    expect(css).toContain('html[data-theme="dark"]');
    // `highContrast` is kebab-cased in the attribute value.
    expect(css).toContain('html[data-theme="high-contrast"]');
    expect(css).toContain('html[data-palette="forest"]');
    expect(css).toContain(
      "hover:{bg,text,border,ring,outline,divide,placeholder}-{primary-hover}",
    );
  });
});
