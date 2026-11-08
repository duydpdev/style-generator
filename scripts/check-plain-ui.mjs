/**
 * `yarn check:plain-ui`: the component-folder contract of the plain examples.
 *
 * For every app in `APPS`, each directory in `uiDir` is one component:
 * - its name is kebab-case (`theme-switch`), and its PascalCase form
 *   (`ThemeSwitch`) names the component file;
 * - `style.ts`, `types.ts` and `<Name><component>` exist, plus
 *   `<Name>.stories.tsx` (or `.stories.ts`) when the app sets `stories`, plus `index.ts` in a
 *   `.tsx` app (a `.vue` app has none, and an `index.ts` there is an error);
 * - its files import relatively only from the folder itself (`./…`) and
 *   from `../../theme`, and import packages only from this allow-list:
 *   `style.ts` takes `@duydpdev/style-generator/{ui,cva,types}`; `types.ts`
 *   and the component file add `react` + `@duydpdev/style-generator/ui-react`
 *   (`.tsx` apps) or `vue` (`.vue` apps); `index.ts` takes no package;
 *   stories take any package except `class-variance-authority`, `clsx` and
 *   `tailwind-merge`, and may also import a sibling folder (`../flex`), so a
 *   layout story renders its children with the app's own components. No file
 *   imports those three directly: the kit wraps them.
 * Each `IDENTICAL` rule names a file that must be byte-identical across its
 * apps. Scope `folder`: `<uiDir>/<folder>/<file>`, compared only for folders
 * present in both apps; a folder that exists in some apps of the rule only is
 * a warning (printed, exit code unchanged), so adding a component to one app
 * is one folder. Scope `app`: `<src dir>/<file>` (`theme.ts`, `options.ts`,
 * `theme/theme.json`), where the src dir is the parent of `uiDir` (`src/`,
 * Nuxt `app/`); a missing file is an error.
 * Every app with `opacities: true` declares `coverage.colors.opacities` twice
 * (the CLI reads `style-gen.config.json`, TypeScript needs the literal in
 * `options.ts`, which imports no JSON so the bundler configs can import it
 * without restarting the dev server on a theme edit): the config file must
 * exist, be byte-identical to the first such app's, and list the same numbers
 * as the `opacities: [...]` literal of the app's `options.ts`.
 *
 * Extension points: append to `APPS`, flip `stories`, append to
 * `IDENTICAL`. Node built-ins only; paths go through node:path.
 *
 * Options: `--root <dir>` checks another tree (tests).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { repoRootFromArgs } from "./doc-markdown.mjs";

/**
 * @typedef {object} PlainApp
 * @property {string} name - Id used by `IDENTICAL` rules
 * @property {string} uiDir - Repo-relative POSIX path holding the component folders
 * @property {".tsx" | ".vue"} component - Extension of the `<Name>` component file
 * @property {false | ".stories.tsx" | ".stories.ts"} stories - `false`, or the suffix of the `<Name><suffix>` story file each folder needs
 * @property {true} [opacities] - The app declares `coverage.colors.opacities` in `options.ts` and in `style-gen.config.json` (the parent of the src dir)
 */

/**
 * @typedef {object} IdenticalRule
 * @property {"folder" | "app"} scope - `folder`: `file` inside each component folder; `app`: `file` relative to the app's src dir (the parent of `uiDir`)
 * @property {string} file - File path inside the folder or the src dir
 * @property {readonly string[]} apps - `PlainApp.name`s whose copies must be byte-identical
 */

/**
 * @typedef {object} FoundApp
 * @property {PlainApp} app - App entry
 * @property {string[]} folders - Sorted component folder names
 */

/** @type {readonly PlainApp[]} */
export const APPS = [
  {
    name: "plain-react",
    uiDir: "examples/plain-react/src/ui",
    component: ".tsx",
    stories: ".stories.tsx",
    opacities: true,
  },
  {
    name: "plain-nuxt",
    uiDir: "examples/plain-nuxt/app/ui",
    component: ".vue",
    stories: ".stories.ts",
    opacities: true,
  },
];

/**
 * `style.ts`, `theme.ts`, `options.ts` and `theme/theme.json` are byte-identical in
 * both apps; the component, `types.ts` and the stories are framework-specific
 * (plain-nuxt writes Vue types and `.stories.ts`), so they are not compared.
 * @type {readonly IdenticalRule[]}
 */
