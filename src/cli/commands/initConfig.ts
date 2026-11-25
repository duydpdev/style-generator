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
 * The config `init` merges into: the object `readConfigFile` parsed (an
 * existing `style-gen.config.json`, else `package.json["style-gen"]`), else
 * nothing. A `style-gen.config.json` that is not a JSON object aborts before
 * anything is written; an unreadable `package.json` section is not merged.
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

/**
 * The `theme`/`output` of a project's config. A valid config is resolved the
 * way `generate` reads it (a config without a `theme` key means
 * `styles/theme.json`); an invalid one still declares them, and `init` keeps
 * what it declares instead of redirecting it.
 */
export interface ConfigLayout {
  /** `style-gen.config.json` or `package.json`. */
  source: string;
  theme: string;
  output: string;
  /** Why `generate` ignores the config (malformed, schema issues). */
  problem: string | undefined;
  /**
   * Whether `theme` is what the config declares (or the default when it has
   * no `theme` key). `false` when the key is present but not a non-empty
   * string, or the file cannot be parsed: `theme` is then only the default.
   */
  themeReadable: boolean;
}

/**
 * Read the existing config (`style-gen.config.json`, else
 * `package.json#style-gen`) with the defaults `generate` applies.
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
 * The config `init` can build on. A valid one, and an invalid one whose
 * `theme` is readable, keep the theme they declare. `--yes` refuses an
 * invalid config and a `--theme` that disagrees with the config: defaults
 * would put a second theme next to the one the config names. Without
 * `--yes`, an explicit `--theme` or a wizard answer is the user's own
 * choice; an invalid config whose theme cannot be read needs one of them.
 * @param {InitArgs} args - The CLI arguments
 * @param {string} cwd - The project root
 * @param {ConfigLayout | undefined} found - The existing config, when there is one
 * @param {boolean} isInteractive - Whether a TTY can answer the prompts
 * @returns {ConfigLayout | undefined} The config to keep, or `undefined` when there is none to build on
 * @throws {Error} Under `--yes`, when the config is invalid or `--theme` names another theme; without a terminal, when the theme cannot be read and `--theme` is missing
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
 * Say so when init leaves a config that `generate` rejects, so a success
 * message does not hide it: kept as it is, or with only the theme merged in
 * (the keys that make it invalid stay).
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
 * Settle the config: one that already names this theme stays as it is
 * (`package.json#style-gen` included, so no `style-gen.config.json` shadows
 * it); otherwise `theme` is merged into it, and `output` only when it has
 * none, or a new config is written. A custom `output` is never rewritten,
 * and an invalid config keeps the keys that make it invalid (warned).
 * @param {string} cwd - The project root
 * @param {MergeBase} mergeBase - The existing config content, if any
 * @param {ConfigLayout | undefined} config - The existing config whose theme is readable, if any
 * @param {string} themeLoc - Repo-relative POSIX path of the theme
 * @param {string | undefined} problem - Why `generate` rejects the existing config, if it does
 * @returns {{ layout: { theme: string; output: string }; changed: boolean }} The theme and output in effect, and whether a config file was written
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
