import fs from "node:fs";
import path from "node:path";

import * as p from "@clack/prompts";

import { isPlainObject } from "../../node/isPlainObject";
import {
  defaultConfig,
  readConfigFile,
  resolveConfig,
} from "../../node/loadStyleGenConfig";
import { resolveProjectPath } from "../../node/resolveProjectPath";
import { logger } from "../logger";
import {
  themeTemplate,
  themeTemplateDark,
  getBundlerSnippet,
  getCssImport,
} from "../templates";

import {
  detectStack,
  type BundlerStack,
  type DetectedStack,
} from "./detectStack";
import { writeConfigSchema, writeThemeSchema } from "./schema";

export interface InitArgs {
  theme?: string;
  dark?: boolean;
  /** Do not write the agent rules file. */
  skipRules?: boolean;
  /** Only write or refresh the agent rules file; scaffold nothing else. */
  rulesOnly?: boolean;
  /**
   * Answer every prompt with its default and never overwrite an existing
   * file (scripts, CI, coding agents).
   */
  yes?: boolean;
}

/** The config's JSON Schema `init` writes in the project root. */
const CONFIG_SCHEMA_FILE = "style-gen.config.schema.json";

/** Agent configuration directory; it holds prose Tailwind must not scan. */
const AGENT_DIR = ".claude";

/** Where `init` writes the agent rules, relative to the project root. */
const RULES_FILE = `${AGENT_DIR}/rules/style-generator.md`;

/** The rules the build emits next to the CLI bundle (`dist/agent/`, see `scripts/emit-agent-rules.mjs`). */
const DEFAULT_RULES_SOURCE = new URL(
  "../agent/style-generator.md",
  import.meta.url,
);

/**
 * Line 1 of a rules file `init` wrote: the HTML comment `agentRulesHeader`
 * (`scripts/agent-rules.mjs`) writes, the package name, then the version.
 */
const RULES_HEADER_RE = /^<!-- @duydpdev\/style-generator (\S+) /;

interface InteractiveConfig {
  themeLoc: string;
  includeDark: boolean;
}

/* ------------------ Helpers ------------------ */

/** Thrown when the user cancels a prompt (Ctrl+C / Esc); `initCommand` maps it to exit code 0. */
export class CancelError extends Error {
  constructor() {
    super("Operation cancelled.");
    this.name = "CancelError";
  }
}

/**
 * Abort the command when a prompt was cancelled.
 * @param {unknown} value The value from the prompt.
 * @throws {CancelError} When the prompt was cancelled.
 */
function handleCancel(value: unknown): void {
  if (p.isCancel(value)) {
    throw new CancelError();
  }
}

/**
 * Ensure directory exists before writing a file.
 * @param {string} filePath The path to the file.
 */
function ensureDir(filePath: string): void {
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Write file and create directory if needed.
 * @param {string} filePath The path where the file will be written.
 * @param {string} content The content to write into the file.
 */
function writeFile(filePath: string, content: string): void {
  ensureDir(filePath);
  fs.writeFileSync(filePath, content, "utf8");
}

/**
 * Read an existing `style-gen.config.json` so `init` can merge into it.
 * @param {string} configPath Absolute path to the config file.
 * @returns {Record<string, unknown>} The parsed config object.
 * @throws {Error} When the file cannot be read as a JSON object.
 */
function readExistingConfig(configPath: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (error) {
    throw new Error(
      "style-gen.config.json could not be read as JSON. Cannot merge; aborting.",
      { cause: error },
    );
  }
  if (!isPlainObject(parsed)) {
    throw new Error(
      "style-gen.config.json is not a JSON object. Cannot merge; aborting.",
    );
  }
  return parsed;
}

/**
 * The `package.json["style-gen"]` section, when it is a JSON object. The
 * `style-gen.config.json` that `init` writes takes precedence over it, so
 * `init` starts from it instead of silently shadowing those settings.
 * @param {string} cwd The project root.
 * @returns {Record<string, unknown> | undefined} A copy of the section.
 */
function readPackageJsonSection(
  cwd: string,
): Record<string, unknown> | undefined {
  const pkgPath = path.resolve(cwd, "package.json");
  if (!fs.existsSync(pkgPath)) return undefined;
  let pkg: unknown;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  } catch {
    return undefined;
  }
  if (!isPlainObject(pkg)) return undefined;
  const section = pkg["style-gen"];
  return isPlainObject(section) ? { ...section } : undefined;
}

