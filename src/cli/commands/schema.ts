import fs from "node:fs";
import path from "node:path";

import { z } from "zod";

import { ThemeSchema } from "../../core/themeSchema";
import { errorMessage } from "../../node/errorMessage";
import { readConfigFile, resolveConfig } from "../../node/loadStyleGenConfig";
import { resolveProjectPath } from "../../node/resolveProjectPath";
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
 * Names the first file two roles share among the theme file and the two
 * schema targets, which a write would clobber.
 * @param {string} cwd - Project root, to print paths relative to it
 * @param {string | undefined} outPath - Resolved theme-schema target
 * @param {string} configOutPath - Resolved config-schema target
 * @param {string | undefined} themePath - Resolved theme file, when the config is readable
 * @returns {string | undefined} The error message, or `undefined` when the files are distinct
 */
function describeCollision(
  cwd: string,
  outPath: string | undefined,
  configOutPath: string,
  themePath: string | undefined,
): string | undefined {
  const shown = (target: string): string => path.relative(cwd, target);
  if (outPath === configOutPath) {
    return `--out and --config-out name the same file: ${shown(outPath)}`;
  }
  if (outPath !== undefined && outPath === themePath) {
    return `--out would overwrite the theme file: ${shown(outPath)}`;
  }
  if (configOutPath === themePath) {
    return `--config-out would overwrite the theme file: ${shown(configOutPath)}`;
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
 * expects it. Without `--out`, the config is also read like `generate` reads
 * it: a malformed file is warned about and read as the defaults; one with
 * schema issues still gets its config schema written (the moment an upgrader
 * needs it), after which the issues are reported, the exit code is 1 and no
 * theme schema is written.
 *
 * Both targets must stay inside the project root, so a theme outside it
 * (a monorepo's shared theme) needs an explicit `--out`. The theme file and
 * the two schema targets must be three distinct files: nothing is written
 * when one would overwrite another.
 * @param {SchemaArgs} args - Schema command arguments from the CLI
 * @param {string} [cwd] - Project root; defaults to `process.cwd()`
 * @returns {number} The process exit code
 */
export function schemaCommand(
  args: SchemaArgs,
  cwd: string = process.cwd(),
): number {
  // The config decides where the theme schema goes, so without `--out` its
  // problems are this command's: a malformed file is read as the defaults
  // (a warning), one with schema issues fails after the config schema is
  // written. With `--out` the config is only consulted for the theme file's
  // path, to refuse overwriting it; whatever is wrong with it is not
  // reported here (`init` calls this with a config it merges afterwards).
  const file = readConfigFile(cwd);
  if (file.error && !args.out) {
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

  // A config with issues has no trustworthy `theme`.
  let themePath: string | undefined;
  let outPath: string | undefined;
  try {
    if (!file.issues) {
      themePath = resolveProjectPath(
        cwd,
        resolveConfig({}, file).theme,
        "theme",
        { allowOutsideRoot: true },
      );
    }
    if (args.out) {
      outPath = resolveProjectPath(cwd, args.out, "--out");
    } else if (themePath) {
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

  const collision = describeCollision(cwd, outPath, configOutPath, themePath);
  if (collision) {
    logger.error(collision);
    return 1;
  }

  writeJsonSchema(configOutPath, buildConfigJsonSchema());
  logger.success(
    `Config JSON Schema written to ${path.relative(cwd, configOutPath)}`,
  );
  if (outPath === undefined) {
    // Only a config with issues leaves the theme schema without a target.
    logger.error(
      `Invalid config (${file.source ?? "style-gen.config.json"}):\n${file.issues ?? ""}`,
    );
    return 1;
  }
  writeJsonSchema(outPath, z.toJSONSchema(ThemeSchema));
  logger.success(`Theme JSON Schema written to ${path.relative(cwd, outPath)}`);
  return 0;
}
