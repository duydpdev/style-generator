import fs from "node:fs";
import path from "node:path";

import { z } from "zod";

import type { StyleGeneratorOptions } from "../core/Options";
import {
  StyleGeneratorOptionsShape,
  refineStyleGeneratorOptions,
} from "../core/optionsSchema";
import { formatZodError } from "../core/themeSchema";

/**
 * CLI-only config keys, layered on the strict `generate()` options shape so
 * `style-gen.config.json` gets the same unknown-key, flag and screen checks
 * as `generate()` itself.
 */
const cliKeys = {
  /** Editors add it for autocompletion; a strict object would reject it. */
  $schema: z.string().optional(),
  /** Theme JSON path, relative to the project root. */
  theme: z.string().min(1),
  /** Generated CSS path, relative to the project root. */
  output: z.string().min(1),
  /**
   * Generator script scaffolded by `style-gen init`. Optional: `doctor`
   * checks it only when it is configured.
   */
  plugin: z.string().min(1).optional(),
};

/**
 * Resolved CLI configuration: the CLI-only keys plus every `generate()`
 * option (`breakpoints`, `screens`, `enableResponsive`, `spacing`,
 * `typography`, `extraSources`), forwarded through
 * {@link toGeneratorOptions}.
 */
export const StyleGenConfigSchema = StyleGeneratorOptionsShape.extend(
  cliKeys,
).superRefine(refineStyleGeneratorOptions);

export type StyleGenConfig = z.infer<typeof StyleGenConfigSchema>;

/**
 * The file form of {@link StyleGenConfigSchema}: `theme`/`output` may be
 * omitted (the defaults apply).
 */
const StyleGenConfigFileSchema = StyleGeneratorOptionsShape.extend({
  ...cliKeys,
  theme: cliKeys.theme.optional(),
  output: cliKeys.output.optional(),
}).superRefine(refineStyleGeneratorOptions);

/**
 * Raw CLI/programmatic flags input: unlike {@link StyleGenConfig}, each
 * field may be explicitly `undefined` (e.g. an unset `parseArgs` flag, or
 * a caller spreading an optional value) — `sanitizeFlags` strips those
 * before merging with file config and defaults.
 */
export type StyleGenConfigFlags = {
  [K in keyof StyleGenConfig]?: StyleGenConfig[K] | undefined;
};

export const defaultConfig: StyleGenConfig = {
  theme: "styles/theme.json",
  output: "styles/theme.css",
};

/**
 * Normalizes a path input from the user.
 * Strips leading '/' to prevent path.resolve from treating it as an absolute path from filesystem root.
 * @param {string} p - The path to normalize
 * @returns {string} The normalized path
 */
export function normalizePath(p: string): string {
  let normalized = p.trim();

  // Strip leading slash if it's not meant to be an absolute path from the system root
  if (normalized.startsWith("/") && !normalized.startsWith(process.cwd())) {
    normalized = normalized.substring(1);
  }

  return path.normalize(normalized);
}

const CONFIG_KEYS = StyleGenConfigSchema.keyof().options;

/**
 * Drops `undefined` values so a flag or file key that is unset never
 * overrides a lower layer (file config or defaults). The key list comes from
 * {@link StyleGenConfigSchema}, so a new option is carried through
 * automatically.
 * @param {StyleGenConfigFlags} flags - The flags or file config to sanitize
 * @returns {Partial<StyleGenConfig>} The sanitized values
 */
function sanitizeFlags(flags: StyleGenConfigFlags): Partial<StyleGenConfig> {
  const sanitized: Record<string, unknown> = {};
  for (const key of CONFIG_KEYS) {
    if (flags[key] !== undefined) sanitized[key] = flags[key];
  }
  return sanitized as Partial<StyleGenConfig>;
}

/** `style-gen.config.json` contents: every key optional (defaults apply). */
export type StyleGenFileConfig = z.infer<typeof StyleGenConfigFileSchema>;

/** File-based configuration and where it came from. */
export interface ConfigFile {
  config: StyleGenFileConfig;
  /** `style-gen.config.json` or `package.json`, when one was read. */
  source?: string;
  /** Why the file was ignored (malformed JSON, non-object config). */
  error?: string;
  /**
   * Schema violations, one `path → message` line each; the file is not
   * merged.
   */
  issues?: string;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Validate a file config object against the strict config schema.
 * @param {Record<string, unknown>} value - The parsed config object
 * @param {string} source - Where it was read from
 * @returns {ConfigFile} The parsed config, or no config plus the formatted issues
 */
const validateFileConfig = (
  value: Record<string, unknown>,
  source: string,
): ConfigFile => {
  const result = StyleGenConfigFileSchema.safeParse(value);
  return result.success
    ? { config: result.data, source }
    : { config: {}, source, issues: formatZodError(result.error) };
};

/**
 * Reads `style-gen.config.json`, else `package.json#style-gen`, from `cwd`.
 * A malformed file is ignored (defaults apply) and reported through `error`
 * so callers can warn (`generate`) or fail (`doctor`).
 * @param {string} cwd - The current working directory
 * @returns {ConfigFile} The file config, its source and any error
 */
export function readConfigFile(cwd: string): ConfigFile {
  const configPath = path.resolve(cwd, "style-gen.config.json");

  if (fs.existsSync(configPath)) {
    const source = "style-gen.config.json";
    try {
      const parsed: unknown = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      return isPlainObject(parsed)
        ? validateFileConfig(parsed, source)
        : { config: {}, source, error: `${source} must contain a JSON object` };
    } catch (error) {
      return {
        config: {},
        source,
        error: `${source} is not valid JSON (${(error as Error).message})`,
      };
    }
  }

  const pkgPath = path.resolve(cwd, "package.json");

  if (!fs.existsSync(pkgPath)) {
    return { config: {} };
  }

  const source = "package.json";
  let pkg: unknown;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  } catch (error) {
    return {
      config: {},
      source,
      error: `${source} is not valid JSON (${(error as Error).message})`,
    };
  }

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
 * Pick the `generate()` options out of a resolved config, dropping the
 * CLI-only keys (`theme`, `output`, `plugin`, `$schema`) that the strict
 * options schema would reject. The key list comes from
 * `StyleGeneratorOptionsShape`, so a new option is forwarded automatically.
 * @param {StyleGenConfig} config - Resolved CLI configuration
 * @returns {StyleGeneratorOptions} The options to pass to `generate()`
 */
export function toGeneratorOptions(
  config: StyleGenConfig,
): StyleGeneratorOptions {
  const picked: Record<string, unknown> = {};
  for (const key of GENERATOR_OPTION_KEYS) {
    if (config[key] !== undefined) picked[key] = config[key];
  }
  return picked as StyleGeneratorOptions;
}

/**
 * Resolves CLI configuration: flags over file config over defaults.
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
