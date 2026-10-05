import fs from "node:fs";
import path from "node:path";

import type { SpacingPropertyMap } from "../core/Options";

export interface StyleGenConfig {
  theme: string;
  output: string;
  /**
   * Generator script scaffolded by `style-gen init`. Optional: `doctor`
   * checks it only when it is configured.
   */
  plugin?: string;
  breakpoints?: string[];
  screens?: Record<string, string>;
  /** Forwarded to `generate()` — see `StyleGeneratorOptions.extraSources`. */
  extraSources?: string[];
  /** Forwarded to `generate()` — see `StyleGeneratorOptions.spacing`. */
  spacing?: {
    enabled?: boolean;
    properties?: SpacingPropertyMap;
  };
  /** Forwarded to `generate()` — see `StyleGeneratorOptions.typography`. */
  typography?: {
    cssVarDriven?: boolean;
  };
}

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

/**
 * Sanitizes the flags to remove undefined values
 * @param {StyleGenConfigFlags} flags - The flags to sanitize
 * @returns {Partial<StyleGenConfig>} The sanitized flags
 */
function sanitizeFlags(flags: StyleGenConfigFlags): Partial<StyleGenConfig> {
  const sanitized: Partial<StyleGenConfig> = {};

  if (flags.theme !== undefined) {
    sanitized.theme = flags.theme;
  }
  if (flags.output !== undefined) {
    sanitized.output = flags.output;
  }
  if (flags.plugin !== undefined) {
    sanitized.plugin = flags.plugin;
  }
  if (flags.breakpoints !== undefined) {
    sanitized.breakpoints = flags.breakpoints;
  }
  if (flags.screens !== undefined) {
    sanitized.screens = flags.screens;
  }
  if (flags.extraSources !== undefined) {
    sanitized.extraSources = flags.extraSources;
  }
  if (flags.spacing !== undefined) {
    sanitized.spacing = flags.spacing;
  }
  if (flags.typography !== undefined) {
    sanitized.typography = flags.typography;
  }

  return sanitized;
}

/** File-based configuration and where it came from. */
export interface ConfigFile {
  config: Partial<StyleGenConfig>;
  /** `style-gen.config.json` or `package.json`, when one was read. */
  source?: string;
  /** Why the file was ignored (malformed JSON, non-object config). */
  error?: string;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

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
        ? { config: parsed as Partial<StyleGenConfig>, source }
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
    ? { config: section as Partial<StyleGenConfig>, source }
    : {
        config: {},
        source,
        error: `${source} "style-gen" must be a JSON object`,
      };
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
    ...file.config,
    ...sanitizeFlags(flags),
  };
}
