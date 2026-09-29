import fs from "node:fs";
import path from "node:path";

import { z } from "zod";

import { ThemeSchema } from "../../core/themeSchema";
import { logger } from "../logger";

export interface SchemaArgs {
  out?: string;
}

const DEFAULT_OUT = "theme.schema.json";

/**
 * Executes the `schema` CLI command: writes `ThemeSchema`'s JSON Schema
 * (via `z.toJSONSchema`) to disk so editors can offer autocomplete and
 * unknown-key warnings for a theme.json referencing it via `"$schema"`.
 * @param {SchemaArgs} args - Schema command arguments from the CLI
 */
export function schemaCommand(args: SchemaArgs): void {
  const outPath = path.resolve(process.cwd(), args.out ?? DEFAULT_OUT);
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
