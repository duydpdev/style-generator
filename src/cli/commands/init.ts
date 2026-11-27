import fs from "node:fs";

import * as p from "@clack/prompts";

import { readConfigFile } from "../../node/loadStyleGenConfig";
import { logger } from "../logger";

import { detectStack } from "./detectStack";
import {
  loadMergeBase,
  readConfigLayout,
  updateConfig,
  usableConfig,
  warnInvalidConfig,
} from "./initConfig";
import { besideTheme } from "./initFiles";
import { printNextSteps } from "./initNextSteps";
import { CancelError, confirmOverwrite } from "./initPrompts";
import {
  applyAgentRules,
  DEFAULT_RULES_SOURCE,
  runRulesOnly,
} from "./initRules";
import {
  assertThemeNotOverwritingFiles,
  chooseTheme,
  firstConfigTheme,
  resolveThemePath,
  themeTarget,
  writeMissingConfigSchema,
  writeThemeFiles,
} from "./initTheme";

export interface InitArgs {
  theme?: string;
  dark?: boolean;
  /** Do not write the agent rules file. */
  skipRules?: boolean;
  /** Only write or refresh the agent rules file; scaffold nothing else. */
  rulesOnly?: boolean;
  /**
   * Answer every prompt with its default and never overwrite an existing
   * file (scripts, CI, coding agents).
   */
  yes?: boolean;
}

/**
 * The scaffolding itself; failures throw, `initCommand` turns them into
 * exit codes.
 * @param {InitArgs} args The initial CLI arguments.
 * @param {string} cwd The project root.
 * @param {string | URL} rulesSource The agent rules file to copy.
 * @returns {Promise<number>} The exit code.
 */
async function scaffold(
  args: InitArgs,
  cwd: string,
  rulesSource: string | URL,
): Promise<number> {
  const yes = args.yes === true;
  // `--yes` answers every prompt with its default, so it never asks.
  const isInteractive = !yes && process.stdin.isTTY;

  const detected = detectStack(cwd);

  if (args.rulesOnly) {
    return runRulesOnly(args, detected, cwd, rulesSource, isInteractive);
  }

  // Read before anything is written, so an unreadable config aborts with no
  // file created.
  const file = readConfigFile(cwd);
  const mergeBase = loadMergeBase(cwd, file);
  const found = readConfigLayout(file);
  const config = usableConfig(args, cwd, found, isInteractive);
  const defaultTheme = firstConfigTheme(detected, cwd, config);
  const choice = await chooseTheme(args, config, defaultTheme, isInteractive);

  const resolved = resolveThemePath(cwd, choice.themeLoc, config);
  if (typeof resolved !== "string") {
    // A shared theme outside the root (monorepo): `init` writes neither the
    // theme nor its schema; the config schema lives in the root.
    logger.info(
      `The theme of ${resolved.source} (${resolved.theme}) is outside the project root: init writes no theme or theme schema for it.`,
    );
    writeMissingConfigSchema(cwd);
    const rules = await applyAgentRules(args, cwd, rulesSource, isInteractive);
    printNextSteps(detected, resolved, cwd, rules);
    return 0;
  }
  const target = themeTarget(cwd, resolved);
  assertThemeNotOverwritingFiles(cwd, target);

  const proceed = [target.abs, target.schemaAbs, target.configSchemaAbs].some(
    fs.existsSync,
  )
    ? await confirmOverwrite(isInteractive, yes)
    : "overwrite";
  if (proceed === "refused") return 1;
  // Declining an overwrite still fills what is missing (the config included),
  // so `generate` can build afterwards. An invalid config is the exception:
  // declining leaves it, and everything else, as it is.
  if (proceed === "fill" && found?.problem !== undefined) {
    warnInvalidConfig(cwd, found.source, found.problem, false);
    const rules = await applyAgentRules(args, cwd, rulesSource, isInteractive);
    printNextSteps(
      detected,
      {
        theme: target.loc,
        output: config?.output ?? besideTheme(target.loc),
      },
      cwd,
      rules,
    );
    return 0;
  }

  const wrote = writeThemeFiles(
    cwd,
    target,
    choice.includeDark,
    proceed === "overwrite",
  );
  const settled = updateConfig(
    cwd,
    mergeBase,
    config,
    target.loc,
    found?.problem,
  );

  /* ---------- Agent rules ---------- */

  const rules = await applyAgentRules(args, cwd, rulesSource, isInteractive);

  /* ---------- Next steps ---------- */

  logger.info(
    wrote === 0 && !settled.changed
      ? "Nothing to do: the theme, its schemas and the config are already in place."
      : "✅ Tailwind v4 configuration scaffolded successfully",
  );
  printNextSteps(detected, settled.layout, cwd, rules);

  if (isInteractive) {
    p.outro("You're all set!");
  }
  return 0;
}

/**
 * Initialize project scaffolding; never exits: a cancelled prompt returns 0, a failure 1.
 * @param {InitArgs} args The initial CLI arguments.
 * @param {string} [cwd] The project root; defaults to `process.cwd()`.
 * @param {string | URL} [rulesSource] The agent rules file to copy; defaults to the one this build ships.
 * @returns {Promise<number>} The process exit code.
 */
export async function initCommand(
  args: InitArgs,
  cwd: string = process.cwd(),
  rulesSource: string | URL = DEFAULT_RULES_SOURCE,
): Promise<number> {
  try {
    return await scaffold(args, cwd, rulesSource);
  } catch (error) {
    if (error instanceof CancelError) {
      p.cancel(error.message);
      return 0;
    }
    logger.error(error instanceof Error ? error.message : "Unknown error");
    return 1;
  }
}
