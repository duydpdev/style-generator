import fs from "node:fs";
import path from "node:path";

import { z } from "zod";

import type { StyleGeneratorOptions } from "../core/Options";
import {
  StyleGeneratorOptionsShape,
  refineStyleGeneratorOptions,
} from "../core/optionsSchema";
import { formatZodError } from "../core/themeSchema";

import { isPlainObject } from "./isPlainObject";

// Config-only paths (relative to the root) on the strict `generate()` shape.
const cliKeys = {
  theme: z.string().min(1),
  output: z.string().min(1),
  /** Default: `theme.tokens.ts` beside `output`. */
  tokensOutput: z.string().min(1).optional(),
};

/** Resolved configuration: the config-only keys plus every `generate()` option. */
export const StyleGenConfigSchema = StyleGeneratorOptionsShape.extend(
  cliKeys,
).superRefine(refineStyleGeneratorOptions);

export type StyleGenConfig = z.infer<typeof StyleGenConfigSchema>;

/** File form of {@link StyleGenConfigSchema}: `theme`/`output` optional, `$schema` accepted. */
export const StyleGenConfigFileSchema = StyleGeneratorOptionsShape.extend({
  ...cliKeys,
  $schema: z.string().optional(),
  theme: cliKeys.theme.optional(),
  output: cliKeys.output.optional(),
}).superRefine(refineStyleGeneratorOptions);

/** CLI/programmatic flags: any key may be explicitly `undefined` (dropped before merging). */
export type StyleGenConfigFlags = {
  [K in keyof StyleGenConfig]?: StyleGenConfig[K] | undefined;
};

export const defaultConfig: StyleGenConfig = {
  theme: "styles/theme.json",
  output: "styles/theme.css",
};

const CONFIG_KEYS = StyleGenConfigSchema.keyof().options;

// Drop `undefined` so an unset key never overrides a lower layer.
function sanitizeFlags(flags: StyleGenConfigFlags): Partial<StyleGenConfig> {
  const sanitized: Record<string, unknown> = {};
  for (const key of CONFIG_KEYS) {
    if (flags[key] !== undefined) sanitized[key] = flags[key];
  }
  return sanitized;
}

/** `style-gen.config.json` contents: every key optional, `$schema` dropped on read. */
export type StyleGenFileConfig = z.infer<typeof StyleGenConfigFileSchema>;

/** File-based configuration and where it came from. */
export interface ConfigFile {
  config: StyleGenFileConfig;
  source?: string;
  /** Why the file was ignored (malformed JSON, non-object config). */
  error?: string;
  /** Schema violations, one `path → message` line each; the file is not merged. */
  issues?: string;
  /** The parsed config object, valid or not; unset when it is not a JSON object. */
  raw?: Record<string, unknown>;
}

/** The `theme`/`output` a config file declares, and where it came from. */
export interface DeclaredLayout {
  source: string;
  theme?: string;
  output?: string;
}

/**
 * The non-empty `theme`/`output` a config file declares, valid or not (`init` keeps them).
 * @param {ConfigFile} file - {@link readConfigFile}'s result
 * @returns {DeclaredLayout | undefined} The declared paths, or `undefined` without a config
 */
export function declaredLayout(file: ConfigFile): DeclaredLayout | undefined {
  if (file.source === undefined) return undefined;
  const values: Record<string, unknown> = file.raw ?? file.config;
  const declared: DeclaredLayout = { source: file.source };
  for (const key of ["theme", "output"] as const) {
    const value = values[key];
    if (typeof value === "string" && value !== "") declared[key] = value;
  }
  return declared;
}

const validateFileConfig = (
  value: Record<string, unknown>,
  source: string,
): ConfigFile => {
  const result = StyleGenConfigFileSchema.safeParse(value);
  if (!result.success) {
    return {
      config: {},
      source,
      issues: formatZodError(result.error),
      raw: value,
    };
  }
  // `$schema` points an editor at the JSON Schema; it is not a config value.
  const config: StyleGenFileConfig = { ...result.data };
  delete config.$schema;
  return { config, source, raw: value };
};