interface MergeBase {
  /** Absolute path of `style-gen.config.json`. */
  configPath: string;
  /** Where `content` came from; `undefined` when `init` starts empty. */
  source?: "style-gen.config.json" | "package.json";
  /** The existing config object, as it is: `init` merges `theme`/`output` into it. */
  content: Record<string, unknown>;
}

/**
 * The config `init` merges into: an existing `style-gen.config.json`, else
 * `package.json["style-gen"]`, else nothing. Read before anything is
 * written, so an unreadable config aborts with no file created.
 * @param {string} cwd The project root.
 * @returns {MergeBase} The config path, where the content came from and the content.
 */
function loadMergeBase(cwd: string): MergeBase {
  const configPath = path.resolve(cwd, "style-gen.config.json");
  const source = fs.existsSync(configPath)
    ? ("style-gen.config.json" as const)
    : undefined;
  const existing = source
    ? readExistingConfig(configPath)
    : readPackageJsonSection(cwd);
  if (!existing) return { configPath, content: {} };
  return { configPath, source: source ?? "package.json", content: existing };
}

/**
 * Repo-relative POSIX form of an absolute path under `cwd`, the only form
 * `init` writes to the config or prints.
 * @param {string} cwd - The project root
 * @param {string} abs - An absolute path inside `cwd`
 * @returns {string} e.g. `src/styles/theme.json`
 */
function toRepoPath(cwd: string, abs: string): string {
  return path.relative(cwd, abs).split(path.sep).join("/");
}

/**
 * Whether `dir` exists under the project root.
 * @param {string} cwd - The project root
 * @param {string} dir - Project-relative path
 * @returns {boolean} `true` when the path exists
 */
function projectHas(cwd: string, dir: string): boolean {
  return fs.existsSync(path.resolve(cwd, dir));
}

/** Display names for the next-steps message. */
const STACK_NAMES: Record<BundlerStack, string> = {
  vite: "Vite",
  next: "Next.js",
  nuxt: "Nuxt",
};

/**
 * Default theme location. `styleGenVite` writes only inside the Vite root,
 * which Nuxt 4 sets to `app/`, so a Nuxt theme (and the `theme.css` next to
 * it) defaults to `<srcDir>/assets/css`.
 * @param {DetectedStack} detected - The detected stack
 * @param {string} cwd - The project root
 * @returns {string} Project-relative theme path
 */
function defaultThemeLoc(detected: DetectedStack, cwd: string): string {
  if (detected.stack === "nuxt") {
    return projectHas(cwd, "app")
      ? "app/assets/css/theme.json"
      : "assets/css/theme.json";
  }
  return projectHas(cwd, "src") ? "src/styles/theme.json" : "styles/theme.json";
}

/**
 * Where the first config points the theme: a theme already at the location
 * `generate` reads without a config (`defaultConfig.theme`) stays the theme,
 * so `init` never orphans it behind a second one in the stack's own
 * directory; otherwise the stack's default.
 * @param {DetectedStack} detected - The detected stack
 * @param {string} cwd - The project root
 * @param {ConfigLayout | undefined} config - The valid existing config, which names its own theme
 * @returns {string} Project-relative theme path
 */
function firstConfigTheme(
  detected: DetectedStack,
  cwd: string,
  config: ConfigLayout | undefined,
): string {
  return config === undefined && projectHas(cwd, defaultConfig.theme)
    ? defaultConfig.theme
    : defaultThemeLoc(detected, cwd);
}

/**
 * The CSS entry the stack's starter template uses; only the directory
 * matters, for the relative `@import` path.
 * @param {BundlerStack} stack - The detected stack
 * @param {string} cwd - The project root
 * @returns {string} Project-relative POSIX path
 */
