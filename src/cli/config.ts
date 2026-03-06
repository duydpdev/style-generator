import fs from "node:fs";
import path from "node:path";

import type { StyleModule } from "../core/Options";

export interface StyleGenConfig {
  theme: string;
  output: string;
  plugin: string;
  breakpoints?: string[];
  responsiveModules?: StyleModule[];
  screens?: Record<string, string>;
}

export const defaultConfig: StyleGenConfig = {
  theme: "styles/theme.json",
  output: "styles/safelist.txt",
  plugin: "plugins/theme-plugin.ts",
};

/**
 * Sanitizes the flags to remove undefined values
 * @param {Partial<StyleGenConfig>} flags - The flags to sanitize
 * @returns {Partial<StyleGenConfig>} The sanitized flags
 */
function sanitizeFlags(
  flags: Partial<StyleGenConfig>,
): Partial<StyleGenConfig> {
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
  if (flags.responsiveModules !== undefined) {
    sanitized.responsiveModules = flags.responsiveModules;
  }
  if (flags.screens !== undefined) {
    sanitized.screens = flags.screens;
  }

  return sanitized;
}

/**
 * Loads the file config from the current working directory
 * @param {string} cwd - The current working directory
 * @returns {Partial<StyleGenConfig>} The loaded file config
 */
function loadFileConfig(cwd: string): Partial<StyleGenConfig> {
  const configPath = path.resolve(cwd, "style-gen.config.json");

  if (fs.existsSync(configPath)) {
    try {
      return JSON.parse(
        fs.readFileSync(configPath, "utf-8"),
      ) as Partial<StyleGenConfig>;
    } catch {
      return {};
    }
  }

  const pkgPath = path.resolve(cwd, "package.json");

  if (!fs.existsSync(pkgPath)) {
    return {};
  }

  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as Record<
      string,
      unknown
    >;

    if ("style-gen" in pkg) {
      return pkg["style-gen"] as Partial<StyleGenConfig>;
    }
  } catch {
    // Ignore
  }

  return {};
}

/**
 * Resolves CLI configuration from file arguments and defaults
 * @param {Partial<StyleGenConfig>} flags - The command line flags
 * @returns {StyleGenConfig} The resolved StyleGen configuration
 */
export function resolveConfig(flags: Partial<StyleGenConfig>): StyleGenConfig {
  const sanitizedFlags = sanitizeFlags(flags);
  const fileConfig = loadFileConfig(process.cwd());

  return {
    ...defaultConfig,
    ...fileConfig,
    ...sanitizedFlags,
  };
}
