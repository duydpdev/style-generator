import fs from "node:fs";
import path from "node:path";

import { ThemeSchema, formatZodError } from "../../core/themeSchema";
import { readConfigFile, resolveConfig, normalizePath } from "../config";
import { logger } from "../logger";

import { findUtilityCollisions } from "./utilityCollisions";

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
      // Warnings only: a collision can be deliberate, and must not fail the
      // exit code (hasErrors stays false).
      for (const warning of findUtilityCollisions(result.data)) {
        logger.log(`  Theme   ⚠️  ${warning}`);
      }
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
 * The generator script is checked only when `plugin` is configured: a
 * `styleGenVite`/`styleGenNext` or CLI-only setup has none.
 */
export function doctorCommand() {
  const cwd = process.cwd();
  const configFile = readConfigFile(cwd);
  const options = resolveConfig({}, configFile);

  logger.log("\n🩺 style-gen doctor\n");

  let hasErrors = false;

  // 1. Check Config
  if (configFile.error) {
    logger.log(`  Config  (${padStr(configFile.source ?? "")}) ❌ Ignored`);
    logger.log(`    ${configFile.error}`);
    hasErrors = true;
  } else if (configFile.source) {
    logger.log(`  Config  (${padStr(configFile.source)}) ✅ Found`);
  } else {
    logger.log(
      `  Config  (${padStr("style-gen.config.json")}) ⚠️  Not found (using defaults)`,
    );
  }

  // 2. Check Theme
  const themeErrors = checkTheme(cwd, options.theme);
  if (themeErrors) hasErrors = true;

  // 3. Check the generator script, only when one is configured
  if (options.plugin !== undefined) {
    const pluginPath = path.resolve(cwd, normalizePath(options.plugin));
    if (fs.existsSync(pluginPath)) {
      logger.log(`  Script  (${padStr(options.plugin)}) ✅ Found`);
    } else {
      logger.log(`  Script  (${padStr(options.plugin)}) ❌ Not found`);
      hasErrors = true;
    }
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
      "💡 Setup looks complete! Generate your CSS by running: npx style-gen generate\n",
    );
  }
}