function cssEntryFile(stack: BundlerStack, cwd: string): string {
  if (stack === "vite") {
    return projectHas(cwd, "src") ? "src/index.css" : "index.css";
  }
  if (stack === "next") {
    return projectHas(cwd, "src/app")
      ? "src/app/globals.css"
      : "app/globals.css";
  }
  return projectHas(cwd, "app")
    ? "app/assets/css/main.css"
    : "assets/css/main.css";
}

/**
 * Print what to do after scaffolding: the bundler snippet for the detected
 * stack (never written to the config file), or the CLI fallback.
 * @param {DetectedStack} detected - The detected stack
 * @param {{ theme: string; output: string }} written - Paths written to the config
 * @param {string} written.theme - Project-relative theme file
 * @param {string} written.output - Project-relative generated CSS file
 * @param {string} cwd - The project root
 * @param {boolean} rules - Whether the agent rules file exists (adds `@source not`)
 */
function printNextSteps(
  detected: DetectedStack,
  written: { theme: string; output: string },
  cwd: string,
  rules: boolean,
): void {
  const outDir = path.posix.dirname(written.output);
  const tokensFile = path.posix.join(outDir, "theme.tokens.ts");
  const exclude = rules ? AGENT_DIR : undefined;
  const entry = cssEntryFor(detected, written.output, cwd);
  if (detected.stack === "none") {
    logger.info(
      `📝 Next steps (no vite.config.*, next.config.* or nuxt.config.* found):
   1. Edit ${written.theme} with your design tokens
   2. Write ${written.output} and ${tokensFile}: \`yarn style-gen generate\` (add --watch while you edit the theme)
   3. Import the CSS next to Tailwind from a CSS file in ${outDir}/:`,
    );
    logger.log(getCssImport(cwd, entry, written.output, exclude));
    logger.info(
      `   4. Commit ${tokensFile} and add ${written.output} to .gitignore`,
    );
    printRulesNote(rules);
    return;
  }
  logger.info(
    `📝 Next steps (${STACK_NAMES[detected.stack]}: ${detected.configFile}):
   1. Edit ${written.theme} with your design tokens
   2. Add the plugin to ${detected.configFile} (merge it into your config; init never edits it):`,
  );
  logger.log(getBundlerSnippet(detected));
  logger.info(
    `   3. Import the generated CSS next to Tailwind in ${entry} (or the CSS file in ${path.posix.dirname(entry)}/ that imports Tailwind):`,
  );
  logger.log(getCssImport(cwd, entry, written.output, exclude));
  logger.info(
    `   4. Start the dev server: it writes ${written.output} and ${tokensFile} and rewrites them on every theme or config save`,
  );
  logger.info(
    `   5. Commit ${tokensFile} and add ${written.output} to .gitignore`,
  );
  printRulesNote(rules);
}

/**
 * The CSS file the printed Tailwind lines belong in: the stack's entry, or an
 * `index.css` next to the generated CSS when no bundler config was found.
 * @param {DetectedStack} detected - The detected stack
 * @param {string} output - Project-relative POSIX path of `theme.css`
 * @param {string} cwd - The project root
 * @returns {string} Project-relative POSIX path of the CSS entry
 */
function cssEntryFor(
  detected: DetectedStack,
  output: string,
  cwd: string,
): string {
  return detected.stack === "none"
    ? path.posix.join(path.posix.dirname(output), "index.css")
    : cssEntryFile(detected.stack, cwd);
}

/**
 * The `theme`/`output` of a project's config, resolved the way `generate`
 * reads it: a config without a `theme` key means `styles/theme.json`.
 */
interface ConfigLayout {
  /** `style-gen.config.json` or `package.json`. */
  source: string;
  theme: string;
  output: string;
  /** Why `generate` ignores the config (malformed, schema issues); `theme`/`output` are then the defaults. */
  problem: string | undefined;
}

/**
 * Read the existing config (`style-gen.config.json`, else
 * `package.json#style-gen`) with the defaults `generate` applies.
 * @param {string} cwd - The project root
 * @returns {ConfigLayout | undefined} The layout, or `undefined` without a config
 */
function readConfigLayout(cwd: string): ConfigLayout | undefined {
  const file = readConfigFile(cwd);
  if (file.source === undefined) return undefined;
  const { theme, output } = resolveConfig({}, file);
  return {
    source: file.source,
    theme,
    output,
    problem: file.error ?? file.issues,
  };
}

