import fs from "node:fs";
import path from "node:path";

import { configCandidates } from "../../node/configSource";
import { defaultConfig } from "../../node/loadStyleGenConfig";
import { resolveProjectPath } from "../../node/resolveProjectPath";
import { CONFIG_SCHEMA_FILE } from "../configJsonSchema";
import { logger } from "../logger";
import { themeTemplate, themeTemplateDark } from "../templates";

import type { DetectedStack } from "./detectStack";
import type { InitArgs } from "./init";
import type { ConfigLayout } from "./initConfig";
import { projectHas, samePath, toRepoPath, writeFile } from "./initFiles";
import { getInteractiveConfig, type InteractiveConfig } from "./initPrompts";
import { writeConfigSchema, writeThemeSchema } from "./schema";

// `styleGenVite` writes only inside the Vite root, which Nuxt 4 sets to `app/`, so a Nuxt
// theme (and its `theme.css`) defaults to `<srcDir>/assets/css`.
function defaultThemeLoc(detected: DetectedStack, cwd: string): string {
  if (detected.stack === "nuxt") {
    return projectHas(cwd, "app")
      ? "app/assets/css/theme.json"
      : "assets/css/theme.json";
  }
  return projectHas(cwd, "src") ? "src/styles/theme.json" : "styles/theme.json";
}

/**
 * Where the first config points the theme: an existing `defaultConfig.theme`
 * stays the theme (never orphaned behind a second one), else the stack default.
 * @param {DetectedStack} detected - The detected stack
 * @param {string} cwd - The project root
 * @param {ConfigLayout | undefined} config - The valid existing config, which names its own theme
 * @returns {string} Project-relative theme path
 */
export function firstConfigTheme(
  detected: DetectedStack,
  cwd: string,
  config: ConfigLayout | undefined,
): string {
  return config === undefined && projectHas(cwd, defaultConfig.theme)
    ? defaultConfig.theme
    : defaultThemeLoc(detected, cwd);
}

/**
 * The theme location and dark-mode answer: wizard, flags, config, stack default.
 * @param {InitArgs} args - The CLI arguments
 * @param {ConfigLayout | undefined} config - The config to keep, when there is one
 * @param {string} defaultTheme - The stack's default theme location
 * @param {boolean} isInteractive - Whether a TTY can answer the prompts
 * @returns {Promise<InteractiveConfig>} The theme location and dark-mode choice
 */
export async function chooseTheme(
  args: InitArgs,
  config: ConfigLayout | undefined,
  defaultTheme: string,
  isInteractive: boolean,
): Promise<InteractiveConfig> {
  const themeLoc = config?.theme ?? defaultTheme;
  // `--skip-rules` alone still opens the wizard: it asks only for these two.
  if (isInteractive && args.theme === undefined && args.dark === undefined) {
    return getInteractiveConfig(themeLoc);
  }
  return {
    themeLoc: args.theme ?? themeLoc,
    includeDark: args.dark ?? false,
  };
}

/**
 * Resolve the theme path inside the root; a config's own outside theme returns the config.
 * @param {string} cwd - The project root
 * @param {string} themeLoc - The chosen theme location
 * @param {ConfigLayout | undefined} config - The config to keep, when there is one
 * @returns {string | ConfigLayout} The absolute theme path, or the config naming a theme outside the root
 * @throws {Error} When any other theme path escapes the root
 */
export function resolveThemePath(
  cwd: string,
  themeLoc: string,
  config: ConfigLayout | undefined,
): string | ConfigLayout {
  try {
    return resolveProjectPath(cwd, themeLoc.trim(), "theme");
  } catch (error) {
    if (config !== undefined && samePath(cwd, themeLoc.trim(), config.theme)) {
      return config;
    }
    throw error;
  }
}

/** Where `init` writes the theme and its schemas. */
export interface ThemeTarget {
  /** Absolute theme path. */
  abs: string;
  /** Repo-relative POSIX theme path (an absolute `--theme` inside the root is stored relative). */
  loc: string;
  /** The theme's schema, next to the theme. */
  schemaAbs: string;
  configSchemaAbs: string;
}

/**
 * @param {string} cwd - The project root
 * @param {string} abs - Absolute theme path inside the root
 * @returns {ThemeTarget} The theme and schema paths, all inside the root
 */
export function themeTarget(cwd: string, abs: string): ThemeTarget {
  const loc = toRepoPath(cwd, abs);
  return {
    abs,
    loc,
    schemaAbs: resolveProjectPath(
      cwd,
      path.posix.join(path.posix.dirname(loc), "theme.schema.json"),
      "schema output",
    ),
    configSchemaAbs: resolveProjectPath(
      cwd,
      CONFIG_SCHEMA_FILE,
      "config schema output",
    ),
  };
}

/**
 * Write the config's JSON Schema in the project root unless it is there.
 * @param {string} cwd - The project root
 */
export function writeMissingConfigSchema(cwd: string): void {
  const abs = resolveProjectPath(
    cwd,
    CONFIG_SCHEMA_FILE,
    "config schema output",
  );
  if (!fs.existsSync(abs)) writeConfigSchema(cwd, abs);
}

/**
 * Write the theme and the missing schemas, or all of them on a confirmed overwrite.
 * @param {string} cwd - The project root
 * @param {ThemeTarget} target - Where they go
 * @param {boolean} includeDark - Whether the theme template has the dark axis
 * @param {boolean} overwrite - Replace what exists
 * @returns {number} How many files were written
 */
export function writeThemeFiles(
  cwd: string,
  target: ThemeTarget,
  includeDark: boolean,
  overwrite: boolean,
): number {
  let wrote = 0;
  if (overwrite || !fs.existsSync(target.abs)) {
    writeFile(target.abs, includeDark ? themeTemplateDark : themeTemplate);
    logger.success(`Created ${target.loc}`);
    wrote++;
  }
  if (overwrite || !fs.existsSync(target.schemaAbs)) {
    writeThemeSchema(cwd, target.schemaAbs);
    wrote++;
  }
  if (overwrite || !fs.existsSync(target.configSchemaAbs)) {
    writeConfigSchema(cwd, target.configSchemaAbs);
    wrote++;
  }
  return wrote;
}

/**
 * Refuse a theme path that is also a file `init` writes or merges into.
 * @param {string} cwd - The project root
 * @param {ThemeTarget} target - Where the theme and its schemas go
 * @throws {Error} When the theme path equals one of those files
 */
export function assertThemeNotOverwritingFiles(
  cwd: string,
  target: ThemeTarget,
): void {
  if (
    [target.schemaAbs, target.configSchemaAbs, ...configCandidates(cwd)].some(
      (file) => samePath(cwd, target.abs, file),
    )
  ) {
    throw new Error(
      `init writes or merges into ${target.loc}: the theme would overwrite it.\n💡 Pass another --theme <path>`,
    );
  }
}
