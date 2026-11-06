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

  /** `options.ts` and `style-gen.config.json` of every opacities app declare the same steps. */
  const THEME_TS = "export const theme = 1;\n";
  const OPTIONS_TS =
    "export const options = { coverage: { colors: { opacities: [10, 20, 50, 80] } } };\n";
  const CONFIG =
    '{ "coverage": { "colors": { "opacities": [10, 20, 50, 80] } } }\n';

  /**
   * The valid fixture: one `button` folder per app of `APPS`, plus the
   * app-scope theme files and the opacity config.
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
      writeTmpFile(root, `${dirname(ui)}/options.ts`, OPTIONS_TS);
      writeTmpFile(root, `${dirname(ui)}/theme/theme.json`, "{}\n");
      writeTmpFile(
        root,
        `${dirname(dirname(ui))}/style-gen.config.json`,
        CONFIG,
      );
    }
  }

  const check = () => mod.checkPlainUi(dir);
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

  it("rejects a next-v4 style.ts that differs", () => {
    writeTmpFile(
      dir,
      "examples/next-v4/src/ui/button/style.ts",
      "export const s = 2;\n",
    );
    expect(mentions(check().errors, "next-v4")).toBe(true);
  });

  it("rejects a next-v4 types.ts that differs", () => {
    writeTmpFile(
      dir,
      "examples/next-v4/src/ui/button/types.ts",
      "export type T = 2;\n",
    );
    expect(mentions(check().errors, "next-v4")).toBe(true);
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

  it("rejects an options.ts that differs in plain-nuxt", () => {
    writeTmpFile(
      dir,
      "examples/plain-nuxt/app/options.ts",
      "export const options = 2;\n",
    );
    expect(mentions(check().errors, "plain-nuxt")).toBe(true);
  });

  it("rejects a missing options.ts", () => {
    rmSync(join(dir, "examples/next-v4/src/options.ts"));
    expect(check().errors).toEqual([
      "examples/next-v4/src/options.ts: missing",
    ]);
  });

  it("rejects a theme.json that differs in next-v4", () => {
    writeTmpFile(dir, "examples/next-v4/src/theme/theme.json", '{"a":1}\n');
    expect(mentions(check().errors, "next-v4")).toBe(true);
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

  it("requires <Name>.stories.tsx in next-v4 and <Name>.stories.ts in plain-nuxt", () => {
    rmSync(join(dir, "examples/next-v4/src/ui/button/Button.stories.tsx"));
    expect(check().errors).toContain(
      "examples/next-v4/src/ui/button/Button.stories.tsx: missing",
    );
    writeTmpFile(
      dir,
      "examples/next-v4/src/ui/button/Button.stories.tsx",
      "export {};\n",
    );
    rmSync(join(dir, "examples/plain-nuxt/app/ui/button/Button.stories.ts"));
    expect(check().errors).toContain(
      "examples/plain-nuxt/app/ui/button/Button.stories.ts: missing",
    );
  });

  it("rejects a next-v4 component story that differs by one byte", () => {
    writeTmpFile(
      dir,
      "examples/next-v4/src/ui/button/Button.stories.tsx",
      "export {}; \n",
    );
    expect(check().errors).toEqual([
      "examples/next-v4/src/ui/button/Button.stories.tsx: differs from examples/plain-react/src/ui/button/Button.stories.tsx",
    ]);
  });

  it("expands <Name> per folder: a second folder is compared under its own name", () => {
    for (const app of ["plain-react", "next-v4"]) {
      const ui = `examples/${app}/src/ui/icon-button`;
      writeTmpFile(dir, `${ui}/style.ts`, "export const s = 1;\n");
      writeTmpFile(dir, `${ui}/types.ts`, "export type T = 1;\n");
      writeTmpFile(dir, `${ui}/IconButton.tsx`, "export {};\n");
      writeTmpFile(dir, `${ui}/index.ts`, "export {};\n");
      writeTmpFile(
        dir,
        `${ui}/IconButton.stories.tsx`,
        `export const a = "${app}";\n`,
      );
    }
    writeTmpFile(
      dir,
      "examples/plain-nuxt/app/ui/icon-button/style.ts",
      "export const s = 1;\n",
    );
    writeTmpFile(
      dir,
      "examples/plain-nuxt/app/ui/icon-button/types.ts",
      "export type T = 1;\n",
    );
    writeTmpFile(
      dir,
      "examples/plain-nuxt/app/ui/icon-button/IconButton.vue",
      "<template />\n",
    );
    writeTmpFile(
      dir,
      "examples/plain-nuxt/app/ui/icon-button/IconButton.stories.ts",
      "export {};\n",
    );
    expect(check().errors).toEqual([
      "examples/next-v4/src/ui/icon-button/IconButton.stories.tsx: differs from examples/plain-react/src/ui/icon-button/IconButton.stories.tsx",
    ]);
  });

  it("lets a story import a sibling folder but not a deeper relative path", () => {
    for (const app of ["plain-react", "next-v4"]) {
      writeTmpFile(
        dir,
        `examples/${app}/src/ui/button/Button.stories.tsx`,
        'import { Flex } from "../flex";\n',
      );
    }
    expect(check().errors).toEqual([]);
    for (const app of ["plain-react", "next-v4"]) {
      writeTmpFile(
        dir,
        `examples/${app}/src/ui/button/Button.stories.tsx`,
        'import { x } from "../../sections/Hero";\n',
      );
    }
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
    rmSync(join(dir, "examples/next-v4/src/ui/button/index.ts"));
    expect(mentions(check().errors, "next-v4")).toBe(true);
  });

  it("requires a style-gen.config.json in every app that declares opacities", () => {
    rmSync(join(dir, "examples/next-v4/style-gen.config.json"));
    expect(check().errors).toEqual([
      "examples/next-v4/style-gen.config.json: missing",
    ]);
  });

  it("rejects a style-gen.config.json that differs from plain-react's", () => {
    writeTmpFile(
      dir,
      "examples/plain-nuxt/style-gen.config.json",
      '{ "coverage": { "colors": { "opacities": [10,20,50,80] } } }\n',
    );
    expect(check().errors).toEqual([
      "examples/plain-nuxt/style-gen.config.json: differs from examples/plain-react/style-gen.config.json",
    ]);
  });

  it("rejects an options.ts whose opacities literal differs from the config", () => {
    writeTmpFile(
      dir,
      "examples/next-v4/src/options.ts",
      "export const options = { coverage: { colors: { opacities: [10, 20, 50] } } };\n",
    );
    expect(check().errors).toEqual([
      "examples/next-v4/src/options.ts: differs from examples/plain-react/src/options.ts",
      "examples/next-v4/src/options.ts: opacities [10, 20, 50] differ from style-gen.config.json [10, 20, 50, 80]",
    ]);
  });

  it("rejects an options.ts without an opacities literal", () => {
    for (const options of [
      "examples/plain-react/src/options.ts",
      "examples/next-v4/src/options.ts",
      "examples/plain-nuxt/app/options.ts",
    ]) {
      writeTmpFile(dir, options, "export const options = {};\n");
    }
    expect(check().errors).toEqual([
      "examples/plain-react/src/options.ts: no opacities literal",
      "examples/next-v4/src/options.ts: no opacities literal",
      "examples/plain-nuxt/app/options.ts: no opacities literal",
    ]);
  });
});
