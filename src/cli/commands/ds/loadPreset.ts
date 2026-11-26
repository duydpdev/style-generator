import { readFileSync } from "node:fs";
import { extname } from "node:path";
import { pathToFileURL } from "node:url";

import { z } from "zod";

/** An input the user can fix: a missing flag, an unreadable file, a preset that is not data. */
export class DsInputError extends Error {}

const PresetsSchema = z.object({
  boxPreset: z.record(z.string(), z.unknown()),
  textPreset: z.looseObject({
    defaultType: z.string(),
    defaultColor: z.string(),
  }),
  buttonPreset: z.looseObject({
    intents: z.array(z.string()).min(1),
    height: z.record(z.string(), z.string()).optional(),
  }),
});

/** The three presets the components bind, as plain JSON data. */
export type Presets = z.infer<typeof PresetsSchema>;

const TS_EXTENSIONS = new Set([".ts", ".mts", ".cts"]);

// Data only: a function, symbol or bigint in a preset would be dropped by JSON and change the output silently.
function dataOnly(_key: string, value: unknown): unknown {
  if (["function", "symbol", "bigint"].includes(typeof value))
    throw new DsInputError(
      `the preset holds a ${typeof value}; a preset is data (strings, numbers, booleans, arrays, objects)`,
    );
  return value;
}

async function importModule(file: string): Promise<Record<string, unknown>> {
  const ext = extname(file).toLowerCase();
  if (ext === ".json")
    return JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
  if (TS_EXTENSIONS.has(ext) && !process.features.typescript)
    throw new DsInputError(
      "ds build needs Node 22.18+ for a .ts preset; rename it to .mjs",
    );
  return (await import(pathToFileURL(file).href)) as Record<string, unknown>;
}

/**
 * Loads the product's preset module. It is imported as code with the user's privileges, like a config file,
 * so it must hold no imports of its own to resolve; only its three preset objects reach the bundle, as JSON.
 * @param {string} file - Absolute path of the `.mjs`, `.js`, `.json` or (Node 22.18+) `.ts` preset
 * @returns {Promise<Presets>} The validated, JSON-round-tripped presets
 * @throws {DsInputError} When the file cannot be imported or lacks a preset
 */
export async function loadPreset(file: string): Promise<Presets> {
  let module: Record<string, unknown>;
  try {
    module = await importModule(file);
  } catch (error) {
    if (error instanceof DsInputError) throw error;
    throw new DsInputError(
      `cannot load the preset ${file}: ${error instanceof Error ? error.message : String(error)} (a preset is a data-only module: no imports)`,
    );
  }
  const picked = {
    boxPreset: module.boxPreset,
    textPreset: module.textPreset,
    buttonPreset: module.buttonPreset,
  };
  const missing = Object.entries(picked)
    .filter(([, value]) => value === undefined)
    .map(([name]) => name);
  if (missing.length > 0)
    throw new DsInputError(`${file} does not export ${missing.join(", ")}`);
  const data: unknown = JSON.parse(JSON.stringify(picked, dataOnly));
  const parsed = PresetsSchema.safeParse(data);
  if (!parsed.success)
    throw new DsInputError(
      `${file} is not a valid preset: ${parsed.error.issues
        .map((i) => `${i.path.join(".")} ${i.message}`)
        .join("; ")}`,
    );
  return parsed.data;
}
