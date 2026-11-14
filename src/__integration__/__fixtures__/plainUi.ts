import { writeTmpFile } from "./tmpProject";

export interface PlainApp {
  readonly name: string;
  readonly uiDir: string;
  readonly component: ".tsx" | ".vue";
  readonly stories: false | ".stories.tsx" | ".stories.ts";
}
export interface IdenticalRule {
  readonly scope: "folder" | "app";
  readonly file: string;
  readonly apps: readonly string[];
}
export interface Report {
  readonly errors: string[];
  readonly warnings: string[];
}
/** The script's exports this test calls (the root tsconfig has no allowJs). */
export interface CheckPlainUiModule {
  readonly APPS: readonly PlainApp[];
  readonly IDENTICAL: readonly IdenticalRule[];
  readonly checkPlainUi: (
    root: string,
    apps?: readonly PlainApp[],
    identical?: readonly IdenticalRule[],
  ) => Report;
}

export const REACT: PlainApp = {
  name: "react",
  uiDir: "apps/react/ui",
  component: ".tsx",
  stories: false,
};
export const NEXT: PlainApp = {
  name: "next",
  uiDir: "apps/next/ui",
  component: ".tsx",
  stories: false,
};
export const VUE: PlainApp = {
  name: "vue",
  uiDir: "apps/vue/ui",
  component: ".vue",
  stories: false,
};
/** The real entry of `APPS`, so the CLI (which checks `APPS`) sees a fixture tree. */
export const PLAIN: PlainApp = {
  name: "plain-react",
  uiDir: "examples/plain-react/src/ui",
  component: ".tsx",
  stories: false,
};

// Errors with the hint after the first `;` removed.
export const heads = (errors: readonly string[]) =>
  errors.map((error) => error.split(";")[0]);

/**
 * A conforming component folder (`index.ts` only in a `.tsx` app).
 * @param {string} root - Fixture root
 * @param {PlainApp} app - App entry
 * @param {string} folder - Kebab-case folder name
 * @param {string} name - PascalCase component name
 * @param {string} style - `style.ts` text
 */
export function component(
  root: string,
  app: PlainApp,
  folder: string,
  name: string,
  style = "export const s = 1;\n",
) {
  writeTmpFile(root, `${app.uiDir}/${folder}/style.ts`, style);
  writeTmpFile(
    root,
    `${app.uiDir}/${folder}/types.ts`,
    "export type T = number;\n",
  );
  writeTmpFile(
    root,
    `${app.uiDir}/${folder}/${name}${app.component}`,
    'import { s } from "./style";\nimport { cn } from "../../theme";\nexport default [s, cn];\n',
  );
  if (app.component === ".tsx") {
    writeTmpFile(
      root,
      `${app.uiDir}/${folder}/index.ts`,
      `export { ${name} } from "./${name}";\n`,
    );
  }
}
