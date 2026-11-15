import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { CheckPlainUiModule } from "./__fixtures__/plainUi";
import { writeTmpFile } from "./__fixtures__/tmpProject";

const repoRoot = join(__dirname, "..", "..");
const script = join(repoRoot, "scripts", "check-plain-ui.mjs");

describe("check-plain-ui: the repo's plain apps", () => {
  let dir: string;
  let mod: CheckPlainUiModule;

  beforeAll(async () => {
    mod = (await import(pathToFileURL(script).href)) as CheckPlainUiModule;
  });

  const THEME_TS = "export const theme = 1;\n";
  const TOKENS_TS = "export const tokens = 1;\n";

  /**
   * A config as the two apps keep it: their own paths differ, the generator
   * options are shared.
   * @param {string} app - App name
   * @returns {string} JSON text
   */
  const config = (app: string) =>
    `${JSON.stringify({
      $schema: "./style-gen.config.schema.json",
      theme: `${app}/theme.json`,
      output: `${app}/theme.css`,
      tokensOutput: `${app}/theme.tokens.ts`,
      coverage: { colors: { opacities: [10, 20] } },
      breakpoints: ["md", "lg"],
    })}\n`;

  /**
   * The valid fixture: one `button` folder per app of `APPS`, plus the
   * app-scope theme files and the app config.
   * @param {string} root - Fixture root
   */
  function validFixture(root: string) {
    for (const app of mod.APPS) {
      const ui = app.uiDir;
      writeTmpFile(root, `${ui}/button/style.ts`, "export const s = 1;\n");
      writeTmpFile(root, `${ui}/button/types.ts`, "export type T = 1;\n");
      writeTmpFile(
        root,
        `${ui}/button/Button${app.component}`,
        app.component === ".vue"
          ? "<template><button /></template>\n"
          : "export {};\n",
      );
      if (app.component === ".tsx") {
        writeTmpFile(root, `${ui}/button/index.ts`, "export {};\n");
      }
      if (app.stories !== false) {
        writeTmpFile(root, `${ui}/button/Button${app.stories}`, "export {};\n");
      }
      writeTmpFile(root, `${dirname(ui)}/theme.ts`, THEME_TS);
      writeTmpFile(root, `${dirname(ui)}/theme/theme.tokens.ts`, TOKENS_TS);
      writeTmpFile(root, `${dirname(ui)}/theme/theme.json`, "{}\n");
      writeTmpFile(
        root,
        `${dirname(dirname(ui))}/style-gen.config.json`,
        config(app.name),
      );
    }
  }

  const check = () => mod.checkPlainUi(dir);
  const configOf = (app: string) => `examples/${app}/style-gen.config.json`;
  const mentions = (errors: readonly string[], text: string) =>
    errors.some((error) => error.includes(text));

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "sg-plain-"));
    validFixture(dir);
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("accepts identical shared files", () => {
    expect(check()).toEqual({ errors: [], warnings: [] });
  });

  it("rejects a plain-nuxt style.ts that differs", () => {
    writeTmpFile(
      dir,
      "examples/plain-nuxt/app/ui/button/style.ts",
      "export const s = 2;\n",
    );
    expect(mentions(check().errors, "plain-nuxt")).toBe(true);
  });

  it("allows a plain-nuxt types.ts of its own", () => {
    writeTmpFile(
      dir,
      "examples/plain-nuxt/app/ui/button/types.ts",
      "export interface ButtonProps { as?: string }\n",
    );
    expect(check().errors).toEqual([]);
  });

  it("rejects a plain-nuxt folder without its .vue component", () => {
    rmSync(join(dir, "examples/plain-nuxt/app/ui/button/Button.vue"));
    expect(mentions(check().errors, "plain-nuxt")).toBe(true);
  });

  it("rejects a theme.ts that differs in plain-nuxt", () => {
    writeTmpFile(
      dir,
      "examples/plain-nuxt/app/theme.ts",
      "export const theme = 2;\n",
    );
    expect(mentions(check().errors, "plain-nuxt")).toBe(true);
  });

  it("rejects a theme.tokens.ts that differs in plain-nuxt", () => {
    writeTmpFile(
      dir,
      "examples/plain-nuxt/app/theme/theme.tokens.ts",
      "export const tokens = 2;\n",
    );
    expect(mentions(check().errors, "plain-nuxt")).toBe(true);
  });

  it("rejects a missing theme.tokens.ts", () => {
    rmSync(join(dir, "examples/plain-nuxt/app/theme/theme.tokens.ts"));
    expect(check().errors).toEqual([
      "examples/plain-nuxt/app/theme/theme.tokens.ts: missing",
    ]);
  });

  it("rejects a theme.json that differs in plain-nuxt", () => {
    writeTmpFile(dir, "examples/plain-nuxt/app/theme/theme.json", '{"a":1}\n');
    expect(mentions(check().errors, "plain-nuxt")).toBe(true);
  });

  it("accepts configs that differ only in $schema, theme, output and tokensOutput (D-L6)", () => {
    writeTmpFile(
      dir,
      configOf("plain-nuxt"),
      `${JSON.stringify({
        breakpoints: ["md", "lg"],
        output: "elsewhere.css",
        coverage: { colors: { opacities: [10, 20] } },
        theme: "elsewhere.json",
      })}\n`,
    );
    expect(check()).toEqual({ errors: [], warnings: [] });
  });

  it("rejects a plain-nuxt config whose coverage drifts from plain-react (D-L6)", () => {
    writeTmpFile(
      dir,
      configOf("plain-nuxt"),
      `${JSON.stringify({
        theme: "plain-nuxt/theme.json",
        coverage: { colors: { opacities: [10, 20, 50] } },
        breakpoints: ["md", "lg"],
      })}\n`,
    );
    expect(check().errors).toEqual([
      `${configOf("plain-nuxt")}: differs from ${configOf("plain-react")} outside $schema, theme, output, tokensOutput`,
    ]);
  });

  it("rejects a plain-nuxt config with an extra generator option (D-L6)", () => {
    writeTmpFile(
      dir,
      configOf("plain-nuxt"),
      `${JSON.stringify({
        coverage: { colors: { opacities: [10, 20] } },
        breakpoints: ["md", "lg"],
        enableResponsive: false,
      })}\n`,
    );
    expect(mentions(check().errors, "differs from")).toBe(true);
  });

  it("rejects a missing or unparsable config (D-L6)", () => {
    rmSync(join(dir, configOf("plain-nuxt")));
    expect(check().errors).toEqual([`${configOf("plain-nuxt")}: missing`]);
    writeTmpFile(dir, configOf("plain-nuxt"), "{ not json");
    expect(mentions(check().errors, configOf("plain-nuxt"))).toBe(true);
  });

  it("warns, never fails, on a folder that exists in one app only", () => {
    const ui = "examples/plain-react/src/ui/card";
    writeTmpFile(dir, `${ui}/style.ts`, "export const s = 1;\n");
    writeTmpFile(dir, `${ui}/types.ts`, "export type T = 1;\n");
    writeTmpFile(dir, `${ui}/Card.tsx`, "export {};\n");
    writeTmpFile(dir, `${ui}/Card.stories.tsx`, "export {};\n");
    writeTmpFile(dir, `${ui}/index.ts`, "export {};\n");
    const { errors, warnings } = check();
    expect(errors).toEqual([]);
    expect(warnings.some((warning) => warning.includes("card"))).toBe(true);
  });

  it("requires <Name>.stories.tsx in plain-react and <Name>.stories.ts in plain-nuxt", () => {
    rmSync(join(dir, "examples/plain-react/src/ui/button/Button.stories.tsx"));
    expect(check().errors).toContain(
      "examples/plain-react/src/ui/button/Button.stories.tsx: missing",
    );
    writeTmpFile(
      dir,
      "examples/plain-react/src/ui/button/Button.stories.tsx",
      "export {};\n",
    );
    rmSync(join(dir, "examples/plain-nuxt/app/ui/button/Button.stories.ts"));
    expect(check().errors).toContain(
      "examples/plain-nuxt/app/ui/button/Button.stories.ts: missing",
    );
  });

  it("lets a story import a sibling folder but not a deeper relative path", () => {
    const story = "examples/plain-react/src/ui/button/Button.stories.tsx";
    writeTmpFile(dir, story, 'import { Flex } from "../flex";\n');
    expect(check().errors).toEqual([]);
    writeTmpFile(dir, story, 'import { x } from "../../sections/Hero";\n');
    expect(
      mentions(check().errors, 'Button.stories.tsx: imports "../../sections'),
    ).toBe(true);
  });

  it("rejects a forbidden package import", () => {
    writeTmpFile(
      dir,
      "examples/plain-nuxt/app/ui/button/Button.vue",
      '<script setup lang="ts">\nimport { clsx } from "clsx";\n</script>\n',
    );
    expect(mentions(check().errors, "clsx")).toBe(true);
  });

  it("requires index.ts in .tsx apps and rejects it in plain-nuxt", () => {
    writeTmpFile(
      dir,
      "examples/plain-nuxt/app/ui/button/index.ts",
      "export {};\n",
    );
    expect(mentions(check().errors, "plain-nuxt")).toBe(true);
    rmSync(join(dir, "examples/plain-nuxt/app/ui/button/index.ts"));
    rmSync(join(dir, "examples/plain-react/src/ui/button/index.ts"));
    expect(mentions(check().errors, "plain-react")).toBe(true);
  });
});
