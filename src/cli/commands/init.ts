import fs from "node:fs";
import path from "node:path";

import * as p from "@clack/prompts";

import { logger } from "../logger";
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
    initialValue: "styles/theme.json",
    placeholder: "styles/theme.json",
  });
  handleCancel(themeRes);

  const pluginRes = await p.text({
    message: "Plugin file location?",
    initialValue: "plugins/theme-plugin.ts",
    placeholder: "plugins/theme-plugin.ts",
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
    themeLoc: theme || (args.theme ?? "styles/theme.json"),
    pluginLoc: plugin || (args.plugin ?? "plugins/theme-plugin.ts"),
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

  let themeLoc = args.theme ?? "styles/theme.json";
  let pluginLoc = args.plugin ?? "plugins/theme-plugin.ts";
  let includeDark = args.dark ?? false;

  if (isInteractive && Object.keys(args).length === 0) {
    const config = await getInteractiveConfig(args);
    themeLoc = config.themeLoc;
    pluginLoc = config.pluginLoc;
    includeDark = config.includeDark;
  }

  const cwd = process.cwd();

  /* ---------- Theme file ---------- */

  const themeAbsPath = path.resolve(cwd, themeLoc);

  writeFile(themeAbsPath, includeDark ? themeTemplateDark : themeTemplate);

  logger.success(`Created ${themeLoc}`);

  /* ---------- Plugin file ---------- */

  const pluginAbsPath = path.resolve(cwd, pluginLoc);

  const importPath = toImportPath(pluginAbsPath, themeAbsPath);

  writeFile(pluginAbsPath, getPluginTemplate(importPath));

  logger.success(`Created ${pluginLoc}`);

  /* ---------- Next steps ---------- */

  logger.info("✅ Updated your CSS file with @plugin and @source directives");

  logger.info(
    `📝 Next steps:
   1. Edit ${themeLoc} with your design tokens
   2. Run: npx style-gen safelist
   3. Start your dev server`,
  );

  if (isInteractive) {
    p.outro("You're all set!");
  }
}