/**
 * Whether two project-relative paths name the same file.
 * @param {string} cwd - The project root
 * @param {string} a - A path, relative to `cwd` or absolute
 * @param {string} b - Another path
 * @returns {boolean} `true` when both resolve to one absolute path
 */
function samePath(cwd: string, a: string, b: string): boolean {
  return path.resolve(cwd, a) === path.resolve(cwd, b);
}

/**
 * The theme and generated CSS of a project `init` already set up: the
 * `theme`/`output` of a valid existing config, else the theme location and
 * the `theme.css` next to it (what a fresh `init` writes).
 * @param {string} cwd - The project root
 * @param {string} themeLoc - Project-relative POSIX theme location
 * @returns {{ theme: string; output: string }} The layout to print
 */
function existingLayout(
  cwd: string,
  themeLoc: string,
): { theme: string; output: string } {
  const found = readConfigLayout(cwd);
  if (found?.problem === undefined && found !== undefined) return found;
  // An unreadable config only costs the printed paths their accuracy;
  // `generate` reports it with the real error.
  return {
    theme: themeLoc,
    output: path.posix.join(path.posix.dirname(themeLoc), "theme.css"),
  };
}

/**
 * The config `init` can build on: a valid existing one. `--yes` refuses a
 * config it cannot read the theme from, and a `--theme` that disagrees with
 * it: defaults would put a second theme next to the one the config names.
 * Without `--yes`, an explicit `--theme` or a wizard answer is the user's own
 * choice, and an invalid config is merged into as before.
 * @param {InitArgs} args - The CLI arguments
 * @param {string} cwd - The project root
 * @returns {ConfigLayout | undefined} The config, or `undefined` when there is none to keep
 * @throws {Error} Under `--yes`, when the config is invalid or `--theme` names another theme
 */
function usableConfig(args: InitArgs, cwd: string): ConfigLayout | undefined {
  const found = readConfigLayout(cwd);
  if (found === undefined || args.yes !== true) {
    return found?.problem === undefined ? found : undefined;
  }
  if (found.problem !== undefined) {
    throw new Error(
      `${found.source} is invalid, so --yes cannot tell where its theme lives:\n${found.problem}\n💡 Fix it first: yarn style-gen doctor`,
    );
  }
  if (args.theme !== undefined && !samePath(cwd, args.theme, found.theme)) {
    throw new Error(
      `--theme ${args.theme} differs from the theme of ${found.source} (${found.theme}); --yes never redirects an existing config.\n💡 Drop --theme, or run init without --yes to change it`,
    );
  }
  return found;
}

/**
 * The theme location and the dark-mode answer: the wizard's, else the flags',
 * else the config's theme, else the stack's default.
 * @param {InitArgs} args - The CLI arguments
 * @param {ConfigLayout | undefined} config - The config to keep, when there is one
 * @param {string} defaultTheme - The stack's default theme location
 * @param {boolean} isInteractive - Whether a TTY can answer the prompts
 * @returns {Promise<InteractiveConfig>} The theme location and dark-mode choice
 */
async function chooseTheme(
  args: InitArgs,
  config: ConfigLayout | undefined,
  defaultTheme: string,
  isInteractive: boolean,
): Promise<InteractiveConfig> {
  const themeLoc = config?.theme ?? defaultTheme;
  // `--skip-rules` alone still opens the wizard: it asks only for these two.
  if (isInteractive && args.theme === undefined && args.dark === undefined) {
    return getInteractiveConfig(themeLoc);
  }
  return {
    themeLoc: args.theme ?? themeLoc,
    includeDark: args.dark ?? false,
  };
}

/**
 * Resolve the theme path inside the project root. A config's own theme may
 * live outside it (a monorepo's shared theme): that one is returned as the
 * config instead.
 * @param {string} cwd - The project root
 * @param {string} themeLoc - The chosen theme location
 * @param {ConfigLayout | undefined} config - The config to keep, when there is one
 * @returns {string | ConfigLayout} The absolute theme path, or the config naming a theme outside the root
 * @throws {Error} When any other theme path escapes the root
 */