export const IDENTICAL = [
  {
    scope: "folder",
    file: "style.ts",
    apps: ["plain-react", "plain-nuxt"],
  },
  {
    scope: "app",
    file: "theme.ts",
    apps: ["plain-react", "plain-nuxt"],
  },
  {
    scope: "app",
    file: "options.ts",
    apps: ["plain-react", "plain-nuxt"],
  },
  {
    scope: "app",
    file: "theme/theme.json",
    apps: ["plain-react", "plain-nuxt"],
  },
];

const KEBAB = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const THEME_IMPORT = "../../theme";
/** A story may render its sibling components: `../flex`, never a deeper path. */
const SIBLING_IMPORT = /^\.\.\/[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const SPECIFIER = /\b(?:from|import)[\s(]*["']([^"']+)["']/g;
const STYLE_PACKAGES = [
  "@duydpdev/style-generator/ui",
  "@duydpdev/style-generator/cva",
  "@duydpdev/style-generator/types",
];
/** @type {Record<".tsx" | ".vue", readonly string[]>} Added for `types.ts` and the component file. */
const FRAMEWORK_PACKAGES = {
  ".tsx": ["react", "@duydpdev/style-generator/ui-react"],
  ".vue": ["vue"],
};
/** Never imported directly: the kit wraps them. */
const KIT_ONLY = ["class-variance-authority", "clsx", "tailwind-merge"];

/**
 * `button` → `Button`, `theme-switch` → `ThemeSwitch`.
 * @param {string} kebab - Folder name
 * @returns {string} PascalCase component name
 */
export function toPascalCase(kebab) {
  return kebab
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/**
 * `clsx/lite` → `clsx`, `@scope/name/sub` → `@scope/name`.
 * @param {string} spec - A bare import specifier
 * @returns {string} The package name without a subpath
 */
function packageNameOf(spec) {
  const parts = spec.split("/");
  return spec.startsWith("@")
    ? parts.slice(0, 2).join("/")
    : (parts[0] ?? spec);
}

/**
 * Packages one file may import; `null` means any package except `KIT_ONLY` (stories).
 * @param {string} file - File name inside the component folder
 * @param {".tsx" | ".vue"} component - The app's component extension
 * @returns {ReadonlyArray<string> | null} Allow-list
 */
function allowedPackages(file, component) {
  if (/\.stories\.tsx?$/.test(file)) return null;
  if (file === "style.ts") return STYLE_PACKAGES;
  if (file === "index.ts") return [];
  return [...STYLE_PACKAGES, ...FRAMEWORK_PACKAGES[component]];
}

/**
 * Specifiers a file must not import: relative ones other than `./…` (without
 * `..`) and exactly `../../theme`, and packages outside the file's allow-list.
 * @param {string} source - File text
 * @param {string} [file] - File name inside the folder (default `style.ts`, the strictest)
 * @param {".tsx" | ".vue"} [component] - Component extension (default `.tsx`)
 * @returns {string[]} Offending specifiers, in source order
 */
export function foreignImports(source, file = "style.ts", component = ".tsx") {
  const allowed = allowedPackages(file, component);
  return [...source.matchAll(SPECIFIER)]
    .map((match) => match[1] ?? "")
    .filter((spec) => {
      if (spec.startsWith(".")) {
        if (allowed === null && SIBLING_IMPORT.test(spec)) return false;
        return (
          spec !== THEME_IMPORT &&
          (!spec.startsWith("./") || spec.includes(".."))
        );
      }
      return allowed === null
        ? KIT_ONLY.includes(packageNameOf(spec))
        : !allowed.includes(spec);
    });
}

/**
 * Human-readable allow-list of one file, for error messages.
 * @param {string} file - File name inside the component folder
 * @param {".tsx" | ".vue"} component - The app's component extension
 * @returns {string} Allow-list text
 */
function allowedHint(file, component) {
  const allowed = allowedPackages(file, component);
  if (allowed === null) return `any except ${KIT_ONLY.join(", ")}`;
  return allowed.length > 0 ? allowed.join(", ") : "none";
}

/**
 * The src directory of an app: the parent of `uiDir` (`src/`, Nuxt `app/`).
 * @param {PlainApp} app - App entry
 * @returns {string} Repo-relative POSIX path
 */
function srcDir(app) {
  return posix.dirname(app.uiDir);
}

/**
 * Sorted component folder names of one app, or `null` when `uiDir` is missing.
 * @param {string} root - Repository root
 * @param {PlainApp} app - App entry
 * @returns {string[] | null} Folder names
 */
function listFolders(root, app) {
  const dir = join(root, app.uiDir);
  if (!existsSync(dir)) return null;
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/**
 * Layout and import errors of one component folder.
 * @param {string} root - Repository root
 * @param {PlainApp} app - App entry
 * @param {string} folder - Folder name
 * @returns {string[]} Errors
 */
function checkFolder(root, app, folder) {
  const base = `${app.uiDir}/${folder}`;
  if (!KEBAB.test(folder)) return [`${base}: folder name must be kebab-case`];
  const name = toPascalCase(folder);
  const required = ["style.ts", "types.ts", `${name}${app.component}`];
  if (app.component === ".tsx") required.push("index.ts");
  if (app.stories !== false) required.push(`${name}${app.stories}`);
  const errors = required
    .filter((file) => !existsSync(join(root, base, file)))
    .map((file) => `${base}/${file}: missing`);
  if (app.component === ".vue" && existsSync(join(root, base, "index.ts"))) {
    errors.push(`${base}/index.ts: not used in a .vue app`);
  }
  const files = readdirSync(join(root, base), { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
  for (const file of files) {
    const source = readFileSync(join(root, base, file), "utf8");
    const isStory = allowedPackages(file, app.component) === null;
    const relativeHint = `a component folder imports only its own files and ${THEME_IMPORT}`;
    for (const spec of foreignImports(source, file, app.component)) {
      let hint = `allowed packages here: ${allowedHint(file, app.component)}`;
      if (spec.startsWith(".")) {
        hint = isStory
          ? `${relativeHint} (and, in a story, a sibling folder: ../<folder>)`
          : relativeHint;
      }
      errors.push(`${base}/${file}: imports "${spec}"; ${hint}`);
    }
  }
  return errors;
}

/**
 * Pushes an error when two existing files differ (a missing file is reported elsewhere).
 * @param {string} root - Repository root
 * @param {string} refPath - Repo-relative path of the reference copy
 * @param {string} otherPath - Repo-relative path of the copy to compare
 * @param {string[]} errors - Collector
 */
function compare(root, refPath, otherPath, errors) {
  const a = join(root, refPath);
  const b = join(root, otherPath);
  if (!existsSync(a) || !existsSync(b)) return;
  if (!readFileSync(a).equals(readFileSync(b))) {
    errors.push(`${otherPath}: differs from ${refPath}`);
  }
}

/**
 * Compares every path after the first with the first one.
 * @param {string} root - Repository root
 * @param {string[]} paths - Repo-relative paths of the copies, reference first
 * @param {string[]} errors - Collector
 */
function compareAll(root, paths, errors) {
  const [ref, ...others] = paths;
  if (ref === undefined) return;
  for (const other of others) compare(root, ref, other, errors);
}

/**
 * The warning for a folder that exists in some apps of a rule only.
 * @param {FoundApp[]} having - Apps that have the folder
 * @param {FoundApp[]} lacking - Apps that lack it
 * @param {string} folder - Folder name
 * @returns {string} Warning text
 */
function oneSidedWarning(having, lacking, folder) {
  const have = having.map((entry) => `${entry.app.uiDir}/${folder}`);
  const lack = lacking.map((entry) => entry.app.uiDir);
  return `${have.join(", ")}: no such folder in ${lack.join(", ")}; not compared`;
}

/**
 * Errors and warnings of one `IDENTICAL` rule over the apps whose `uiDir` exists.
 * @param {string} root - Repository root
 * @param {Map<string, FoundApp>} found - Apps with an existing `uiDir`
 * @param {IdenticalRule} rule - The rule
 * @returns {{ errors: string[], warnings: string[] }} Problems of this rule
 */
function checkIdentical(root, found, rule) {
  /** @type {string[]} */
  const errors = [];
  /** @type {string[]} */
  const warnings = [];
  const present = rule.apps
    .map((name) => found.get(name))
    .filter((entry) => entry !== undefined);
  if (rule.scope === "app") {
    const files = present.map((entry) => `${srcDir(entry.app)}/${rule.file}`);
    for (const file of files) {
      if (!existsSync(join(root, file))) errors.push(`${file}: missing`);
    }
    compareAll(root, files, errors);
    return { errors, warnings };
  }
  const names = [...new Set(present.flatMap((entry) => entry.folders))].sort();
  for (const folder of names) {
    const having = present.filter((entry) => entry.folders.includes(folder));
    const lacking = present.filter((entry) => !entry.folders.includes(folder));
    if (lacking.length > 0) {
      warnings.push(oneSidedWarning(having, lacking, folder));
    }
    compareAll(
      root,
      having.map((entry) => `${entry.app.uiDir}/${folder}/${rule.file}`),
      errors,
    );
  }
  return { errors, warnings };
}

/** The `opacities: [10, 20]` literal `options.ts` types `tokens.opacities` with. */
const OPACITY_LITERAL = /opacities:\s*\[([^\]]*)\]/;

/**
 * Config and `options.ts` agreement of the apps that set `opacities`.
 * @param {string} root - Repository root
 * @param {readonly PlainApp[]} apps - Apps being checked
 * @param {string[]} errors - Collector
 */
function checkOpacityConfig(root, apps, errors) {
  const withOpacities = apps.filter((app) => app.opacities === true);
  /**
   * @param {PlainApp} app - App entry
   * @returns {string} Repo-relative path of its `style-gen.config.json`
   */
  const configOf = (app) =>
    `${posix.dirname(srcDir(app))}/style-gen.config.json`;
  const [first] = withOpacities;
  if (first === undefined) return;
  for (const app of withOpacities) {
    const configPath = configOf(app);
    if (!existsSync(join(root, configPath))) {
      errors.push(`${configPath}: missing`);
      continue;
    }
    compare(root, configOf(first), configPath, errors);
    const optionsPath = `${srcDir(app)}/options.ts`;
    if (!existsSync(join(root, optionsPath))) continue;
    const literal = OPACITY_LITERAL.exec(
      readFileSync(join(root, optionsPath), "utf8"),
    );
    if (literal === null) {
      errors.push(`${optionsPath}: no opacities literal`);
      continue;
    }
    /** @type {{ coverage?: { colors?: { opacities?: number[] } } } | null} */
    let config;
    try {
      config = JSON.parse(readFileSync(join(root, configPath), "utf8"));
    } catch {
      errors.push(`${configPath}: not valid JSON`);
      continue;
    }
    const fromConfig = config?.coverage?.colors?.opacities;
    const json = (fromConfig ?? []).join(", ");
    const declared = (literal[1] ?? "")
      .split(",")
      .map((step) => step.trim())
      .filter((step) => step !== "")
      .join(", ");
    if (declared !== json) {
      errors.push(
        `${optionsPath}: opacities [${declared}] differ from style-gen.config.json [${json}]`,
      );
    }
  }
}

/**
 * Every contract violation under `root`; warnings never fail the check.
 * @param {string} root - Repository root
 * @param {readonly PlainApp[]} [apps] - Apps to check (default `APPS`)
 * @param {readonly IdenticalRule[]} [identical] - Byte-identity rules (default `IDENTICAL`)
 * @returns {{ errors: string[], warnings: string[] }} Both empty when the tree conforms
 */
export function checkPlainUi(root, apps = APPS, identical = IDENTICAL) {
  /** @type {string[]} */
  const errors = [];
  /** @type {Set<string>} */
  const warnings = new Set();
  /** @type {Map<string, FoundApp>} */
  const found = new Map();
  for (const app of apps) {
    const folders = listFolders(root, app);
    if (folders === null) {
      errors.push(`${app.uiDir}: directory not found`);
      continue;
    }
    if (folders.length === 0) errors.push(`${app.uiDir}: no component folders`);
    found.set(app.name, { app, folders });
    for (const folder of folders)
      errors.push(...checkFolder(root, app, folder));
  }
  const names = new Set(apps.map((app) => app.name));
  for (const rule of identical) {
    const unknown = rule.apps.filter((name) => !names.has(name));
    if (unknown.length > 0) {
      errors.push(
        `IDENTICAL ${rule.file}: unknown app(s) ${unknown.join(", ")}`,
      );
      continue;
    }
    const result = checkIdentical(root, found, rule);
    errors.push(...result.errors);
    for (const warning of result.warnings) warnings.add(warning);
  }
  checkOpacityConfig(root, apps, errors);
  return { errors, warnings: [...warnings] };
}

/** CLI: print warnings, then the problems and set exit code 1, or print OK. */
function main() {
  const root = repoRootFromArgs(process.argv, import.meta.url);
  const { errors, warnings } = checkPlainUi(root);
  for (const warning of warnings)
    console.warn(`check:plain-ui: warning: ${warning}`);
  if (errors.length > 0) {
    console.error(`check:plain-ui: ${String(errors.length)} problem(s)`);
    for (const error of errors) console.error(`  ${error}`);
    process.exitCode = 1;
    return;
  }
  const note =
    warnings.length > 0 ? `, ${String(warnings.length)} warning(s)` : "";
  console.log(
    `check:plain-ui: OK (${APPS.map((app) => app.uiDir).join(", ")}${note})`,
  );
}

const isMain =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
