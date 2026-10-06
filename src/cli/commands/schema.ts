import fs from "node:fs";
import path from "node:path";

import { z } from "zod";

import { ThemeSchema } from "../../core/themeSchema";
import { normalizePath, readConfigFile, resolveConfig } from "../config";
import { logger } from "../logger";

export interface SchemaArgs {
  out?: string;
}

const SCHEMA_FILE_NAME = "theme.schema.json";

/**
 * Executes the `schema` CLI command: writes `ThemeSchema`'s JSON Schema
 * (via `z.toJSONSchema`) to disk so editors can offer autocomplete and
 * unknown-key warnings for a theme.json referencing it via `"$schema"`.
 * Without `--out` the file lands next to the configured `theme`, where the
 * theme's `"$schema": "./theme.schema.json"` expects it; a config file is
 * then read like `generate` reads it (malformed → warn and use the
 * defaults, schema issues → exit code 1, nothing written).
 * @param {SchemaArgs} args - Schema command arguments from the CLI
 */
export function schemaCommand(args: SchemaArgs): void {
  let outPath: string;
  if (args.out) {
    outPath = path.resolve(process.cwd(), args.out);
  } else {
    const configFile = readConfigFile(process.cwd());
    if (configFile.error) {
      logger.warn(`Ignoring ${configFile.error}; using defaults`);
    }
    if (configFile.issues) {
      logger.error(
        `Invalid config (${configFile.source ?? "style-gen.config.json"}):\n${configFile.issues}`,
      );
      process.exitCode = 1;
      return;
    }
    const config = resolveConfig({}, configFile);
    outPath = path.resolve(
      process.cwd(),
      path.dirname(normalizePath(config.theme)),
      SCHEMA_FILE_NAME,
    );
  }
  const jsonSchema = z.toJSONSchema(ThemeSchema);

  const outDir = path.dirname(outPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(outPath, JSON.stringify(jsonSchema, null, 2) + "\n", "utf8");
  logger.success(
    `Theme JSON Schema written to ${path.relative(process.cwd(), outPath)}`,
  );
}
