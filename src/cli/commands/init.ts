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

export interface InitArgs {
  tw?: string;
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

  const twRes = await p.select({
    message: "Tailwind version?",
    options: [
      { value: "v4", label: "v4 (recommended)" },
      { value: "v3", label: "v3" },
    ],
  });
  handleCancel(twRes);

  const themeRes = await p.text({
    message: "Theme file location?",
    initialValue: defaultTheme,
    placeholder: defaultTheme,
  });
  handleCancel(themeRes);

  const pluginRes = await p.text({
    message: "Plugin file location?",
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

  if (fs.existsSync(themeAbsPath) || fs.existsSync(pluginAbsPath)) {
    if (isInteractive) {
      const overwrite = await p.confirm({
        message: "Theme or plugin files already exist. Overwrite?",
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

  /* ---------- Theme file ---------- */

  writeFile(themeAbsPath, includeDark ? themeTemplateDark : themeTemplate);

  logger.success(`Created ${themeLoc}`);

  /* ---------- Plugin file ---------- */

  const importPath = toImportPath(pluginAbsPath, themeAbsPath);

  writeFile(pluginAbsPath, getPluginTemplate(importPath));

  logger.success(`Created ${pluginLoc}`);

  /* ---------- Config file ---------- */

  const outLoc = `${path.dirname(themeLoc)}/safelist.txt`;
  const configContent = {
    theme: themeLoc,
    plugin: pluginLoc,
    output: outLoc,
  };
  writeFile(
    path.resolve(cwd, "style-gen.config.json"),
    JSON.stringify(configContent, null, 2),
  );
  logger.success("Created style-gen.config.json");

  /* ---------- Next steps ---------- */

  logger.info("✅ Tailwind configuration scaffolded successfully");

  logger.info(
    `📝 Next steps:
   1. Import ${pluginLoc} into your Tailwind config or css file
   2. Edit ${themeLoc} with your design tokens
   3. Run: npx style-gen safelist
   4. Start your dev server`,
  );

  if (isInteractive) {
    p.outro("You're all set!");
  }
}
