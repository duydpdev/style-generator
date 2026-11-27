import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";

import { errorMessage } from "../../node/errorMessage";
import { resolveEmitTarget } from "../../node/resolveEmitTarget";
import {
  readAndPrepareTheme,
  type PreparedTheme,
} from "../../node/themeEmitter";
import {
  coverageCost,
  groupId,
  suggestCoverage,
  themeClassGroups,
} from "../coverageCost";
import { loadCliConfig } from "../loadCliConfig";
import { logger } from "../logger";

export interface BudgetArgs {
  /** The `.css` file or directory to measure. */
  target?: string | undefined;
  /** Raw `--max-gzip` value, in bytes. */
  maxGzip?: string | undefined;
  /** `--coverage-cost`: also list the theme class groups by gzip cost. */
  coverageCost?: boolean | undefined;
  /** `--theme` for `--coverage-cost`; default: the config's theme. */
  theme?: string | undefined;
}

/** Usage line, shared by the command registry's `--help` and the usage error. */
export const BUDGET_USAGE =
  "style-gen budget <file.css|dir> --max-gzip <bytes> [--coverage-cost [--theme <path>]]";

// One file, or every `.css` file under a directory (recursive, sorted by name); throws when unreadable.
function collectCss(target: string, cwd: string): string[] {
  const abs = resolve(cwd, target);
  let isDirectory: boolean;
  try {
    isDirectory = statSync(abs).isDirectory();
  } catch (error) {
    throw new Error(`Cannot read ${target}: ${errorMessage(error)}`, {
      cause: error,
    });
  }
  if (!isDirectory) return [abs];
  return readdirSync(abs, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const full = join(abs, entry.name);
      if (entry.isDirectory()) return collectCss(full, cwd);
      return entry.name.endsWith(".css") ? [full] : [];
    });
}

// Theme class groups by marginal gzip cost with the `coverage` setting that removes each (an upper
// bound: classes the app's source uses stay). `false` after logging an unreadable config or theme.
function logCoverageCost(
  files: readonly { file: string; css: string }[],
  theme: string | undefined,
  cwd: string,
): boolean {
  const loaded = loadCliConfig(cwd, theme === undefined ? {} : { theme });
  if (!loaded) return false;
  let prepared: PreparedTheme;
  try {
    const target = resolveEmitTarget(cwd, loaded.config);
    prepared = readAndPrepareTheme(target.themeFile, target.options);
  } catch (error) {
    logger.error(errorMessage(error));
    return false;
  }
  if (!prepared.ok) {
    logger.error(prepared.message);
    return false;
  }
  const costs = coverageCost(files, themeClassGroups(prepared.parsed));
  logger.log("Coverage cost (upper bound):");
  if (costs.length === 0) logger.log("  No theme classes found.");
  for (const { group, bytes, rules } of costs.slice(0, 10)) {
    logger.log(
      `  ${groupId(group).padEnd(20)} ${String(bytes).padStart(7)} B gzip  (${String(rules)} rules)  ${suggestCoverage(group, prepared.resolved)}`,
    );
  }
  return true;
}

/**
 * Executes the `budget` CLI command: total gzip of the target's `.css` files
 * against `--max-gzip`. The `OK: …`/`OVER BUDGET: …` lines are a contract consumer CI greps.
 * @param {BudgetArgs} args - Target path, raw `--max-gzip` value and the `--coverage-cost` flags
 * @param {string} cwd - Directory the target is resolved against
 * @returns {number} 0 within budget, 1 over, 2 usage or input error
 */
export function budgetCommand(
  args: BudgetArgs,
  cwd: string = process.cwd(),
): number {
  const { target, maxGzip: rawMax } = args;
  if (!target || rawMax === undefined) {
    logger.error(`Usage: ${BUDGET_USAGE}`);
    return 2;
  }
  if (!/^\d+$/.test(rawMax)) {
    logger.error(
      `--max-gzip must be a non-negative integer of bytes, got "${rawMax}"`,
    );
    return 2;
  }
  const maxGzip = Number(rawMax);

  let files: string[];
  try {
    files = collectCss(target, cwd);
  } catch (error) {
    logger.error(errorMessage(error));
    return 2;
  }
  if (files.length === 0) {
    logger.error(`No .css files found under ${target}`);
    return 2;
  }

  let total = 0;
  const contents: { file: string; css: string }[] = [];
  for (const file of files) {
    const raw = readFileSync(file);
    const gzip = gzipSync(raw).length;
    total += gzip;
    if (args.coverageCost) contents.push({ file, css: raw.toString("utf8") });
    logger.log(`  ${String(gzip).padStart(8)} B gzip  ${file}`);
  }

  const within = total <= maxGzip;
  const delta = within
    ? `${String(maxGzip - total)} B headroom`
    : `${String(total - maxGzip)} B over`;
  logger.log(
    `${within ? "OK" : "OVER BUDGET"}: ${String(total)} B gzip across ${String(files.length)} file(s), budget ${String(maxGzip)} B (${delta})`,
  );
  if (args.coverageCost && !logCoverageCost(contents, args.theme, cwd)) {
    return 2;
  }
  return within ? 0 : 1;
}
