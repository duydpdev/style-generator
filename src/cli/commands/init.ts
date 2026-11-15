import fs from "node:fs";
import path from "node:path";

import * as p from "@clack/prompts";

import { isPlainObject } from "../../node/isPlainObject";
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
import { schemaCommand } from "./schema";

export interface InitArgs {
  theme?: string;
  dark?: boolean;
  /** Do not write the agent rules file. */
  skipRules?: boolean;
  /** Only write or refresh the agent rules file; scaffold nothing else. */
  rulesOnly?: boolean;
}

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
  /** Keys `init` merges `theme`/`output` into: every existing key except the {@link REMOVED_CONFIG_KEYS}. */
  content: Record<string, unknown>;
  /** The removed keys found in the existing config and dropped from `content`, in {@link REMOVED_CONFIG_KEYS} order. */
  dropped: readonly (typeof REMOVED_CONFIG_KEYS)[number][];
  /** The string entries of a dropped `extraSources`, to print as `@source inline(...)` lines. */
  droppedSources: readonly string[];
}

/**
 * Config keys the schema used to accept and now rejects, with the major that
 * removed them. `init` drops them while merging: the merged file must load.
 */
const REMOVED_CONFIG_KEYS = [
  { key: "plugin", since: "6.0" },
  { key: "extraSources", since: "7.0" },
  { key: "axes", since: "7.0" },
] as const;

/**
 * The config `init` merges into: an existing `style-gen.config.json`, else
 * `package.json["style-gen"]`, else nothing. Read before anything is
 * written, so an unreadable config aborts with no file created. The
 * {@link REMOVED_CONFIG_KEYS} are dropped: the schema rejects them, and the
 * merged file must load.
 * @param {string} cwd The project root.
 * @returns {MergeBase} The config path, the keys to keep and the removed keys that were dropped.
 */
