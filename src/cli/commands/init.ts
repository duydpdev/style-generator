import fs from "node:fs";
import path from "node:path";

import * as p from "@clack/prompts";

import { logger } from "../logger";
import { normalizePath } from "../config";
import {
  themeTemplate,
  themeTemplateDark,
  getPluginTemplate,
} from "../templates";

import { schemaCommand } from "./schema";

export interface InitArgs {
  theme?: string;
  plugin?: string;
  dark?: boolean;
}

interface InteractiveConfig {
  themeLoc: string;
  pluginLoc: string;
  includeDark: boolean;
}

/* ------------------ Helpers ------------------ */

/**
 * Handle prompt cancellation.
 * @param {unknown} value The value from the prompt.
 */
function handleCancel(value: unknown): void {
  if (p.isCancel(value)) {
    p.cancel("Operation cancelled.");
    process.exit(0);
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
 * Convert absolute paths to a relative import path.
 * @param {string} from The source file path.
 * @param {string} to The target file path.
 * @returns {string} The relative import path.
 */
function toImportPath(from: string, to: string): string {
  let rel = path.relative(path.dirname(from), to);

  if (!rel.startsWith(".")) {
    rel = `./${rel}`;
  }

  return rel.replaceAll("\\", "/");
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Read an existing `style-gen.config.json` so `init` can merge into it.
 * Exits with code 1 when the file cannot be read as a JSON object.
 * @param {string} configPath Absolute path to the config file.
 * @returns {Record<string, unknown>} The parsed config object.
 */
function readExistingConfig(configPath: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch {
    logger.error(
      "style-gen.config.json could not be read as JSON. Cannot merge; aborting.",
    );
    process.exit(1);
  }
  if (!isPlainObject(parsed)) {
    logger.error(
      "style-gen.config.json is not a JSON object. Cannot merge; aborting.",
    );
    process.exit(1);
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
  /** Keys `init` merges `theme`/`plugin`/`output` into. */
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

/* ------------------ Interactive Prompts ------------------ */

/**
 * Prompt user interactively for configuration.
 * @param {InitArgs} args The initial CLI arguments.
 * @returns {Promise<InteractiveConfig>} The collected configuration.
 */
async function getInteractiveConfig(
  args: InitArgs,
): Promise<InteractiveConfig> {
  p.intro("🚀 style-gen init");

  const hasSrc = fs.existsSync(path.resolve(process.cwd(), "src"));
  const defaultTheme = hasSrc ? "src/styles/theme.json" : "styles/theme.json";
  const defaultPlugin = hasSrc
    ? "src/plugins/theme-plugin.ts"
    : "plugins/theme-plugin.ts";

  const themeRes = await p.text({
    message: "Theme file location?",
    initialValue: defaultTheme,
    placeholder: defaultTheme,
  });
  handleCancel(themeRes);

  const pluginRes = await p.text({
    message: "Generator script location?",
    initialValue: defaultPlugin,
    placeholder: defaultPlugin,
  });
  handleCancel(pluginRes);

  const darkRes = await p.confirm({
    message: "Include dark mode template?",
    initialValue: false,
  });
  handleCancel(darkRes);

  const theme = themeRes as string;
  const plugin = pluginRes as string;
  const dark = darkRes as boolean;

  return {
    themeLoc: theme || (args.theme ?? defaultTheme),
    pluginLoc: plugin || (args.plugin ?? defaultPlugin),
    includeDark: dark,
  };
}

/* ------------------ Command ------------------ */

/**
 * Initialize project scaffolding for style-gen.
 * @param {InitArgs} args The initial CLI arguments.
 */
export async function initCommand(args: InitArgs): Promise<void> {
  const isInteractive = process.stdin.isTTY;
  const cwd = process.cwd();

  const hasSrc = fs.existsSync(path.resolve(cwd, "src"));

  let themeLoc =
    args.theme ?? (hasSrc ? "src/styles/theme.json" : "styles/theme.json");
  let pluginLoc =
    args.plugin ??
    (hasSrc ? "src/plugins/theme-plugin.ts" : "plugins/theme-plugin.ts");
  let includeDark = args.dark ?? false;

  if (isInteractive && Object.keys(args).length === 0) {
    const config = await getInteractiveConfig(args);
    themeLoc = config.themeLoc;
    pluginLoc = config.pluginLoc;
    includeDark = config.includeDark;
  }

  themeLoc = normalizePath(themeLoc);
  pluginLoc = normalizePath(pluginLoc);

  const themeAbsPath = path.resolve(cwd, themeLoc);
  const pluginAbsPath = path.resolve(cwd, pluginLoc);
  const schemaAbsPath = path.resolve(
    cwd,
    path.dirname(themeLoc),
    "theme.schema.json",
  );

  if (
    fs.existsSync(themeAbsPath) ||
    fs.existsSync(pluginAbsPath) ||
    fs.existsSync(schemaAbsPath)
  ) {
    if (isInteractive) {
      const overwrite = await p.confirm({
        message: "Theme, schema or generator script already exists. Overwrite?",
        initialValue: false,
      });
      handleCancel(overwrite);
      if (!overwrite) {
        logger.info("Operation cancelled. Existing files kept.");
        process.exit(0);
      }
    } else {
      logger.error(
        "Files already exist. Run interactively to confirm overwrite.",
      );
      process.exit(1);
    }
  }

  /* ---------- Existing config (read before anything is written) ---------- */

  const mergeBase = loadMergeBase(cwd);

  /* ---------- Theme file + JSON Schema ---------- */

  writeFile(themeAbsPath, includeDark ? themeTemplateDark : themeTemplate);

  logger.success(`Created ${themeLoc}`);

  // The theme template references "./theme.schema.json" via "$schema".
  schemaCommand({
    out: path.join(path.dirname(themeLoc), "theme.schema.json"),
  });

  /* ---------- Generator script ---------- */

  const outLoc = path.join(path.dirname(themeLoc), "theme.css");
  const outAbsPath = path.resolve(cwd, outLoc);

  writeFile(
    pluginAbsPath,
    getPluginTemplate(
      toImportPath(pluginAbsPath, themeAbsPath),
      toImportPath(pluginAbsPath, outAbsPath),
    ),
  );

  logger.success(`Created ${pluginLoc}`);

  /* ---------- Config file (merged into the existing one) ---------- */

  const written = {
    theme: themeLoc.replaceAll("\\", "/"),
    plugin: pluginLoc.replaceAll("\\", "/"),
    output: outLoc.replaceAll("\\", "/"),
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

  logger.info(
    `📝 Next steps:
   1. Edit ${written.theme} with your design tokens
   2. Generate ${written.output}: \`node ${written.plugin}\` (Node >= 22.18, which strips the types) or \`yarn style-gen generate\` — both write the same file
   3. Add \`@import "./theme.css";\` to your CSS entry point, next to \`@import "tailwindcss";\`
   4. Start your dev server`,
  );

  if (isInteractive) {
    p.outro("You're all set!");
  }
}