function resolveThemePath(
  cwd: string,
  themeLoc: string,
  config: ConfigLayout | undefined,
): string | ConfigLayout {
  try {
    return resolveProjectPath(cwd, themeLoc.trim(), "theme");
  } catch (error) {
    if (config !== undefined && samePath(cwd, themeLoc.trim(), config.theme)) {
      return config;
    }
    throw error;
  }
}

/** Where `init` writes the theme and its schemas. */
interface ThemeTarget {
  /** Absolute theme path. */
  abs: string;
  /** Repo-relative POSIX theme path (an absolute `--theme` inside the root is stored relative). */
  loc: string;
  /** The theme's schema, next to the theme. */
  schemaAbs: string;
  configSchemaAbs: string;
}

/**
 * @param {string} cwd - The project root
 * @param {string} abs - Absolute theme path inside the root
 * @returns {ThemeTarget} The theme and schema paths, all inside the root
 */
function themeTarget(cwd: string, abs: string): ThemeTarget {
  const loc = toRepoPath(cwd, abs);
  return {
    abs,
    loc,
    schemaAbs: resolveProjectPath(
      cwd,
      path.posix.join(path.posix.dirname(loc), "theme.schema.json"),
      "schema output",
    ),
    configSchemaAbs: resolveProjectPath(
      cwd,
      CONFIG_SCHEMA_FILE,
      "config schema output",
    ),
  };
}

/**
 * Write the config's JSON Schema in the project root unless it is there.
 * @param {string} cwd - The project root
 */
function writeMissingConfigSchema(cwd: string): void {
  const abs = resolveProjectPath(
    cwd,
    CONFIG_SCHEMA_FILE,
    "config schema output",
  );
  if (!fs.existsSync(abs)) writeConfigSchema(cwd, abs);
}

/**
 * Write the theme and the schemas that are missing, or all of them when the
 * user confirmed the overwrite. A file that exists is not touched and not
 * reported. The theme template references "./theme.schema.json" via
 * "$schema", the config "./style-gen.config.schema.json".
 * @param {string} cwd - The project root
 * @param {ThemeTarget} target - Where they go
 * @param {boolean} includeDark - Whether the theme template has the dark axis
 * @param {boolean} overwrite - Replace what exists
 * @returns {number} How many files were written
 */
function writeThemeFiles(
  cwd: string,
  target: ThemeTarget,
  includeDark: boolean,
  overwrite: boolean,
): number {
  let wrote = 0;
  if (overwrite || !fs.existsSync(target.abs)) {
    writeFile(target.abs, includeDark ? themeTemplateDark : themeTemplate);
    logger.success(`Created ${target.loc}`);
    wrote++;
  }
  if (overwrite || !fs.existsSync(target.schemaAbs)) {
    writeThemeSchema(cwd, target.schemaAbs);
    wrote++;
  }
  if (overwrite || !fs.existsSync(target.configSchemaAbs)) {
    writeConfigSchema(cwd, target.configSchemaAbs);
    wrote++;
  }
  return wrote;
}

/**
 * Settle the config: one that already names this theme stays as it is
 * (`package.json#style-gen` included, so no `style-gen.config.json` shadows
 * it); otherwise `theme` and `output` are merged into it, or a new one is
 * written.
 * @param {string} cwd - The project root
 * @param {MergeBase} mergeBase - The existing config content, if any
 * @param {ConfigLayout | undefined} config - The valid existing config, if any
 * @param {string} themeLoc - Repo-relative POSIX path of the theme
 * @returns {{ layout: { theme: string; output: string }; changed: boolean }} The theme and output in effect, and whether a config file was written
 */
