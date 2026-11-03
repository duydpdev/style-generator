import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "..", "..");
const script = join(repoRoot, "scripts", "check-plain-ui.mjs");

interface PlainApp {
  readonly name: string;
  readonly uiDir: string;
  readonly component: ".tsx" | ".vue";
  readonly stories: boolean;
}
interface IdenticalRule {
  readonly scope: "folder" | "app";
  readonly file: string;
  readonly apps: readonly string[];
}
interface Report {
  readonly errors: string[];
  readonly warnings: string[];
}
/** The script's exports this test calls (the root tsconfig has no allowJs). */
interface CheckPlainUiModule {
  readonly checkPlainUi: (
    root: string,
    apps?: readonly PlainApp[],
    identical?: readonly IdenticalRule[],
  ) => Report;
}

const REACT: PlainApp = {
  name: "react",
  uiDir: "apps/react/ui",
  component: ".tsx",
  stories: false,
};
const NEXT: PlainApp = {
  name: "next",
  uiDir: "apps/next/ui",
  component: ".tsx",
  stories: false,
};
const VUE: PlainApp = {
  name: "vue",
  uiDir: "apps/vue/ui",
  component: ".vue",
  stories: false,
};
/** The real entry of `APPS`, so the CLI (which checks `APPS`) sees a fixture tree. */
const PLAIN: PlainApp = {
  name: "plain-react",
  uiDir: "examples/plain-react/src/ui",
  component: ".tsx",
  stories: false,
};

// Errors with the hint after the first `;` removed.
const heads = (errors: readonly string[]) =>
  errors.map((error) => error.split(";")[0]);

/**
 * Write `content` to `<root>/<rel>`, creating parent directories.
 * @param {string} root - Fixture root
 * @param {string} rel - Root-relative POSIX path
 * @param {string} content - File text
 */
function put(root: string, rel: string, content: string) {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), content);
}

/**
 * A conforming component folder (`index.ts` only in a `.tsx` app).
 * @param {string} root - Fixture root
 * @param {PlainApp} app - App entry
 * @param {string} folder - Kebab-case folder name
 * @param {string} name - PascalCase component name
 * @param {string} style - `style.ts` text
 */
function component(
  root: string,
  app: PlainApp,
  folder: string,
  name: string,
  style = "export const s = 1;\n",
) {
  put(root, `${app.uiDir}/${folder}/style.ts`, style);
  put(root, `${app.uiDir}/${folder}/types.ts`, "export type T = number;\n");
  put(
    root,
    `${app.uiDir}/${folder}/${name}${app.component}`,
    'import { s } from "./style";\nimport { cn } from "../../theme";\nexport default [s, cn];\n',
  );
  if (app.component === ".tsx") {
    put(
      root,
      `${app.uiDir}/${folder}/index.ts`,
      `export { ${name} } from "./${name}";\n`,
    );
  }
}

