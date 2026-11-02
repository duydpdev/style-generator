import fs from "node:fs";
import path from "node:path";

import * as p from "@clack/prompts";

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
}

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

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

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
  /** Keys `init` merges `theme`/`output` into (an existing `plugin` key is kept). */
  content: Record<string, unknown>;
}

/**
 * The config `init` merges into: an existing `style-gen.config.json`, else
 * `package.json["style-gen"]`, else nothing. Read before anything is
 * written, so an unreadable config aborts with no file created.
 * @param {string} cwd The project root.
 * @returns {MergeBase} The config path and the keys to keep.
 */
function loadMergeBase(cwd: string): MergeBase {
  const configPath = path.resolve(cwd, "style-gen.config.json");
  if (fs.existsSync(configPath)) {
    return {
      configPath,
      source: "style-gen.config.json",
      content: readExistingConfig(configPath),
    };
  }
  const pkgSection = readPackageJsonSection(cwd);
  return pkgSection
    ? { configPath, source: "package.json", content: pkgSection }
    : { configPath, content: {} };
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
  const has = (dir: string): boolean => fs.existsSync(path.resolve(cwd, dir));
  if (detected.stack === "nuxt") {
    return has("app") ? "app/assets/css/theme.json" : "assets/css/theme.json";
  }
  return has("src") ? "src/styles/theme.json" : "styles/theme.json";
}

/**
 * The CSS entry the stack's starter template uses; only the directory
 * matters, for the relative `@import` path.
 * @param {BundlerStack} stack - The detected stack
 * @param {string} cwd - The project root
 * @returns {string} Project-relative POSIX path
 */
function cssEntryFile(stack: BundlerStack, cwd: string): string {
  const has = (dir: string): boolean => fs.existsSync(path.resolve(cwd, dir));
  if (stack === "vite") return has("src") ? "src/index.css" : "index.css";
  if (stack === "next") {
    return has("src/app") ? "src/app/globals.css" : "app/globals.css";
  }
  return has("app") ? "app/assets/css/main.css" : "assets/css/main.css";
}

/**
 * Print what to do after scaffolding: the bundler snippet for the detected
 * stack (never written to the config file), or the CLI fallback.
 * @param {DetectedStack} detected - The detected stack
 * @param {{ theme: string; output: string }} written - Paths written to the config
 * @param {string} written.theme - Project-relative theme file
 * @param {string} written.output - Project-relative generated CSS file
 * @param {string} cwd - The project root
 */
function printNextSteps(
  detected: DetectedStack,
  written: { theme: string; output: string },
  cwd: string,
): void {
  const outDir = path.posix.dirname(written.output);
  if (detected.stack === "none") {
    logger.info(
      `📝 Next steps (no vite.config.*, next.config.* or nuxt.config.* found):
   1. Edit ${written.theme} with your design tokens
   2. Write ${written.output}: \`yarn style-gen generate\` (add --watch while you edit the theme)
   3. Import it next to Tailwind from a CSS file in ${outDir}/:`,
    );
    logger.log(
      getCssImport(cwd, path.posix.join(outDir, "index.css"), written.output),
    );
    return;
  }
  const entry = cssEntryFile(detected.stack, cwd);
  logger.info(
    `📝 Next steps (${STACK_NAMES[detected.stack]}: ${detected.configFile}):
   1. Edit ${written.theme} with your design tokens
   2. Add the plugin to ${detected.configFile} (merge it into your config; init never edits it):`,
  );
  logger.log(getBundlerSnippet(detected, { theme: written.theme, outDir }));
  if (detected.stack === "nuxt") {
    logger.info(
      "   With explicit paths the plugin does not read style-gen.config.json; that file then serves only the CLI (generate, doctor, tokens).",
    );
    const appDir = fs.existsSync(path.resolve(cwd, "app"));
    if (appDir && !written.output.startsWith("app/")) {
      logger.warn(
        `${written.output} is outside app/: Nuxt 4 sets Vite's root to app/ and styleGenVite writes only inside it, so the dev server will reject this outDir. Re-run init with --theme under app/ (default app/assets/css/theme.json).`,
      );
    }
  }
  logger.info(
    `   3. Import the generated CSS next to Tailwind in ${entry} (or the CSS file in ${path.posix.dirname(entry)}/ that imports Tailwind):`,
  );
  logger.log(getCssImport(cwd, entry, written.output));
  logger.info(
    `   4. Start the dev server: it writes ${written.output} and rewrites it on every theme save`,
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

/* ------------------ Command ------------------ */

/**
 * The scaffolding itself; failures throw, `initCommand` turns them into
 * exit codes.
 * @param {InitArgs} args The initial CLI arguments.
 * @param {string} cwd The project root.
 * @returns {Promise<number>} The exit code.
 */
async function scaffold(args: InitArgs, cwd: string): Promise<number> {
  const isInteractive = process.stdin.isTTY;

  const detected = detectStack(cwd);
  const defaultTheme = defaultThemeLoc(detected, cwd);

  let themeLoc = args.theme ?? defaultTheme;
  let includeDark = args.dark ?? false;

  if (isInteractive && Object.keys(args).length === 0) {
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
    if (proceed !== "overwrite") return proceed === "kept" ? 0 : 1;
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

  /* ---------- Next steps ---------- */

  logger.info("✅ Tailwind v4 configuration scaffolded successfully");
  printNextSteps(detected, written, cwd);

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
 * @returns {Promise<number>} The process exit code.
 */
export async function initCommand(
  args: InitArgs,
  cwd: string = process.cwd(),
): Promise<number> {
  try {
    return await scaffold(args, cwd);
  } catch (error) {
    if (error instanceof CancelError) {
      p.cancel(error.message);
      return 0;
    }
    logger.error(error instanceof Error ? error.message : "Unknown error");
    return 1;
  }
}
