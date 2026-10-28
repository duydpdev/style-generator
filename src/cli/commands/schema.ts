import fs from "node:fs";
import path from "node:path";

import { z } from "zod";

import { ThemeSchema } from "../../core/themeSchema";
import { resolveProjectPath } from "../../node/resolveProjectPath";
import { loadCliConfig } from "../loadCliConfig";
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
 *
 * The target must stay inside the project root, so a theme outside it
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
    logger.error(
      `${error instanceof Error ? error.message : String(error)}${hint}`,
    );
    return 1;
  }
  const jsonSchema = z.toJSONSchema(ThemeSchema);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(jsonSchema, null, 2) + "\n", "utf8");
  logger.success(`Theme JSON Schema written to ${path.relative(cwd, outPath)}`);
  return 0;
}
