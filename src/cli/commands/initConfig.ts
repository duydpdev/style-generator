import path from "node:path";

import {
  declaredLayout,
  defaultConfig,
  type ConfigFile,
} from "../../node/loadStyleGenConfig";
import { configSchemaRef } from "../configJsonSchema";
import { logger } from "../logger";
import { styleGenCommand } from "../packageManager";

import type { InitArgs } from "./init";
import { besideTheme, samePath, writeFile } from "./initFiles";

interface MergeBase {
  /** Absolute path of `style-gen.config.json`. */
  configPath: string;
  /** Where `content` came from; `undefined` when `init` starts empty. */
  source?: string | undefined;
  /** The existing config object, as it is: `init` merges `theme`/`output` into it. */
  content: Record<string, unknown>;
}

/**
 * The config `init` merges into: the object `readConfigFile` parsed, else `{}`.
 * @param {string} cwd The project root.
 * @param {ConfigFile} file The project's config, as `readConfigFile` read it.
 * @returns {MergeBase} The config path, where the content came from and the content.
 * @throws {Error} When `style-gen.config.json` is not a JSON object.
 */
export function loadMergeBase(cwd: string, file: ConfigFile): MergeBase {
  const configPath = path.resolve(cwd, "style-gen.config.json");
  if (file.raw !== undefined) {
    return { configPath, source: file.source, content: file.raw };
  }
  if (file.error !== undefined && file.source === "style-gen.config.json") {
    throw new Error(
      `${file.error}.\n💡 Fix it, or delete it and run init again.`,
    );
  }
  return { configPath, content: {} };
}

/** The `theme`/`output` a config declares, defaults applied; `init` keeps them even when invalid. */
export interface ConfigLayout {
  /** `style-gen.config.json` or `package.json`. */
  source: string;
  theme: string;
  output: string;
  /** Why `generate` ignores the config (malformed, schema issues). */
  problem: string | undefined;
  /** `false` when the `theme` key is unusable or the file unparsable: `theme` is then only the default. */
  themeReadable: boolean;
}

/**
 * Read the existing config with the defaults `generate` applies.
 * @param {ConfigFile} file - The project's config, as `readConfigFile` read it
 * @returns {ConfigLayout | undefined} The layout, or `undefined` without a config
 */
export function readConfigLayout(file: ConfigFile): ConfigLayout | undefined {
  const declared = declaredLayout(file);
  if (declared === undefined) return undefined;
  return {
    source: declared.source,
    theme: declared.theme ?? defaultConfig.theme,
    output: declared.output ?? defaultConfig.output,
    problem: file.error ?? file.issues,
    themeReadable:
      file.raw !== undefined &&
      (declared.theme !== undefined || !("theme" in file.raw)),
  };
}

/**
 * @param {InitArgs} args - The CLI arguments
 * @param {string} cwd - The project root
 * @param {ConfigLayout | undefined} found - The existing config, when there is one
 * @param {boolean} isInteractive - Whether a TTY can answer the prompts
 * @returns {ConfigLayout | undefined} The config `init` builds on, or `undefined` when there is none
 * @throws {Error} Under `--yes` on an invalid config or a differing `--theme` (defaults would add a second theme); without a TTY when the theme is unreadable and `--theme` is missing
 */
export function usableConfig(
  args: InitArgs,
  cwd: string,
  found: ConfigLayout | undefined,
  isInteractive: boolean,
): ConfigLayout | undefined {
  if (found === undefined) return undefined;
  if (args.yes === true) {
    if (found.problem !== undefined) {
      throw new Error(
        `${found.source} is invalid, so --yes cannot tell where its theme lives:\n${found.problem}\n💡 Fix it first: ${styleGenCommand(cwd, "doctor")}`,
      );
    }
    if (args.theme !== undefined && !samePath(cwd, args.theme, found.theme)) {
      throw new Error(
        `--theme ${args.theme} differs from the theme of ${found.source} (${found.theme}); --yes never redirects an existing config.\n💡 Drop --theme, or run init without --yes to change it`,
      );
    }
    return found;
  }
  if (found.themeReadable) return found;
  if (args.theme === undefined && !isInteractive) {
    throw new Error(
      `${found.source} is invalid and its "theme" cannot be read:\n${found.problem ?? ""}\n💡 Fix it first: ${styleGenCommand(cwd, "doctor")}, or pass --theme <path>`,
    );
  }
  return undefined;
}

/**
 * Warn when init leaves a config `generate` rejects, so a success message does not hide it.
 * @param {string} cwd - The project root, for the package manager of the hint
 * @param {string} source - The config file init kept or merged into
 * @param {string | undefined} problem - Why `generate` rejects that config, if it does
 * @param {boolean} merged - Whether init merged a new theme into it
 */
export function warnInvalidConfig(
  cwd: string,
  source: string,
  problem: string | undefined,
  merged: boolean,
): void {
  if (problem === undefined) return;
  logger.warn(
    `${source} is invalid and init ${merged ? "only merged the theme into it" : "left it as it is"}; generate rejects it:\n${problem}\n💡 Fix it: ${styleGenCommand(cwd, "doctor")}`,
  );
}

/**
 * @param {string} cwd - The project root
 * @param {MergeBase} mergeBase - The existing config content, if any
 * @param {ConfigLayout | undefined} config - The existing config whose theme is readable, if any
 * @param {string} themeLoc - Repo-relative POSIX path of the theme
 * @param {string | undefined} problem - Why `generate` rejects the existing config, if it does
 * @returns {{ layout: { theme: string; output: string }; changed: boolean }} The layout in effect and whether a config was written: one naming this theme is kept (no new file shadows `package.json#style-gen`), else `theme` (and a missing `output`) is merged in
 */
export function updateConfig(
  cwd: string,
  mergeBase: MergeBase,
  config: ConfigLayout | undefined,
  themeLoc: string,
  problem: string | undefined,
): { layout: { theme: string; output: string }; changed: boolean } {
  if (config !== undefined && samePath(cwd, themeLoc, config.theme)) {
    logger.info(`Kept ${config.source}: theme and output stay as configured.`);
    warnInvalidConfig(cwd, config.source, problem, false);
    return { layout: config, changed: false };
  }
  const { content } = mergeBase;
  const generated = besideTheme(themeLoc);
  writeFile(
    mergeBase.configPath,
    JSON.stringify(
      {
        ...configSchemaRef(content),
        ...content,
        theme: themeLoc,
        ...("output" in content ? {} : { output: generated }),
      },
      null,
      2,
    ),
  );
  logger.success(
    `${mergeBase.source === "style-gen.config.json" ? "Updated" : "Created"} style-gen.config.json`,
  );
  if (mergeBase.source === "package.json") {
    logger.info(
      'Copied package.json["style-gen"] into style-gen.config.json, which takes precedence from now on; remove the package.json section.',
    );
  }
  warnInvalidConfig(cwd, "style-gen.config.json", problem, true);
  return {
    layout: {
      theme: themeLoc,
      output: typeof content.output === "string" ? content.output : generated,
    },
    changed: true,
  };
}
