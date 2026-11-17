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

/**
 * Config-only keys, layered on the strict `generate()` options shape so
 * `style-gen.config.json` gets the same unknown-key, flag and screen checks
 * as `generate()` itself.
 */
const cliKeys = {
  /** Theme JSON path, relative to the project root. */
  theme: z.string().min(1),
  /** Generated CSS path, relative to the project root. */
  output: z.string().min(1),
  /**
   * Generated tokens module path, relative to the project root; default:
   * `theme.tokens.ts` beside `output`.
   */
  tokensOutput: z.string().min(1).optional(),
};

/**
 * Resolved configuration: the config-only keys plus every `generate()`
 * option (`breakpoints`, `screens`, `enableResponsive`, `spacing`,
 * `typography`, `coverage`, `resetTailwindDefaults`),
 * forwarded through {@link toGeneratorOptions}.
 */
export const StyleGenConfigSchema = StyleGeneratorOptionsShape.extend(
  cliKeys,
).superRefine(refineStyleGeneratorOptions);

export type StyleGenConfig = z.infer<typeof StyleGenConfigSchema>;

/**
 * The file form of {@link StyleGenConfigSchema}: `theme`/`output` may be
 * omitted (the defaults apply) and `$schema`, the editor's pointer to the
 * config's JSON Schema, is accepted. `$schema` belongs to the file only: it
 * is not a key of the resolved {@link StyleGenConfig}.
 */
export const StyleGenConfigFileSchema = StyleGeneratorOptionsShape.extend({
  ...cliKeys,
  $schema: z.string().optional(),
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

/**
 * `style-gen.config.json` contents: every key optional (defaults apply). The
 * editor's `$schema` key is accepted in the file and dropped on read.
 */
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
  /**
   * The config object as it was parsed, valid or not, so a caller can read
   * what it declares ({@link declaredLayout}) or merge into it (`init`);
   * unset without a config and for a file that is not a JSON object.
   */
  raw?: Record<string, unknown>;
}

/** The `theme`/`output` a config file declares, and where it came from. */
export interface DeclaredLayout {
  /** `style-gen.config.json` or `package.json`. */
  source: string;
  /** The `theme` key, when it is a non-empty string. */
  theme?: string;
  /** The `output` key, when it is a non-empty string. */
  output?: string;
}

/**
 * The raw `theme`/`output` strings of a config file, whether or not the file
 * passes validation: an invalid config still declares them, so a caller that
 * repairs it (`init`) can keep them. A key that is not a non-empty string is
 * left out.
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

/**
 * Reads `style-gen.config.json`, else `package.json#style-gen`, from `cwd`.
 * A malformed file is ignored (defaults apply) and reported through `error`
 * so callers can warn (`generate`) or fail (`doctor`, the bundler plugins).
 * @param {string} cwd - The project root
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
 * config-only keys (`theme`, `output`, `tokensOutput`) that the strict
 * options schema would reject. The key list comes from
 * `StyleGeneratorOptionsShape`, so a new option is forwarded automatically.
 * The only way config options reach `generate()` and the runner.
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
  return picked as StyleGeneratorOptions;
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
 * Load the config the way the Vite plugin, the Next.js integration and the
 * CLI do when they are given no options: `style-gen.config.json`, else
 * `package.json#style-gen`, read from `root`, merged over the defaults.
 * `source`, `error` and `issues` are passed through so the caller can refuse
 * an invalid config (`issues`, `error`) instead of silently using defaults.
 * @param {string} root - The project root
 * @returns {LoadedStyleGenConfig} The resolved config and where it came from
 */
export function loadStyleGenConfig(root: string): LoadedStyleGenConfig {
  const file = readConfigFile(root);
  return { ...file, config: resolveConfig({}, file) };
}

/**
 * The line a caller prints when it finds no config in `root`, so a wrong
 * `root` (Nuxt's `app/` folder) or a misplaced file is visible instead of
 * silently meaning "use the defaults".
 * @param {string} root - The directory that was searched
 * @returns {string} One sentence, no label prefix
 */
export function noConfigMessage(root: string): string {
  return `No style-gen.config.json or package.json#style-gen found in ${root}; using the defaults.`;
}