function updateConfig(
  cwd: string,
  mergeBase: MergeBase,
  config: ConfigLayout | undefined,
  themeLoc: string,
): { layout: { theme: string; output: string }; changed: boolean } {
  if (config !== undefined && samePath(cwd, themeLoc, config.theme)) {
    logger.info(`Kept ${config.source}: theme and output stay as configured.`);
    return { layout: config, changed: false };
  }
  const written = {
    theme: themeLoc,
    output: path.posix.join(path.posix.dirname(themeLoc), "theme.css"),
  };
  writeFile(
    mergeBase.configPath,
    JSON.stringify(
      {
        ...configSchemaRef(mergeBase.content),
        ...mergeBase.content,
        ...written,
      },
      null,
      2,
    ),
  );
  logger.success(
    `${mergeBase.source === "style-gen.config.json" ? "Updated" : "Created"} style-gen.config.json`,
  );
  if (mergeBase.source === "package.json") {
    logger.info(
      'Copied package.json["style-gen"] into style-gen.config.json, which takes precedence from now on; remove the package.json section.',
    );
  }
  return { layout: written, changed: true };
}

/**
 * One line on the agent rules file, when it is present.
 * @param {boolean} rules - Whether `.claude/rules/style-generator.md` exists
 */
function printRulesNote(rules: boolean): void {
  if (!rules) return;
  logger.info(
    `   Coding agents read ${RULES_FILE}; \`@source not\` keeps its example classes out of your CSS.`,
  );
}

/* ------------------ Interactive Prompts ------------------ */

/**
 * Prompt user interactively for configuration.
 * @param {string} defaultTheme - The stack's default theme location
 * @returns {Promise<InteractiveConfig>} The collected configuration.
 */
async function getInteractiveConfig(
  defaultTheme: string,
): Promise<InteractiveConfig> {
  p.intro("🚀 style-gen init");

  const themeRes = await p.text({
    message: "Theme file location?",
    initialValue: defaultTheme,
    placeholder: defaultTheme,
  });
  handleCancel(themeRes);

  const darkRes = await p.confirm({
    message: "Include dark mode template?",
    initialValue: false,
  });
  handleCancel(darkRes);

  const theme = themeRes as string;
  const dark = darkRes as boolean;

  return {
    themeLoc: theme || defaultTheme,
    includeDark: dark,
  };
}

/**
 * Decide whether existing scaffold files may be replaced.
 * @param {boolean} isInteractive - Whether a TTY can answer the prompt
 * @param {boolean} yes - `--yes`: keep the files that exist and write only the missing ones, instead of asking or failing
 * @returns {Promise<"overwrite" | "fill" | "kept" | "refused">} The outcome
 */
async function confirmOverwrite(
  isInteractive: boolean,
  yes: boolean,
): Promise<"overwrite" | "fill" | "kept" | "refused"> {
  if (yes) {
    logger.info("Existing files kept (--yes never overwrites).");
    return "fill";
  }
  if (!isInteractive) {
    logger.error(
      "Files already exist. Run interactively to confirm overwrite.",
    );
    return "refused";
  }
  const overwrite = await p.confirm({
    message: "Theme or schema already exists. Overwrite?",
    initialValue: false,
  });
  handleCancel(overwrite);
  if (overwrite) return "overwrite";
  logger.info("Operation cancelled. Existing files kept.");
  return "kept";
}

/**
 * Write the agent rules file: create it when absent, leave an identical copy,
 * and replace a changed one only after an interactive confirm. A build
 * without the rules (no `dist/agent/`) warns instead of failing `init`.
 * @param {string} cwd - The project root
 * @param {string | URL} source - The rules file shipped with this version
 * @param {boolean} isInteractive - Whether a TTY can answer the prompt
 * @returns {Promise<boolean>} Whether the rules file exists afterwards
 */
