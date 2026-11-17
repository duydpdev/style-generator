import fs from "node:fs";
import path from "node:path";

import { z } from "zod";

import { ThemeSchema } from "../../core/themeSchema";
import { configCandidates } from "../../node/configSource";
import { errorMessage } from "../../node/errorMessage";
import {
  declaredLayout,
  defaultConfig,
  readConfigFile,
} from "../../node/loadStyleGenConfig";
import { resolveProjectPath } from "../../node/resolveProjectPath";
import { sameFile } from "../../node/sameFile";
import { buildConfigJsonSchema } from "../configJsonSchema";
import { logger } from "../logger";

export interface SchemaArgs {
  out?: string;
  configOut?: string;
}

const SCHEMA_FILE_NAME = "theme.schema.json";
const CONFIG_SCHEMA_FILE_NAME = "style-gen.config.schema.json";

/**
 * Writes `jsonSchema` to `filePath` (creating parent directories) in the
 * committed-file style: two-space JSON and a trailing newline.
 * @param {string} filePath - Absolute target path
 * @param {unknown} jsonSchema - The JSON Schema document
 */
function writeJsonSchema(filePath: string, jsonSchema: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    JSON.stringify(jsonSchema, null, 2) + "\n",
    "utf8",
  );
}

/**
 * Write `ThemeSchema`'s JSON Schema and report it.
 * @param {string} cwd - Project root, for the printed path
 * @param {string} absPath - Absolute target path
 */
export function writeThemeSchema(cwd: string, absPath: string): void {
  writeJsonSchema(absPath, z.toJSONSchema(ThemeSchema));
  logger.success(`Theme JSON Schema written to ${path.relative(cwd, absPath)}`);
}

/**
 * Write the config's JSON Schema and report it.
 * @param {string} cwd - Project root, for the printed path
 * @param {string} absPath - Absolute target path
 */
export function writeConfigSchema(cwd: string, absPath: string): void {
  writeJsonSchema(absPath, buildConfigJsonSchema());
  logger.success(
    `Config JSON Schema written to ${path.relative(cwd, absPath)}`,
  );
}

/**
 * Names the first file two roles share among the theme file, the config
 * files and the two schema targets, which a write would clobber.
 * @param {string} cwd - Project root, to print paths relative to it
 * @param {string | undefined} outPath - Resolved theme-schema target
 * @param {string} configOutPath - Resolved config-schema target
 * @param {string} themePath - Resolved theme file (the one the config declares, else the default)
 * @param {readonly string[]} configFiles - Every file the config can live in
 * @returns {string | undefined} The error message, or `undefined` when the files are distinct
 */
function describeCollision(
  cwd: string,
  outPath: string | undefined,
  configOutPath: string,
  themePath: string,
  configFiles: readonly string[],
): string | undefined {
  const shown = (target: string): string => path.relative(cwd, target);
  if (outPath !== undefined && sameFile(outPath, configOutPath)) {
    return `--out and --config-out name the same file: ${shown(outPath)}`;
  }
  const targets: [string, string | undefined][] = [
    ["--out", outPath],
    ["--config-out", configOutPath],
  ];
  for (const [flag, target] of targets) {
    if (target === undefined) continue;
    if (sameFile(target, themePath)) {
      return `${flag} would overwrite the theme file: ${shown(target)}`;
    }
    if (configFiles.some((configFile) => sameFile(target, configFile))) {
      return `${flag} would overwrite the config file: ${shown(target)}`;
    }
  }
  return undefined;
}

/**
 * Executes the `schema` CLI command: writes `ThemeSchema`'s and
 * `style-gen.config.json`'s JSON Schemas (via `z.toJSONSchema`) to disk so
 * editors can offer autocomplete and unknown-key warnings for a theme.json or
 * a config referencing them via `"$schema"`.
 * Without `--out` the theme schema lands next to the configured `theme`,
 * where the theme's `"$schema": "./theme.schema.json"` expects it. The config
 * schema goes to `--config-out`, else `style-gen.config.schema.json` in the
 * project root, where the config's `"$schema": "./style-gen.config.schema.json"`
 * expects it. The config is read like `generate` reads it: a malformed file
 * is warned about (also with `--out`) and read as the defaults. A config with
 * schema issues still gets its config schema written (the moment an upgrader
 * needs it); without `--out` the issues are then reported, the exit code is 1
 * and no theme schema is written, while with `--out` both schemas are written,
 * nothing is reported and the exit code is 0.
 *
 * Both targets must stay inside the project root, so a theme outside it
 * (a monorepo's shared theme) needs an explicit `--out`. Nothing is written
 * when a target would overwrite the other, the theme file (the `theme` of a
 * valid config, else the one an invalid config declares, else the default),
 * `style-gen.config.json` or `package.json`.
 * @param {SchemaArgs} args - Schema command arguments from the CLI
 * @param {string} [cwd] - Project root; defaults to `process.cwd()`
 * @returns {number} The process exit code
 */
export function schemaCommand(
  args: SchemaArgs,
  cwd: string = process.cwd(),
): number {
  const file = readConfigFile(cwd);
  if (file.error) {
    logger.warn(`Ignoring ${file.error}; using defaults`);
  }

  let configOutPath: string;
  try {
    configOutPath = args.configOut
      ? resolveProjectPath(cwd, args.configOut, "--config-out")
      : path.join(cwd, CONFIG_SCHEMA_FILE_NAME);
  } catch (error) {
    logger.error(errorMessage(error));
    return 1;
  }

  // The theme the config declares is protected even when the config has
  // issues (`readConfigFile` keeps the raw object); only a valid config's
  // theme decides where the theme schema goes.
  let themePath: string;
  let outPath: string | undefined;
  try {
    themePath = resolveProjectPath(
      cwd,
      declaredLayout(file)?.theme ?? defaultConfig.theme,
      "theme",
      { allowOutsideRoot: true },
    );
    if (args.out) {
      outPath = resolveProjectPath(cwd, args.out, "--out");
    } else if (!file.issues) {
      outPath = resolveProjectPath(
        cwd,
        path.join(path.dirname(themePath), SCHEMA_FILE_NAME),
        "schema output",
      );
    }
  } catch (error) {
    const hint = args.out ? "" : "\n💡 Pass --out to choose where to write it";
    logger.error(`${errorMessage(error)}${hint}`);
    return 1;
  }

  const collision = describeCollision(
    cwd,
    outPath,
    configOutPath,
    themePath,
    configCandidates(cwd),
  );
  if (collision) {
    logger.error(collision);
    return 1;
  }

  writeConfigSchema(cwd, configOutPath);
  if (outPath === undefined) {
    // Only a config with issues leaves the theme schema without a target.
    logger.error(
      `Invalid config (${file.source ?? "style-gen.config.json"}):\n${file.issues ?? ""}`,
    );
    return 1;
  }
  writeThemeSchema(cwd, outPath);
  return 0;
}
