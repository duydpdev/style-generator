import fs from "node:fs";
import path from "node:path";

import { ThemeSchema, formatZodError } from "../../core/themeSchema";
import { resolveConfig, normalizePath } from "../config";
import { logger } from "../logger";

const padStr = (str: string) => {
  const minLen = 30;
  return str.length < minLen ? str.padEnd(minLen, " ") : str + " ";
};

/**
 * Validates the theme file: JSON syntax first, then `ThemeSchema`. Schema
 * violations (unknown keys, injection-unsafe values, ...) are printed as
 * `path → message` lines via `formatZodError` instead of a hand-rolled
 * shape check — the strict schema already covers what the old "legacy v1
 * nested colors" warning used to catch (colors.<key> as a nested object),
 * now as a proper error with the offending path named.
 * @param {string} cwd - Current working directory
 * @param {string} optionsTheme - Path to theme file
 * @returns {boolean} True if there are errors, false otherwise
 */
function checkTheme(cwd: string, optionsTheme: string): boolean {
  let hasErrors = false;
  const themePath = path.resolve(cwd, normalizePath(optionsTheme));

  if (fs.existsSync(themePath)) {
    let raw: unknown;
    try {
      raw = JSON.parse(fs.readFileSync(themePath, "utf-8"));
    } catch {
      logger.log(`  Theme   (${padStr(optionsTheme)}) ❌ Invalid JSON`);
      return true;
    }

    const result = ThemeSchema.safeParse(raw);
    if (result.success) {
      logger.log(
        `  Theme   (${padStr(optionsTheme)}) ✅ Valid JSON, schema OK`,
      );
    } else {
      logger.log(`  Theme   (${padStr(optionsTheme)}) ❌ Invalid schema`);
      logger.log(formatZodError(result.error));
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
