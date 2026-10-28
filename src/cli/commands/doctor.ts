import fs from "node:fs";

import { z } from "zod";

import { prepareGenerate } from "../../core/prepareGenerate";
import { ThemeSchema, formatZodError } from "../../core/themeSchema";
import {
  readConfigFile,
  resolveConfig,
  toGeneratorOptions,
  type ConfigFile,
  type StyleGenConfig,
} from "../../node/loadStyleGenConfig";
import { resolveProjectPath } from "../../node/resolveProjectPath";
import { logger } from "../logger";

import { findAliasHints } from "./aliasHints";
import { findLegacyColorVarRefs } from "./legacyColorVars";
import { findUtilityCollisions } from "./utilityCollisions";

const padStr = (str: string) => {
  const minLen = 30;
  return str.length < minLen ? str.padEnd(minLen, " ") : str + " ";
};

/**
 * Resolve a project path for a check line, or report that it escapes the
 * project root (an error: `generate` would refuse to write there).
 * @param {string} cwd - Project root
 * @param {string} input - Path as configured
 * @param {"output" | "plugin"} label - Which option the path belongs to
 * @param {string} heading - The padded line prefix (`Output`, `Script`)
 * @returns {string | undefined} The absolute path, or `undefined` after printing the error
 */
function resolveInsideRoot(
  cwd: string,
  input: string,
  label: "output" | "plugin",
  heading: string,
): string | undefined {
  try {
    return resolveProjectPath(cwd, input, label);
  } catch (error) {
    logger.log(`  ${heading}(${padStr(input)}) ❌ Escapes project root`);
    logger.log(`    ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}

/**
 * Validates the theme file: JSON syntax first, then `ThemeSchema`, then the
 * theme against the configured generator options (a stale `$`-alias holder
 * under `axes.scope: "element"`, `resetTailwindDefaults` without the matching
 * category) — the same verdict `generate` reaches. Schema violations (unknown
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
  // Warnings only (utility collisions, pre-5.0 color variables, override
  // literals that could be aliases): never change the exit code.
  for (const warning of [
    ...findUtilityCollisions(result.data),
    ...findLegacyColorVarRefs(cwd, result.data, { output: config.output }),
    ...findAliasHints(result.data),
  ]) {
    logger.log(`  Theme   ⚠️  ${warning}`);
  }
  return false;
}

const FIX_HINT =
  "💡 Fix errors above or start fresh by running: yarn style-gen init\n";

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
 * Report the generator script, only when one is configured (`plugin`).
 * @param {string} cwd - Project root
 * @param {string | undefined} plugin - The configured script path
 * @returns {boolean} True on an error
 */
function checkScript(cwd: string, plugin: string | undefined): boolean {
  if (plugin === undefined) return false;
  const pluginPath = resolveInsideRoot(cwd, plugin, "plugin", "Script  ");
  if (pluginPath === undefined) return true;
  if (fs.existsSync(pluginPath)) {
    logger.log(`  Script  (${padStr(plugin)}) ✅ Found`);
    return false;
  }
  logger.log(`  Script  (${padStr(plugin)}) ❌ Not found`);
  return true;
}

/**
 * Report the generated CSS file.
 * @param {string} cwd - Project root
 * @param {string} output - The configured output path
 * @returns {"error" | "missing" | "generated"} Its state
 */
function checkOutput(
  cwd: string,
  output: string,
): "error" | "missing" | "generated" {
  const outPath = resolveInsideRoot(cwd, output, "output", "Output  ");
  if (outPath === undefined) return "error";
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
 * The generator script is checked only when `plugin` is configured: a
 * `styleGenVite`/`styleGenNext` or CLI-only setup has none.
 * @param {string} [cwd] - Project root; defaults to `process.cwd()`
 * @returns {number} 1 when any check failed, else 0
 */
export function doctorCommand(cwd: string = process.cwd()): number {
  const configFile = readConfigFile(cwd);

  logger.log("\n🩺 style-gen doctor\n");

  if (checkConfig(configFile)) {
    logger.log("");
    logger.log(FIX_HINT);
    return 1;
  }

  const config = resolveConfig({}, configFile);
  // No short-circuit: every check reports, whatever the others found.
  const themeFailed = checkTheme(cwd, config);
  const scriptFailed = checkScript(cwd, config.plugin);
  const output = checkOutput(cwd, config.output);

  logger.log("");

  if (themeFailed || scriptFailed || output === "error") {
    logger.log(FIX_HINT);
    return 1;
  }

  logger.log(
    output === "generated"
      ? "💡 Everything looks good!\n"
      : "💡 Setup looks complete! Generate your CSS by running: yarn style-gen generate\n",
  );
  return 0;
}
