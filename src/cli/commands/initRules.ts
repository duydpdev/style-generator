import fs from "node:fs";
import path from "node:path";

import * as p from "@clack/prompts";

import { readConfigFile } from "../../node/loadStyleGenConfig";
import { resolveProjectPath } from "../../node/resolveProjectPath";
import { logger } from "../logger";
import { styleGenCommand } from "../packageManager";
import { getCssImport } from "../templates";

import type { DetectedStack } from "./detectStack";
import type { InitArgs } from "./init";
import { readConfigLayout } from "./initConfig";
import { AGENT_DIR, RULES_FILE, printRulesNote, writeFile } from "./initFiles";
import { cssEntryFor } from "./initNextSteps";

/** The rules the build emits next to the CLI bundle (`dist/agent/`, see `scripts/emit-agent-rules.mjs`). */
export const DEFAULT_RULES_SOURCE = new URL(
  "../agent/style-generator.md",
  import.meta.url,
);

/** Line 1 of a rules file `init` wrote (`agentRulesHeader` in `scripts/agent-rules.mjs`). */
const RULES_HEADER_RE = /^<!-- @duydpdev\/style-generator (\S+) /;

// Create when absent, refresh another version's stamped copy, replace an edited one only after a
// confirm; a build without `dist/agent/` warns instead of failing. True when the file exists after.
async function writeAgentRules(
  cwd: string,
  source: string | URL,
  isInteractive: boolean,
): Promise<boolean> {
  const target = resolveProjectPath(cwd, RULES_FILE, "rules");
  let rules: string;
  try {
    rules = fs.readFileSync(source, "utf8");
  } catch {
    logger.warn(`This build ships no agent rules; ${RULES_FILE} not written.`);
    return fs.existsSync(target);
  }
  if (!fs.existsSync(target)) {
    writeFile(target, rules);
    logger.success(`Created ${RULES_FILE}`);
    return true;
  }
  const existing = fs.readFileSync(target, "utf8");
  // A checkout with CRLF line endings is still this version's file.
  if (existing.replaceAll("\r\n", "\n") === rules) {
    logger.info(`Rules up to date: ${RULES_FILE}`);
    return true;
  }
  // A copy `init` stamped with another version is ours to replace: upgrading
  // must refresh it without a terminal (coding agents run init in a shell).
  // Same version with other content, or no stamp, means someone edited it.
  const from = RULES_HEADER_RE.exec(existing)?.[1];
  const to = RULES_HEADER_RE.exec(rules)?.[1];
  if (from !== undefined && to !== undefined && from !== to) {
    writeFile(target, rules);
    logger.success(`Updated ${RULES_FILE} (${from} → ${to})`);
    return true;
  }
  if (!isInteractive) {
    logger.info(
      `${RULES_FILE} was edited; kept. Run \`${styleGenCommand(cwd, "init --rules-only")}\` in an interactive terminal to replace it.`,
    );
    return true;
  }
  const overwrite = await p.confirm({
    message: `${RULES_FILE} was edited. Replace it with this version's rules?`,
    initialValue: true,
  });
  // The theme and config may already be written: a cancel here keeps the
  // file and lets init print the next steps instead of aborting.
  if (overwrite === true) {
    writeFile(target, rules);
    logger.success(`Updated ${RULES_FILE}`);
  } else {
    logger.info(`Kept ${RULES_FILE}`);
  }
  return true;
}

/**
 * The agent rules step of `init`: honours `--skip-rules`, else writes them.
 * @param {InitArgs} args - The CLI arguments
 * @param {string} cwd - The project root
 * @param {string | URL} source - The rules file shipped with this version
 * @param {boolean} isInteractive - Whether a TTY can answer the prompt
 * @returns {Promise<boolean>} Whether the rules file exists afterwards
 */
export async function applyAgentRules(
  args: InitArgs,
  cwd: string,
  source: string | URL,
  isInteractive: boolean,
): Promise<boolean> {
  if (args.skipRules) {
    return fs.existsSync(resolveProjectPath(cwd, RULES_FILE, "rules"));
  }
  return writeAgentRules(cwd, source, isInteractive);
}

/**
 * @param {InitArgs} args The initial CLI arguments.
 * @param {DetectedStack} detected The detected stack.
 * @param {string} cwd The project root.
 * @param {string | URL} rulesSource The agent rules file to copy.
 * @param {boolean} isInteractive Whether a TTY can answer the prompt.
 * @returns {Promise<number>} The exit code of `init --rules-only`: rules written, CSS lines printed when a config exists.
 */
export async function runRulesOnly(
  args: InitArgs,
  detected: DetectedStack,
  cwd: string,
  rulesSource: string | URL,
  isInteractive: boolean,
): Promise<number> {
  if (
    args.skipRules === true ||
    args.theme !== undefined ||
    args.dark !== undefined
  ) {
    logger.error(
      "--rules-only cannot be combined with --theme, --dark or --skip-rules.",
    );
    return 1;
  }
  if (!(await writeAgentRules(cwd, rulesSource, isInteractive))) return 0;
  const layout = readConfigLayout(readConfigFile(cwd));
  if (layout === undefined) {
    logger.info(
      `No style-gen.config.json in this directory, so there are no CSS lines to print. Run \`${styleGenCommand(cwd, "init")}\` to scaffold the theme; it prints them.`,
    );
    return 0;
  }
  const output = layout.output;
  const entry = cssEntryFor(detected, output, cwd);
  logger.info(
    `Keep these lines in ${entry} (or the CSS file in ${path.posix.dirname(entry)}/ that imports Tailwind):`,
  );
  logger.log(getCssImport(cwd, entry, output, AGENT_DIR));
  printRulesNote(true);
  return 0;
}
