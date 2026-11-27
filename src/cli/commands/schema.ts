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
  type ConfigFile,
} from "../../node/loadStyleGenConfig";
import { resolveProjectPath } from "../../node/resolveProjectPath";
import { sameFile } from "../../node/sameFile";
import { buildConfigJsonSchema, CONFIG_SCHEMA_FILE } from "../configJsonSchema";
import { logger } from "../logger";

export interface SchemaArgs {
  out?: string;
  configOut?: string;
}

const SCHEMA_FILE_NAME = "theme.schema.json";

// Committed-file style: parent directories created, two-space JSON, trailing newline.
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

// Inserts `"$schema"` as the first key, keeping every other byte (the file's EOL, the first
// property's indent); `undefined` unless the result parses as an object starting with `$schema`.
function insertSchemaKey(text: string, pointer: string): string | undefined {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const open = text.indexOf("{");
  if (open < 0 || text.slice(0, open).trim() !== "") return undefined;
  const head = text.slice(0, open + 1);
  const rest = text.slice(open + 1);
  const entry = `"$schema": ${JSON.stringify(pointer)}`;
  const empty = /^\s*\}/.exec(rest);
  let result: string;
  if (empty) {
    result = `${head}${eol}  ${entry}${eol}}${rest.slice(empty[0].length)}`;
  } else {
    const next = rest
      .split(/\r?\n/)
      .slice(1)
      .find((line) => line.trim() !== "");
    const indent = next === undefined ? "  " : (/^\s*/.exec(next)?.[0] ?? "");
    result = `${head}${eol}${indent}${entry},${rest}`;
  }
  try {
    const parsed = JSON.parse(result) as unknown;
    return typeof parsed === "object" &&
      parsed !== null &&
      Object.keys(parsed)[0] === "$schema"
      ? result
      : undefined;
  } catch {
    return undefined;
  }
}

// A valid `style-gen.config.json` without `"$schema"` gets it in place (symlink and mode kept);
// any other one only gets the line printed; `package.json["style-gen"]` is never touched.
function pointConfigAtSchema(
  cwd: string,
  file: ConfigFile,
  pointer: string,
): void {
  if (file.source !== "style-gen.config.json") return;
  if (file.raw?.$schema !== undefined) return;
  const configPath = path.join(cwd, "style-gen.config.json");
  if (file.error === undefined && file.issues === undefined) {
    const updated = insertSchemaKey(
      fs.readFileSync(configPath, "utf8"),
      pointer,
    );
    if (updated !== undefined) {
      fs.writeFileSync(configPath, updated);
      logger.info('Added "$schema" to style-gen.config.json');
      return;
    }
  }
  logger.info(
    `💡 Add "$schema": ${JSON.stringify(pointer)} as the first key of style-gen.config.json for editor hints`,
  );
}

// The error for the first file a schema write would clobber (theme, config, the other target).
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

// Rationale: documents/architecture.md#schemats-why-an-invalid-config-still-gets-its-schema
/**
 * Executes the `schema` CLI command: writes the theme and config JSON Schemas
 * (contract: `documents/reference/cli.md`). Both targets stay inside the root
 * and may not overwrite each other, the theme or a config file.
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
      : path.join(cwd, CONFIG_SCHEMA_FILE);
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
  pointConfigAtSchema(
    cwd,
    file,
    `./${path.relative(cwd, configOutPath).split(path.sep).join("/")}`,
  );
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