describe("integration: scripts/check-plain-ui.mjs", () => {
  let dir: string;
  let mod: CheckPlainUiModule;

  beforeAll(async () => {
    mod = (await import(pathToFileURL(script).href)) as CheckPlainUiModule;
  });
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "sg-plain-ui-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("passes on the repository", () => {
    const result = spawnSync(process.execPath, [script], { encoding: "utf8" });
    expect(`${result.stdout}${result.stderr}`).toContain("check:plain-ui: OK");
    expect(result.status).toBe(0);
  });

  it("passes a complete folder; a kebab name maps to the PascalCase file", () => {
    component(dir, REACT, "theme-switch", "ThemeSwitch");
    component(dir, VUE, "button", "Button");
    expect(mod.checkPlainUi(dir, [REACT, VUE], [])).toEqual({
      errors: [],
      warnings: [],
    });
  });

  it("reports a missing file, and the CLI exits 1 on it", () => {
    component(dir, PLAIN, "button", "Button");
    rmSync(join(dir, PLAIN.uiDir, "button", "types.ts"));
    expect(mod.checkPlainUi(dir, [PLAIN], []).errors).toEqual([
      "examples/plain-react/src/ui/button/types.ts: missing",
    ]);
    const result = spawnSync(process.execPath, [script, "--root", dir], {
      encoding: "utf8",
    });
    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toContain(
      "examples/plain-react/src/ui/button/types.ts: missing",
    );
  });

  it("requires <Name>.stories.tsx only when the app sets stories", () => {
    component(dir, REACT, "box", "Box");
    expect(mod.checkPlainUi(dir, [REACT], []).errors).toEqual([]);
    expect(
      mod.checkPlainUi(dir, [{ ...REACT, stories: true }], []).errors,
    ).toEqual(["apps/react/ui/box/Box.stories.tsx: missing"]);
  });

  it("requires index.ts in a .tsx app and rejects it in a .vue app", () => {
    component(dir, REACT, "box", "Box");
    component(dir, VUE, "button", "Button");
    expect(mod.checkPlainUi(dir, [REACT, VUE], []).errors).toEqual([]);
    rmSync(join(dir, REACT.uiDir, "box", "index.ts"));
    put(dir, `${VUE.uiDir}/button/index.ts`, "export {};\n");
    expect(mod.checkPlainUi(dir, [REACT, VUE], []).errors).toEqual([
      "apps/react/ui/box/index.ts: missing",
      "apps/vue/ui/button/index.ts: not used in a .vue app",
    ]);
  });

  it("rejects a folder name that is not kebab-case, a missing uiDir and an empty one", () => {
    component(dir, REACT, "Box", "Box");
    mkdirSync(join(dir, NEXT.uiDir), { recursive: true });
    expect(mod.checkPlainUi(dir, [REACT, NEXT, VUE], []).errors).toEqual([
      "apps/react/ui/Box: folder name must be kebab-case",
      "apps/next/ui: no component folders",
      "apps/vue/ui: directory not found",
    ]);
  });

  it("rejects relative imports that leave the folder", () => {
    component(dir, REACT, "flex", "Flex");
    put(
      dir,
      `${REACT.uiDir}/flex/index.ts`,
      'export { Flex } from "./Flex";\nexport * from "../box/style";\nimport("./../box");\nimport { theme } from "../../theme";\n',
    );
    expect(mod.checkPlainUi(dir, [REACT], []).errors).toEqual([
      'apps/react/ui/flex/index.ts: imports "../box/style"; a component folder imports only its own files and ../../theme',
      'apps/react/ui/flex/index.ts: imports "./../box"; a component folder imports only its own files and ../../theme',
    ]);
  });

  it("limits package imports per file kind", () => {
    component(dir, REACT, "box", "Box");
    const box = `${REACT.uiDir}/box`;
    put(
      dir,
      `${box}/style.ts`,
      'import { recipeFromTables } from "@duydpdev/style-generator/ui";\nimport { createVariantMapper } from "@duydpdev/style-generator/cva";\nimport type { TextVariant } from "@duydpdev/style-generator/types";\nimport { tokens } from "../../theme";\n',
    );
    put(
      dir,
      `${box}/types.ts`,
      'import type { Polymorphic } from "@duydpdev/style-generator/ui-react";\nimport type { ElementType } from "react";\n',
    );
    put(
      dir,
      `${box}/Box.stories.tsx`,
      'import type { Meta } from "@storybook/react-vite";\nimport { Box } from "./Box";\n',
    );
    expect(mod.checkPlainUi(dir, [REACT], []).errors).toEqual([]);

    put(
      dir,
      `${box}/style.ts`,
      'import { cva } from "class-variance-authority";\nimport clsx from "clsx";\nimport type { ElementType } from "react";\nimport { createCn } from "@duydpdev/style-generator/ui";\n',
    );
    put(
      dir,
      `${box}/Box.tsx`,
      'import { twMerge } from "tailwind-merge";\nimport { useState } from "react";\nimport { s } from "./style";\n',
    );
    put(dir, `${box}/Box.stories.tsx`, 'import clsx from "clsx";\n');
    expect(heads(mod.checkPlainUi(dir, [REACT], []).errors)).toEqual([
      'apps/react/ui/box/Box.stories.tsx: imports "clsx"',
      'apps/react/ui/box/Box.tsx: imports "tailwind-merge"',
      'apps/react/ui/box/style.ts: imports "class-variance-authority"',
      'apps/react/ui/box/style.ts: imports "clsx"',
      'apps/react/ui/box/style.ts: imports "react"',
    ]);

    component(dir, VUE, "button", "Button");
    put(
      dir,
      `${VUE.uiDir}/button/Button.vue`,
      'import { computed } from "vue";\nimport { s } from "./style";\n',
    );
    expect(mod.checkPlainUi(dir, [VUE], []).errors).toEqual([]);
    put(
      dir,
      `${VUE.uiDir}/button/Button.vue`,
      'import { useState } from "react";\n',
    );
    expect(heads(mod.checkPlainUi(dir, [VUE], []).errors)).toEqual([
      'apps/vue/ui/button/Button.vue: imports "react"',
    ]);
  });

  it("exits 1 on a forbidden package import", () => {
    component(
      dir,
      PLAIN,
      "button",
      "Button",
      'import clsx from "clsx";\nexport const s = clsx;\n',
    );
    const result = spawnSync(process.execPath, [script, "--root", dir], {
      encoding: "utf8",
    });
    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toContain(
      'examples/plain-react/src/ui/button/style.ts: imports "clsx"',
    );
  });

  it("byte identity (folder scope): equal copies pass, a differing copy fails", () => {
    const rule: IdenticalRule = {
      scope: "folder",
      file: "style.ts",
      apps: ["react", "next", "vue"],
    };
    component(dir, REACT, "button", "Button");
    component(dir, NEXT, "button", "Button");
    component(dir, VUE, "button", "Button");
    expect(mod.checkPlainUi(dir, [REACT, NEXT, VUE], [rule])).toEqual({
      errors: [],
      warnings: [],
    });

    put(dir, `${VUE.uiDir}/button/style.ts`, "export const s = 2;\n");
    expect(mod.checkPlainUi(dir, [REACT, NEXT, VUE], [rule])).toEqual({
      errors: [
        "apps/vue/ui/button/style.ts: differs from apps/react/ui/button/style.ts",
      ],
      warnings: [],
    });
  });

  it("a folder in some apps only is one warning, not an error", () => {
    const rules: IdenticalRule[] = [
      { scope: "folder", file: "style.ts", apps: ["react", "next"] },
      { scope: "folder", file: "types.ts", apps: ["react", "next"] },
    ];
    component(dir, REACT, "button", "Button");
    component(dir, NEXT, "button", "Button");
    component(dir, NEXT, "card", "Card");
    expect(mod.checkPlainUi(dir, [REACT, NEXT], rules)).toEqual({
      errors: [],
      warnings: [
        "apps/next/ui/card: no such folder in apps/react/ui; not compared",
      ],
    });
  });

  it("byte identity (app scope): theme.ts and theme/theme.json across apps", () => {
    const rules: IdenticalRule[] = [
      { scope: "app", file: "theme.ts", apps: ["react", "next", "vue"] },
      {
        scope: "app",
        file: "theme/theme.json",
        apps: ["react", "next", "vue"],
      },
    ];
    for (const app of [REACT, NEXT, VUE]) {
      component(dir, app, "button", "Button");
      put(dir, `apps/${app.name}/theme.ts`, "export const cn = 1;\n");
      put(dir, `apps/${app.name}/theme/theme.json`, "{}\n");
    }
    expect(mod.checkPlainUi(dir, [REACT, NEXT, VUE], rules).errors).toEqual([]);

    put(dir, "apps/vue/theme/theme.json", '{"a":1}\n');
    rmSync(join(dir, "apps/next/theme.ts"));
    expect(mod.checkPlainUi(dir, [REACT, NEXT, VUE], rules).errors).toEqual([
      "apps/next/theme.ts: missing",
      "apps/vue/theme/theme.json: differs from apps/react/theme/theme.json",
    ]);
  });

  it("reports an IDENTICAL rule that names an unknown app", () => {
    component(dir, REACT, "box", "Box");
    expect(
      mod.checkPlainUi(
        dir,
        [REACT],
        [{ scope: "folder", file: "style.ts", apps: ["react", "nuxt"] }],
      ).errors,
    ).toEqual(["IDENTICAL style.ts: unknown app(s) nuxt"]);
  });
});
