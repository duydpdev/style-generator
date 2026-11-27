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
import { findDeprecatedColorKeys } from "./deprecatedColorKeys";
import { findUtilityCollisions } from "./utilityCollisions";

const padStr = (str: string) => {
  const minLen = 30;
  return str.length < minLen ? str.padEnd(minLen, " ") : str + " ";
};

// The emit paths as `generate` resolves them, or `undefined` after printing why it would refuse.
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

// JSON, then `ThemeSchema`, then the generator options: the verdict `generate` reaches. True on errors.
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
    ...findDeprecatedColorKeys(result.data),
  ]) {
    logger.log(`  Theme   ⚠️  ${warning}`);
  }
  return false;
}

const fixHint = (cwd: string): string =>
  `💡 Fix errors above or start fresh by running: ${styleGenCommand(cwd, "init")}\n`;

// True when unusable, which ends the run: checking the theme against the defaults it was meant
// to replace would only print noise.
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

function checkOutput(output: string, outPath: string): "missing" | "generated" {
  if (fs.existsSync(outPath)) {
    logger.log(`  Output  (${padStr(output)}) ✅ Generated`);
    return "generated";
  }
  logger.log(`  Output  (${padStr(output)}) ⚠️  Not generated yet`);
  return "missing";
}

/**
 * Executes the `doctor` CLI command: config, theme and output checks.
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
