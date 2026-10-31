import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";

import { logger } from "../logger";

export interface BudgetArgs {
  /** The `.css` file or directory to measure. */
  target?: string | undefined;
  /** Raw `--max-gzip` value, in bytes. */
  maxGzip?: string | undefined;
}

/** Usage line, shared by the command registry's `--help` and the usage error. */
export const BUDGET_USAGE =
  "style-gen budget <file.css|dir> --max-gzip <bytes>";

/**
 * The CSS files to measure: one file, or every `.css` file under a directory.
 * @param {string} target - A `.css` file or a directory, relative to `cwd`
 * @param {string} cwd - Directory `target` is resolved against
 * @returns {string[]} Absolute file paths, sorted by name within a directory
 * @throws {Error} When `target` cannot be read
 */
function collectCss(target: string, cwd: string): string[] {
  const abs = resolve(cwd, target);
  let isDirectory: boolean;
  try {
    isDirectory = statSync(abs).isDirectory();
  } catch (error) {
    throw new Error(
      `Cannot read ${target}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
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

/**
 * Executes the `budget` CLI command: sums the gzip size (`node:zlib`
 * defaults, the level the DEV.1 baseline used) of every `.css` file under
 * the target and compares it with `--max-gzip`. Directories are walked
 * recursively (Next emits `.next/static/css/*.css`). The two summary lines
 * (`OK: …` / `OVER BUDGET: …`) are stable: consumer CI greps them.
 *
 * Exit codes: 0 = within budget, 1 = over budget, 2 = usage error, unreadable
 * target or no CSS found.
 * @param {BudgetArgs} args - Target path and raw `--max-gzip` value
 * @param {string} cwd - Directory the target is resolved against
 * @returns {number} The process exit code
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
    logger.error(error instanceof Error ? error.message : String(error));
    return 2;
  }
  if (files.length === 0) {
    logger.error(`No .css files found under ${target}`);
    return 2;
  }

  let total = 0;
  for (const file of files) {
    const gzip = gzipSync(readFileSync(file)).length;
    total += gzip;
    logger.log(`  ${String(gzip).padStart(8)} B gzip  ${file}`);
  }

  const within = total <= maxGzip;
  const delta = within
    ? `${String(maxGzip - total)} B headroom`
    : `${String(total - maxGzip)} B over`;
  logger.log(
    `${within ? "OK" : "OVER BUDGET"}: ${String(total)} B gzip across ${String(files.length)} file(s), budget ${String(maxGzip)} B (${delta})`,
  );
  return within ? 0 : 1;
}