async function writeAgentRules(
  cwd: string,
  source: string | URL,
  isInteractive: boolean,
): Promise<boolean> {
  const target = resolveProjectPath(cwd, RULES_FILE, "rules");
  let rules: string;
  try {
    rules = fs.readFileSync(source, "utf8");
  } catch {
    logger.warn(`This build ships no agent rules; ${RULES_FILE} not written.`);
    return fs.existsSync(target);
  }
  if (!fs.existsSync(target)) {
    writeFile(target, rules);
    logger.success(`Created ${RULES_FILE}`);
    return true;
  }
  const existing = fs.readFileSync(target, "utf8");
  // A checkout with CRLF line endings is still this version's file.
  if (existing.replaceAll("\r\n", "\n") === rules) {
    logger.info(`Rules up to date: ${RULES_FILE}`);
    return true;
  }
  // A copy `init` stamped with another version is ours to replace: upgrading
  // must refresh it without a terminal (coding agents run init in a shell).
  // Same version with other content, or no stamp, means someone edited it.
  const from = RULES_HEADER_RE.exec(existing)?.[1];
  const to = RULES_HEADER_RE.exec(rules)?.[1];
  if (from !== undefined && to !== undefined && from !== to) {
    writeFile(target, rules);
    logger.success(`Updated ${RULES_FILE} (${from} → ${to})`);
    return true;
  }
  if (!isInteractive) {
    logger.info(
      `${RULES_FILE} was edited; kept. Run \`style-gen init --rules-only\` in an interactive terminal to replace it.`,
    );
    return true;
  }
  const overwrite = await p.confirm({
    message: `${RULES_FILE} was edited. Replace it with this version's rules?`,
    initialValue: true,
  });
  // The theme and config may already be written: a cancel here keeps the
  // file and lets init print the next steps instead of aborting.
  if (overwrite === true) {
    writeFile(target, rules);
    logger.success(`Updated ${RULES_FILE}`);
  } else {
    logger.info(`Kept ${RULES_FILE}`);
  }
  return true;
}

/**
 * The agent rules step of `init`: honours `--skip-rules`, else writes them.
 * @param {InitArgs} args - The CLI arguments
 * @param {string} cwd - The project root
 * @param {string | URL} source - The rules file shipped with this version
 * @param {boolean} isInteractive - Whether a TTY can answer the prompt
 * @returns {Promise<boolean>} Whether the rules file exists afterwards
 */
async function applyAgentRules(
  args: InitArgs,
  cwd: string,
  source: string | URL,
  isInteractive: boolean,
): Promise<boolean> {
  if (args.skipRules) {
    return fs.existsSync(resolveProjectPath(cwd, RULES_FILE, "rules"));
  }
  return writeAgentRules(cwd, source, isInteractive);
}

/**
 * `init --rules-only`: write or refresh the rules and print the CSS lines
 * that keep Tailwind out of `.claude/`; the theme and config stay as they are.
 * @param {DetectedStack} detected - The detected stack
 * @param {string} cwd - The project root
 * @param {string | URL} source - The rules file shipped with this version
 * @param {boolean} isInteractive - Whether a TTY can answer the prompt
 */
async function refreshRulesOnly(
  detected: DetectedStack,
  cwd: string,
  source: string | URL,
  isInteractive: boolean,
): Promise<void> {
  if (!(await writeAgentRules(cwd, source, isInteractive))) return;
  const { output } = existingLayout(cwd, defaultThemeLoc(detected, cwd));
  const entry = cssEntryFor(detected, output, cwd);
  logger.info(
    `Keep these lines in ${entry} (or the CSS file in ${path.posix.dirname(entry)}/ that imports Tailwind):`,
  );
  logger.log(getCssImport(cwd, entry, output, AGENT_DIR));
  printRulesNote(true);
}

/* ------------------ Command ------------------ */

/**
 * The config's `$schema` pointer, which goes first; a pointer the user wrote
 * stays where it is.
 * @param {Record<string, unknown>} content The existing config content.
 * @returns {{ $schema?: string }} The key to put first, or nothing.
 */
function configSchemaRef(content: Record<string, unknown>): {
  $schema?: string;
} {
  return content.$schema === undefined
    ? { $schema: `./${CONFIG_SCHEMA_FILE}` }
    : {};
}

/**
 * `init --rules-only`: refuse the flags that scaffold, else refresh the rules.
 * @param {InitArgs} args The initial CLI arguments.
 * @param {DetectedStack} detected The detected stack.
 * @param {string} cwd The project root.
 * @param {string | URL} rulesSource The agent rules file to copy.
 * @param {boolean} isInteractive Whether a TTY can answer the prompt.
 * @returns {Promise<number>} The exit code.
 */
async function runRulesOnly(
  args: InitArgs,
  detected: DetectedStack,
  cwd: string,
  rulesSource: string | URL,
  isInteractive: boolean,
): Promise<number> {
  if (
    args.skipRules === true ||
    args.theme !== undefined ||
    args.dark !== undefined
  ) {
    logger.error(
      "--rules-only cannot be combined with --theme, --dark or --skip-rules.",
    );
    return 1;
  }
  await refreshRulesOnly(detected, cwd, rulesSource, isInteractive);
  return 0;
}

