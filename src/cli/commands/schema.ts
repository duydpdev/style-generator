import fs from "node:fs";
import path from "node:path";

import { z } from "zod";

import { ThemeSchema } from "../../core/themeSchema";
import { errorMessage } from "../../node/errorMessage";
import { StyleGenConfigFileSchema } from "../../node/loadStyleGenConfig";
import { resolveProjectPath } from "../../node/resolveProjectPath";
import { loadCliConfig } from "../loadCliConfig";
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
 * Executes the `schema` CLI command: writes `ThemeSchema`'s and
 * `style-gen.config.json`'s JSON Schemas (via `z.toJSONSchema`) to disk so
 * editors can offer autocomplete and unknown-key warnings for a theme.json or
 * a config referencing them via `"$schema"`.
 * Without `--out` the theme schema lands next to the configured `theme`,
 * where the theme's `"$schema": "./theme.schema.json"` expects it; a config
 * file is then read like `generate` reads it (malformed → warn and use the
 * defaults, schema issues → exit code 1, nothing written). The config schema
 * goes to `--config-out`, else `style-gen.config.schema.json` in the project
 * root, where the config's `"$schema": "./style-gen.config.schema.json"`
 * expects it.
 *
 * Both targets must stay inside the project root, so a theme outside it
 * (a monorepo's shared theme) needs an explicit `--out`.
 * @param {SchemaArgs} args - Schema command arguments from the CLI
 * @param {string} [cwd] - Project root; defaults to `process.cwd()`
 * @returns {number} The process exit code
 */
export function schemaCommand(
  args: SchemaArgs,
  cwd: string = process.cwd(),
): number {
  let outPath: string;
  try {
    if (args.out) {
      outPath = resolveProjectPath(cwd, args.out, "--out");
    } else {
      const loaded = loadCliConfig(cwd);
      if (!loaded) return 1;
      const themePath = resolveProjectPath(cwd, loaded.config.theme, "theme", {
        allowOutsideRoot: true,
      });
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
  let configOutPath: string;
  try {
    configOutPath = args.configOut
      ? resolveProjectPath(cwd, args.configOut, "--config-out")
      : path.join(cwd, CONFIG_SCHEMA_FILE_NAME);
  } catch (error) {
    logger.error(errorMessage(error));
    return 1;
  }

  writeJsonSchema(outPath, z.toJSONSchema(ThemeSchema));
  logger.success(`Theme JSON Schema written to ${path.relative(cwd, outPath)}`);
  writeJsonSchema(configOutPath, z.toJSONSchema(StyleGenConfigFileSchema));
  logger.success(
    `Config JSON Schema written to ${path.relative(cwd, configOutPath)}`,
  );
  return 0;
}
