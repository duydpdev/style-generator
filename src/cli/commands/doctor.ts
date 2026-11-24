import fs from "node:fs";

import { z } from "zod";

import { prepareGenerate } from "../../core/prepareGenerate";
import { ThemeSchema, formatZodError } from "../../core/themeSchema";
import { errorMessage } from "../../node/errorMessage";
import {
  readConfigFile,
  resolveConfig,
  toGeneratorOptions,
  type ConfigFile,
  type StyleGenConfig,
} from "../../node/loadStyleGenConfig";
import { resolveEmitTarget } from "../../node/resolveEmitTarget";
import { resolveProjectPath } from "../../node/resolveProjectPath";
import type { EmitTarget } from "../../node/themeEmitter";
import { logger } from "../logger";
import { styleGenCommand } from "../packageManager";

import { findAliasHints } from "./aliasHints";
import { findUtilityCollisions } from "./utilityCollisions";

const padStr = (str: string) => {
  const minLen = 30;
  return str.length < minLen ? str.padEnd(minLen, " ") : str + " ";
};

/**
 * Resolve the emit paths the way `generate` does (`resolveEmitTarget`), or
 * report why it would refuse: `output` or `tokensOutput` outside the project
 * root, a `tokensOutput` that is not a `.ts` file, two of theme, output and
 * tokens module being the same file.
 * @param {string} cwd - Project root
 * @param {StyleGenConfig} config - Resolved configuration
 * @returns {EmitTarget | undefined} The target, or `undefined` after printing the error
 */
function resolveTarget(
  cwd: string,
  config: StyleGenConfig,
): EmitTarget | undefined {
  try {
    return resolveEmitTarget(cwd, config);
  } catch (error) {
    logger.log(`  Output  (${padStr(config.output)}) ❌ Invalid emit paths`);
    logger.log(`    ${errorMessage(error)}`);
    return undefined;
  }
}

/**
 * Validates the theme file: JSON syntax first, then `ThemeSchema`, then the
 * theme against the configured generator options (`resetTailwindDefaults`
 * without the matching category) — the same verdict `generate` reaches.
 * Schema violations (unknown
 * keys, injection-unsafe values, ...) are printed as `path → message` lines
 * via `formatZodError`.
 * @param {string} cwd - Project root
 * @param {StyleGenConfig} config - Resolved configuration (theme path, output, generator options)
 * @returns {boolean} True if there are errors, false otherwise
 */
function checkTheme(cwd: string, config: StyleGenConfig): boolean {
  const themePath = resolveProjectPath(cwd, config.theme, "theme", {
    allowOutsideRoot: true,
  });
  const heading = `  Theme   (${padStr(config.theme)})`;

  if (!fs.existsSync(themePath)) {
    logger.log(`${heading} ❌ Not found`);
    return true;
  }

  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(themePath, "utf-8"));
  } catch {
    logger.log(`${heading} ❌ Invalid JSON`);
    return true;
  }

  const result = ThemeSchema.safeParse(raw);
  if (!result.success) {
    logger.log(`${heading} ❌ Invalid schema`);
    logger.log(formatZodError(result.error));
    return true;
  }

  try {
    prepareGenerate(result.data, toGeneratorOptions(config));
  } catch (error) {
    if (!(error instanceof z.ZodError)) throw error;
    logger.log(`${heading} ❌ Invalid theme/options`);
    logger.log(formatZodError(error));
    return true;
  }

  logger.log(`${heading} ✅ Valid JSON, schema OK`);
  // Warnings only (utility collisions, override literals that could be
  // aliases): never change the exit code.
  for (const warning of [
    ...findUtilityCollisions(result.data),
    ...findAliasHints(result.data),
  ]) {
    logger.log(`  Theme   ⚠️  ${warning}`);
  }
  return false;
}

/**
 * The hint after a failed check.
 * @param {string} cwd - Project root, for the package manager
 * @returns {string} The hint line
 */
const fixHint = (cwd: string): string =>
  `💡 Fix errors above or start fresh by running: ${styleGenCommand(cwd, "init")}\n`;

/**
 * Report the config file. An unusable one (malformed, schema issues) ends the
 * run: checking the theme against the defaults it was meant to replace would
 * only print noise.
 * @param {ConfigFile} configFile - The config as read
 * @returns {boolean} True when the config is unusable
 */
function checkConfig(configFile: ConfigFile): boolean {
  const problem = configFile.error ?? configFile.issues;
  if (problem !== undefined) {
    const verdict = configFile.error ? "Ignored" : "Invalid";
    logger.log(`  Config  (${padStr(configFile.source ?? "")}) ❌ ${verdict}`);
    logger.log(configFile.error ? `    ${problem}` : problem);
    return true;
  }
  logger.log(
    configFile.source
      ? `  Config  (${padStr(configFile.source)}) ✅ Found`
      : `  Config  (${padStr("style-gen.config.json")}) ⚠️  Not found (using defaults)`,
  );
  return false;
}

/**
 * Report the generated CSS file.
 * @param {string} output - The configured output path, as shown
 * @param {string} outPath - Its absolute path
 * @returns {"missing" | "generated"} Its state
 */
function checkOutput(output: string, outPath: string): "missing" | "generated" {
  if (fs.existsSync(outPath)) {
    logger.log(`  Output  (${padStr(output)}) ✅ Generated`);
    return "generated";
  }
  logger.log(`  Output  (${padStr(output)}) ⚠️  Not generated yet`);
  return "missing";
}

/**
 * Executes the `doctor` CLI command.
 * Checks the setup status and validates the configuration and theme schema.
 * @param {string} [cwd] - Project root; defaults to `process.cwd()`
 * @returns {number} 1 when any check failed, else 0
 */
export function doctorCommand(cwd: string = process.cwd()): number {
  const configFile = readConfigFile(cwd);

  logger.log("\n🩺 style-gen doctor\n");

  if (checkConfig(configFile)) {
    logger.log("");
    logger.log(fixHint(cwd));
    return 1;
  }

  const config = resolveConfig({}, configFile);
  // No short-circuit: every check reports, whatever the others found.
  const themeFailed = checkTheme(cwd, config);
  const target = resolveTarget(cwd, config);
  const output =
    target === undefined ? "error" : checkOutput(config.output, target.outFile);

  logger.log("");

  if (themeFailed || output === "error") {
    logger.log(fixHint(cwd));
    return 1;
  }

  logger.log(
    output === "generated"
      ? "💡 Everything looks good!\n"
      : `💡 Setup looks complete! Generate your CSS by running: ${styleGenCommand(cwd, "generate")}\n`,
  );
  return 0;
}