/**
 * The scaffolding itself; failures throw, `initCommand` turns them into
 * exit codes.
 * @param {InitArgs} args The initial CLI arguments.
 * @param {string} cwd The project root.
 * @param {string | URL} rulesSource The agent rules file to copy.
 * @returns {Promise<number>} The exit code.
 */
async function scaffold(
  args: InitArgs,
  cwd: string,
  rulesSource: string | URL,
): Promise<number> {
  const yes = args.yes === true;
  // `--yes` answers every prompt with its default, so it never asks.
  const isInteractive = !yes && process.stdin.isTTY;

  const detected = detectStack(cwd);

  if (args.rulesOnly) {
    return runRulesOnly(args, detected, cwd, rulesSource, isInteractive);
  }

  // Read before anything is written, so an unreadable config aborts with no
  // file created.
  const mergeBase = loadMergeBase(cwd);
  const config = usableConfig(args, cwd);
  const defaultTheme = firstConfigTheme(detected, cwd, config);
  const choice = await chooseTheme(args, config, defaultTheme, isInteractive);

  const resolved = resolveThemePath(cwd, choice.themeLoc, config);
  if (typeof resolved !== "string") {
    // A shared theme outside the root (monorepo): `init` writes neither the
    // theme nor its schema; the config schema lives in the root.
    logger.info(
      `The theme of ${resolved.source} (${resolved.theme}) is outside the project root: init writes no theme or theme schema for it.`,
    );
    writeMissingConfigSchema(cwd);
    const rules = await applyAgentRules(args, cwd, rulesSource, isInteractive);
    printNextSteps(detected, resolved, cwd, rules);
    return 0;
  }
  const target = themeTarget(cwd, resolved);

  const proceed = [target.abs, target.schemaAbs, target.configSchemaAbs].some(
    fs.existsSync,
  )
    ? await confirmOverwrite(isInteractive, yes)
    : "overwrite";
  if (proceed === "refused") return 1;
  // Keeping the theme still refreshes the rules: re-running init after an
  // upgrade is how they are updated. A declined overwrite keeps everything,
  // the config included.
  if (proceed === "kept") {
    const rules = await applyAgentRules(args, cwd, rulesSource, isInteractive);
    printNextSteps(detected, existingLayout(cwd, target.loc), cwd, rules);
    return 0;
  }

  const wrote = writeThemeFiles(
    cwd,
    target,
    choice.includeDark,
    proceed === "overwrite",
  );
  const settled = updateConfig(cwd, mergeBase, config, target.loc);

  /* ---------- Agent rules ---------- */

  const rules = await applyAgentRules(args, cwd, rulesSource, isInteractive);

  /* ---------- Next steps ---------- */

  logger.info(
    wrote === 0 && !settled.changed
      ? "Nothing to do: the theme, its schemas and the config are already in place."
      : "✅ Tailwind v4 configuration scaffolded successfully",
  );
  printNextSteps(detected, settled.layout, cwd, rules);

  if (isInteractive) {
    p.outro("You're all set!");
  }
  return 0;
}

/**
 * Initialize project scaffolding for style-gen. Never exits the process: a
 * cancelled prompt returns 0 (after printing the cancel message), any other
 * failure is logged and returns 1.
 * @param {InitArgs} args The initial CLI arguments.
 * @param {string} [cwd] The project root; defaults to `process.cwd()`.
 * @param {string | URL} [rulesSource] The agent rules file to copy; defaults to the one this build ships.
 * @returns {Promise<number>} The process exit code.
 */
export async function initCommand(
  args: InitArgs,
  cwd: string = process.cwd(),
  rulesSource: string | URL = DEFAULT_RULES_SOURCE,
): Promise<number> {
  try {
    return await scaffold(args, cwd, rulesSource);
  } catch (error) {
    if (error instanceof CancelError) {
      p.cancel(error.message);
      return 0;
    }
    logger.error(error instanceof Error ? error.message : "Unknown error");
    return 1;
  }
}
