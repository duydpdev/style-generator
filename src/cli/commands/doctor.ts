import fs from "node:fs";
import path from "node:path";

import type { ThemeConfig } from "../../core/ThemeConfig";
import { resolveConfig, normalizePath } from "../config";
import { logger } from "../logger";

const padStr = (str: string) => {
  const minLen = 30;
  return str.length < minLen ? str.padEnd(minLen, " ") : str + " ";
};

/**
 * Validates the theme schema.
 * @param {string} cwd - Current working directory
 * @param {string} optionsTheme - Path to theme file
 * @returns {boolean} True if there are errors, false otherwise
 */
function checkTheme(cwd: string, optionsTheme: string): boolean {
  let hasErrors = false;
  const themePath = path.resolve(cwd, normalizePath(optionsTheme));

  if (fs.existsSync(themePath)) {
    try {
      const parsedTheme = JSON.parse(fs.readFileSync(themePath, "utf-8")) as
        | (Partial<ThemeConfig> & { colors?: Record<string, unknown> })
        | null;
      if (parsedTheme?.colors && parsedTheme.typography) {
        logger.log(
          `  Theme   (${padStr(optionsTheme)}) ✅ Valid JSON, schema OK`,
        );

        // Warn about old v1 format (colors.base/text/common)
        const colors = parsedTheme.colors as Record<string, unknown>;
        if (colors.base || colors.text || colors.common) {
          logger.log(
            `  ⚠️  Detected old color format (colors.base/text/common). v2 uses flat colors. Migrate to: { "colors": { "primary": "#...", ... } }`,
          );
        }
      } else {
        logger.log(
          `  Theme   (${padStr(optionsTheme)}) ❌ Invalid schema (missing 'colors' or 'typography')`,
        );
        hasErrors = true;
      }
    } catch {
      logger.log(`  Theme   (${padStr(optionsTheme)}) ❌ Invalid JSON`);
      hasErrors = true;
    }
  } else {
    logger.log(`  Theme   (${padStr(optionsTheme)}) ❌ Not found`);
    hasErrors = true;
  }
  return hasErrors;
}

/**
 * Executes the `doctor` CLI command.
 * Checks the setup status and validates the configuration and theme schema.
 */
export function doctorCommand() {
  const cwd = process.cwd();
  const configPath = path.resolve(cwd, "style-gen.config.json");
  const options = resolveConfig({});

  logger.log("\n🩺 style-gen doctor\n");

  let hasErrors = false;

  // 1. Check Config
  const hasConfig = fs.existsSync(configPath);
  if (hasConfig) {
    logger.log(`  Config  (style-gen.config.json)        ✅ Found`);
  } else {
    logger.log(
      `  Config  (style-gen.config.json)        ⚠️  Not found (using defaults either style-gen.config.json or package.json)`,
    );
  }

  // 2. Check Theme
  const themeErrors = checkTheme(cwd, options.theme);
  if (themeErrors) hasErrors = true;

  // 3. Check Plugin
  const pluginPath = path.resolve(cwd, normalizePath(options.plugin));
  if (fs.existsSync(pluginPath)) {
    logger.log(`  Plugin  (${padStr(options.plugin)}) ✅ Found`);
  } else {
    logger.log(`  Plugin  (${padStr(options.plugin)}) ❌ Not found`);
    hasErrors = true;
  }

  // 4. Check Output
  const outPath = path.resolve(cwd, normalizePath(options.output));
  if (fs.existsSync(outPath)) {
    logger.log(`  Output  (${padStr(options.output)}) ✅ Generated`);
  } else {
    logger.log(`  Output  (${padStr(options.output)}) ⚠️  Not generated yet`);
  }

  logger.log("");

  if (hasErrors) {
    logger.log(
      "💡 Fix errors above or start fresh by running: npx style-gen init\n",
    );
    process.exit(1);
  }

  if (fs.existsSync(outPath)) {
    logger.log("💡 Everything looks good!\n");
  } else {
    logger.log(
      "💡 Setup looks complete! Generate your safelist by running: npx style-gen safelist\n",
    );
  }
}