// Tells a file that cannot be read (a directory, a permission error) from invalid JSON.
const readJsonFile = (
  filePath: string,
  source: string,
): { value: unknown } | { error: string } => {
  let text: string;
  try {
    text = fs.readFileSync(filePath, "utf-8");
  } catch (error) {
    return { error: `${source} cannot be read (${(error as Error).message})` };
  }

  try {
    return { value: JSON.parse(text) as unknown };
  } catch (error) {
    return {
      error: `${source} is not valid JSON (${(error as Error).message})`,
    };
  }
};

/**
 * Reads the config from `cwd`; a malformed file is ignored and reported through `error`.
 * @param {string} cwd - The project root
 * @returns {ConfigFile} The file config, its source and any error
 */
export function readConfigFile(cwd: string): ConfigFile {
  const configPath = path.resolve(cwd, "style-gen.config.json");

  if (fs.existsSync(configPath)) {
    const source = "style-gen.config.json";
    const read = readJsonFile(configPath, source);
    if ("error" in read) {
      return { config: {}, source, error: read.error };
    }
    return isPlainObject(read.value)
      ? validateFileConfig(read.value, source)
      : { config: {}, source, error: `${source} must contain a JSON object` };
  }

  const pkgPath = path.resolve(cwd, "package.json");

  if (!fs.existsSync(pkgPath)) {
    return { config: {} };
  }

  const source = "package.json";
  const read = readJsonFile(pkgPath, source);
  if ("error" in read) {
    return { config: {}, source, error: read.error };
  }
  const pkg = read.value;

  if (!isPlainObject(pkg) || !("style-gen" in pkg)) {
    return { config: {} };
  }

  const section = pkg["style-gen"];
  return isPlainObject(section)
    ? validateFileConfig(section, source)
    : {
        config: {},
        source,
        error: `${source} "style-gen" must be a JSON object`,
      };
}

const GENERATOR_OPTION_KEYS = StyleGeneratorOptionsShape.keyof().options;

/**
 * The `generate()` options of a resolved config: the only path from config to `generate()`.
 * @param {StyleGenConfig} config - Resolved configuration
 * @returns {StyleGeneratorOptions} The options to pass to `generate()`
 */
export function toGeneratorOptions(
  config: StyleGenConfig,
): StyleGeneratorOptions {
  const picked: Record<string, unknown> = {};
  for (const key of GENERATOR_OPTION_KEYS) {
    if (config[key] !== undefined) picked[key] = config[key];
  }
  return picked;
}

/**
 * Resolves configuration: flags over file config over defaults.
 * @param {StyleGenConfigFlags} flags - The command line flags
 * @param {ConfigFile} [file] - File config; read from `process.cwd()` when omitted
 * @returns {StyleGenConfig} The resolved StyleGen configuration
 */
export function resolveConfig(
  flags: StyleGenConfigFlags,
  file: ConfigFile = readConfigFile(process.cwd()),
): StyleGenConfig {
  return {
    ...defaultConfig,
    ...sanitizeFlags(file.config),
    ...sanitizeFlags(flags),
  };
}

/** {@link ConfigFile} with the merged, defaulted config. */
export type LoadedStyleGenConfig = Omit<ConfigFile, "config"> & {
  config: StyleGenConfig;
};

/**
 * Load the config from `root` over the defaults; `error`/`issues` pass through.
 * @param {string} root - The project root
 * @returns {LoadedStyleGenConfig} The resolved config and where it came from
 */
export function loadStyleGenConfig(root: string): LoadedStyleGenConfig {
  const file = readConfigFile(root);
  return { ...file, config: resolveConfig({}, file) };
}

/**
 * The line printed when `root` holds no config, so a wrong `root` is visible.
 * @param {string} root - The directory that was searched
 * @returns {string} One sentence, no label prefix
 */
export function noConfigMessage(root: string): string {
  return `No style-gen.config.json or package.json#style-gen found in ${root}; using the defaults.`;
}