function loadMergeBase(cwd: string): MergeBase {
  const configPath = path.resolve(cwd, "style-gen.config.json");
  const source = fs.existsSync(configPath)
    ? ("style-gen.config.json" as const)
    : undefined;
  const existing = source
    ? readExistingConfig(configPath)
    : readPackageJsonSection(cwd);
  if (!existing) {
    return { configPath, content: {}, dropped: [], droppedSources: [] };
  }
  const dropped = REMOVED_CONFIG_KEYS.filter(({ key }) =>
    Object.hasOwn(existing, key),
  );
  const content = Object.fromEntries(
    Object.entries(existing).filter(
      ([key]) => !dropped.some((removed) => removed.key === key),
    ),
  );
  const sources = existing.extraSources;
  return {
    configPath,
    source: source ?? "package.json",
    content,
    dropped,
    droppedSources: Array.isArray(sources)
      ? sources.filter((entry): entry is string => typeof entry === "string")
      : [],
  };
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
 * The theme and generated CSS of a project `init` already set up: the
 * `theme`/`output` of the existing config, else the theme location and the
 * `theme.css` next to it (what a fresh `init` writes).
 * @param {string} cwd - The project root
 * @param {string} themeLoc - Project-relative POSIX theme location
 * @returns {{ theme: string; output: string }} The layout to print
 */
function existingLayout(
  cwd: string,
  themeLoc: string,
): { theme: string; output: string } {
  let content: Record<string, unknown> = {};
  try {
    ({ content } = loadMergeBase(cwd));
  } catch {
    // An unreadable config only costs the printed paths their accuracy;
    // `generate` reports it with the real error.
  }
  const theme = typeof content.theme === "string" ? content.theme : themeLoc;
  const output =
    typeof content.output === "string"
      ? content.output
      : path.posix.join(path.posix.dirname(theme), "theme.css");
  return { theme, output };
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
 * @returns {Promise<"overwrite" | "kept" | "refused">} The outcome
 */
async function confirmOverwrite(
  isInteractive: boolean,
): Promise<"overwrite" | "kept" | "refused"> {
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
 * Tell the user which removed keys `init` dropped from the merged config,
 * and print the former `extraSources` entries as CSS to paste instead.
 * @param {MergeBase} mergeBase The merge base `loadMergeBase` returned.
 */
function logDroppedKeys({ dropped, droppedSources }: MergeBase): void {
  for (const { key, since } of dropped) {
    logger.info(
      `Removed the \`${key}\` key from style-gen.config.json: ${since} no longer accepts it.`,
    );
  }
  if (droppedSources.length === 0) return;
  logger.info(
    "   Declare those runtime classes in your CSS next to the generated import instead:",
  );
  for (const entry of droppedSources) {
    logger.log(`   @source inline(${JSON.stringify(entry)});`);
  }
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
  const isInteractive = process.stdin.isTTY;

  const detected = detectStack(cwd);
  const defaultTheme = defaultThemeLoc(detected, cwd);

  if (args.rulesOnly) {
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

  let themeLoc = args.theme ?? defaultTheme;
  let includeDark = args.dark ?? false;

  // `--skip-rules` alone still opens the wizard: it asks only for these two.
  if (isInteractive && args.theme === undefined && args.dark === undefined) {
    const config = await getInteractiveConfig(defaultTheme);
    themeLoc = config.themeLoc;
    includeDark = config.includeDark;
  }

  // Everything `init` scaffolds stays inside the project root. From here
  // on only the repo-relative POSIX form is used (an absolute --theme
  // inside the root is stored and printed relative).
  const themeAbsPath = resolveProjectPath(cwd, themeLoc.trim(), "theme");
  themeLoc = toRepoPath(cwd, themeAbsPath);
  const schemaLoc = path.posix.join(
    path.posix.dirname(themeLoc),
    "theme.schema.json",
  );
  const schemaAbsPath = resolveProjectPath(cwd, schemaLoc, "schema output");

  if (fs.existsSync(themeAbsPath) || fs.existsSync(schemaAbsPath)) {
    const proceed = await confirmOverwrite(isInteractive);
    if (proceed === "refused") return 1;
    // Keeping the theme still refreshes the rules: re-running init after an
    // upgrade is how they are updated.
    if (proceed === "kept") {
      const rules = await applyAgentRules(
        args,
        cwd,
        rulesSource,
        isInteractive,
      );
      printNextSteps(detected, existingLayout(cwd, themeLoc), cwd, rules);
      return 0;
    }
  }

  /* ---------- Existing config (read before anything is written) ---------- */

  const mergeBase = loadMergeBase(cwd);

  /* ---------- Theme file + JSON Schema ---------- */

  writeFile(themeAbsPath, includeDark ? themeTemplateDark : themeTemplate);

  logger.success(`Created ${themeLoc}`);

  // The theme template references "./theme.schema.json" via "$schema".
  const schemaCode = schemaCommand({ out: schemaLoc }, cwd);
  if (schemaCode !== 0) return schemaCode;

  /* ---------- Config file (merged into the existing one) ---------- */

  const written = {
    theme: themeLoc,
    output: path.posix.join(path.posix.dirname(themeLoc), "theme.css"),
  };
  writeFile(
    mergeBase.configPath,
    JSON.stringify({ ...mergeBase.content, ...written }, null, 2),
  );
  logger.success(
    `${mergeBase.source === "style-gen.config.json" ? "Updated" : "Created"} style-gen.config.json`,
  );
  if (mergeBase.source === "package.json") {
    logger.info(
      'Copied package.json["style-gen"] into style-gen.config.json, which takes precedence from now on; remove the package.json section.',
    );
  }
  logDroppedKeys(mergeBase);

  /* ---------- Agent rules ---------- */

  const rules = await applyAgentRules(args, cwd, rulesSource, isInteractive);

  /* ---------- Next steps ---------- */

  logger.info("✅ Tailwind v4 configuration scaffolded successfully");
  printNextSteps(detected, written, cwd, rules);

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
