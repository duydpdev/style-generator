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

/**
 * Formular prompts to get CLI configuration interactively
 * @param {InitArgs} args - Default init arguments
 * @returns {Promise<{themeLoc: string, pluginLoc: string, includeDark: boolean}>} Interactive answers
 */
async function getInteractiveConfig(args: InitArgs) {
  p.intro(`🚀 style-gen init`);

  const twRes = await p.select({
    message: "Tailwind version?",
    options: [
      { value: "v4", label: "v4 (recommended)" },
      { value: "v3", label: "v3" },
    ],
  });

  if (p.isCancel(twRes)) {
    p.cancel("Operation cancelled.");
    process.exit(0);
  }

  const themeRes = await p.text({
    message: "Theme file location?",
    initialValue: "styles/theme.json",
    placeholder: "styles/theme.json",
  });

  if (p.isCancel(themeRes)) {
    p.cancel("Operation cancelled.");
    process.exit(0);
  }

  const pluginRes = await p.text({
    message: "Plugin file location?",
    initialValue: "plugins/theme-plugin.ts",
    placeholder: "plugins/theme-plugin.ts",
  });

  if (p.isCancel(pluginRes)) {
    p.cancel("Operation cancelled.");
    process.exit(0);
  }

  const darkRes = await p.confirm({
    message: "Include dark mode template?",
    initialValue: false,
  });

  if (p.isCancel(darkRes)) {
    p.cancel("Operation cancelled.");
    process.exit(0);
  }

  return {
    themeLoc: themeRes || (args.theme ?? "styles/theme.json"),
    pluginLoc: pluginRes || (args.plugin ?? "plugins/theme-plugin.ts"),
    includeDark: darkRes,
  };
}

/**
 * Initializes the project by scaffolding required files.
 * @param {InitArgs} args - Init arguments
 */
export async function initCommand(args: InitArgs) {
  const isInteractive = process.stdin.isTTY;

  let themeLoc = args.theme ?? "styles/theme.json";
  let pluginLoc = args.plugin ?? "plugins/theme-plugin.ts";
  let includeDark = args.dark ?? false;

  if (isInteractive && Object.keys(args).length === 0) {
    const res = await getInteractiveConfig(args);
    themeLoc = res.themeLoc;
    pluginLoc = res.pluginLoc;
    includeDark = res.includeDark;
  }

  // Create directories and files
  const createDirIfMissing = (filePath: string) => {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  };

  const themeAbsPath = path.resolve(process.cwd(), themeLoc);
  createDirIfMissing(themeAbsPath);
  fs.writeFileSync(
    themeAbsPath,
    includeDark ? themeTemplateDark : themeTemplate,
    "utf8",
  );
  logger.success(`Created ${themeLoc}`);

  const pluginAbsPath = path.resolve(process.cwd(), pluginLoc);
  createDirIfMissing(pluginAbsPath);

  // Calculate relative path for import
  const themeRelPathRaw = path.relative(
    path.dirname(pluginAbsPath),
    themeAbsPath,
  );
  const themeRelPath = themeRelPathRaw.startsWith(".")
    ? themeRelPathRaw
    : "./" + themeRelPathRaw;
  // Convert Windows backslashes to forward slashes
  const themeRelPathPosix = themeRelPath.replaceAll("\\", "/");

  fs.writeFileSync(pluginAbsPath, getPluginTemplate(themeRelPathPosix), "utf8");
  logger.success(`Created ${pluginLoc}`);

  // Need to output plugin instructions
  logger.info(`✅ Updated your CSS file with @plugin and @source directives`);
  logger.info(
    `📝 Next steps:\n   1. Edit ${themeLoc} with your design tokens\n   2. Run: npx style-gen safelist\n   3. Start your dev server`,
  );

  if (isInteractive) {
    p.outro("You're all set!");
  }
}
