/**
 * `style-gen canvas standard init|migrate`: create or rewrite a product's
 * additions file (`canvas-standard.json` by default).
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { errorMessage } from "../../../node/errorMessage";
import { writeFileAtomic } from "../../../node/writeFileAtomic";
import { logger } from "../../logger";

import { CanvasInputError, readJson } from "./scan";
import { isFullCopy } from "./standardLayer";
import { migrateAdditions } from "./standardMigrate";
import { packagedStandard } from "./standardSchema";

/** Flag values as `parseArgs` returns them. */
type FlagValues = Record<
  string,
  string | boolean | (string | boolean)[] | undefined
>;

const DEFAULT_FILE = "canvas-standard.json";

const fileOf = (values: FlagValues): string =>
  typeof values.standard === "string" && values.standard !== ""
    ? values.standard
    : DEFAULT_FILE;

/**
 * `canvas standard init`: writes an empty additions file, never over an existing one.
 * @param {FlagValues} values - Parsed flag values (`--standard`)
 * @param {string} cwd - The project root
 * @returns {number} 0 written, 1 the file exists, 2 unexpected error
 */
export function standardInitCommand(values: FlagValues, cwd: string): number {
  const label = fileOf(values);
  const file = resolve(cwd, label);
  if (existsSync(file)) {
    logger.error(`${label} already exists; nothing written`);
    return 1;
  }
  try {
    writeFileAtomic(file, "{}\n");
  } catch (error) {
    logger.error(`${label}: cannot write (${errorMessage(error)})`);
    return 2;
  }
  logger.log(`wrote ${label}`);
  return 0;
}

/**
 * `canvas standard migrate`: rewrites a full copy of the manifest as additions.
 * An additions file is left as it is. With `--dry-run` the result is printed and nothing is written.
 * @param {FlagValues} values - Parsed flag values (`--theme`, `--standard`, `--dry-run`)
 * @param {string} cwd - The project root
 * @returns {number} 0 ok, 2 usage or input error
 */
export function standardMigrateCommand(
  values: FlagValues,
  cwd: string,
): number {
  const themeLabel = typeof values.theme === "string" ? values.theme : "";
  if (themeLabel === "") {
    logger.error("--theme is required");
    return 2;
  }
  const label = fileOf(values);
  try {
    const raw = readJson(resolve(cwd, label), label);
    const theme = readJson(resolve(cwd, themeLabel), themeLabel);
    const migrated = isFullCopy(raw);
    const text = `${JSON.stringify(
      migrated ? migrateAdditions(raw, theme, packagedStandard(), label) : raw,
      null,
      2,
    )}\n`;
    if (values["dry-run"] === true) {
      logger.log(text.trimEnd());
      return 0;
    }
    if (!migrated) {
      logger.log(`${label} is already an additions file; nothing written`);
      return 0;
    }
    writeFileAtomic(resolve(cwd, label), text);
    logger.log(`rewrote ${label} as an additions file`);
    return 0;
  } catch (error) {
    logger.error(
      error instanceof CanvasInputError
        ? error.message
        : `canvas standard failed: ${errorMessage(error)}`,
    );
    return 2;
  }
}
