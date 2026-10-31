import {
  readConfigFile,
  resolveConfig,
  type ConfigFile,
  type StyleGenConfig,
  type StyleGenConfigFlags,
} from "../node/loadStyleGenConfig";

import { logger } from "./logger";

/** A usable CLI configuration and the file it was merged from. */
export interface CliConfig {
  /** Flags over file over defaults. */
  config: StyleGenConfig;
  /** The config file as read, for watchers that reload it. */
  file: ConfigFile;
}

/**
 * Reads `style-gen.config.json` (else `package.json#style-gen`) from `cwd`
 * and merges it under `flags`. A malformed file is ignored with a warning
 * (defaults apply); a file with schema issues is reported and yields
 * `undefined` so the caller exits 1 before doing anything else.
 * @param {string} cwd - Project root
 * @param {StyleGenConfigFlags} flags - Command-line flags, which win over the file
 * @returns {CliConfig | undefined} The configuration, or `undefined` after logging config issues
 */
export function loadCliConfig(
  cwd: string,
  flags: StyleGenConfigFlags = {},
): CliConfig | undefined {
  const file = readConfigFile(cwd);
  if (file.error) {
    logger.warn(`Ignoring ${file.error}; using defaults`);
  }
  if (file.issues) {
    logger.error(
      `Invalid config (${file.source ?? "style-gen.config.json"}):\n${file.issues}`,
    );
    return undefined;
  }
  return { config: resolveConfig(flags, file), file };
}
