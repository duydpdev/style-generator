/**
 * `style-gen canvas check`: the one-theme rule for a design canvas (a folder
 * of `*.dc.html` artboards plus their stylesheets).
 *
 * Every artboard reads its tokens from ONE theme, the one `--theme` names:
 * - the only custom properties read or declared are the generated `--sg-*`
 *   variables plus `--spacing`, `--tw-*` and `--layout-*`; any other name
 *   (`--bl-ink`, `--muted`, …) is a second token namespace;
 * - every `var(--sg-<prefix>-<key>)` names a token the theme produces
 *   (`--sg-sp-*` spacing variables are always allowed);
 * - text sizes come from typography classes: no `font-size:` other than
 *   `inherit` (lengths and `{{binding}}` values alike) and no `font:`
 *   shorthand other than `font: inherit`;
 * - no artboard loads a `/_blob/` stylesheet or links a `/_blob/` file, both
 *   of which live outside the theme;
 * - with `--stamp`, the design system was built from these theme bytes; with
 *   `--intents`, every `*.Button` `color` is one of those variant names;
 * - with `--naming`, no `font-weight:` other than `inherit`, no hand-written
 *   `border-radius`/`line-height`/`font-family`, the theme keys follow the
 *   naming convention, and only the manifest's `primitiveBoards` read a
 *   primitive colour variable;
 * - with `--boards`, `canvas.json` holds the manifest's pages, core boards (in
 *   order) and one `c-<kebab>` board per design-system component; core boards
 *   carry their sections, theme literals and provenance block; component pages
 *   follow the `s-*`/`c-*` split; every `$preview` matches its frame;
 * - with `--ds-version <namespace>=<version>`, `canvas.json` installs that
 *   design-system version.
 *
 * Scanned: every `*.dc.html` and `*.css` under `--canvas`, recursively, except
 * `node_modules` and the two files a design-system producer writes.
 */
import type { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

import { errorMessage } from "../../../node/errorMessage";
import { logger } from "../../logger";
import { toKebabCase } from "../../../shared/helpers";

import {
  boardContentViolations,
  canvasJsonViolations,
  type DsVersion,
} from "./boardRules";
import {
  fileViolations,
  themeVariableNames,
  type FileRules,
} from "./fileRules";
import { asRecord } from "./parseHtml";
import {
  CanvasInputError,
  canvasFiles,
  inventoryCanvas,
  parseJson,
  readInput,
  readJson,
  scanCanvas,
} from "./scan";
import {
  DEFAULT_STANDARD,
  loadStandard,
  type Standard,
} from "./standardSchema";
import { namingViolations, PRIMITIVE } from "./themeRules";

/** What `checkCanvas` checks. Relative paths resolve against `cwd`. */
export interface CheckOptions {
  canvasDir: string;
  /** Theme JSON file; violation lines name it as written. */
  theme: string;
  /** `ds-stamp.json` of the design system built from the theme. */
  stamp?: string | undefined;
  /** Allowed `*.Button` `color` values. */
  intents?: readonly string[] | undefined;
  naming?: boolean | undefined;
  boards?: boolean | undefined;
  /** Manifest file; the bundled manifest when absent. */
  standard?: string | undefined;
  dsVersion?: DsVersion | undefined;
  /** Base of relative paths (default: `process.cwd()`). */
  cwd?: string | undefined;
}

/**
 * Whether the stamp records the SHA-256 of these theme bytes.
 * @param {string} stamp - Stamp JSON file (`{ themeSha256 }`)
 * @param {string} label - The path as the user wrote it, for messages
 * @param {Buffer} themeBytes - Theme file contents
 * @returns {boolean} True when it does
 */
function stampMatches(
  stamp: string,
  label: string,
  themeBytes: Buffer,
): boolean {
  const sha = createHash("sha256").update(themeBytes).digest("hex");
  const parsed = readJson(stamp, label);
  if (typeof parsed !== "object" || parsed === null) return false;
  return (parsed as Record<string, unknown>).themeSha256 === sha;
}

/**
 * Violations of the one-theme rule, each `<file>:<line> <message>`.
 * @param {CheckOptions} options - Canvas, theme and the optional checks
 * @returns {string[]} Empty when the canvas follows the theme
 * @throws {CanvasInputError} When an input cannot be read or parsed, or `--standard` is invalid
 */
export function checkCanvas(options: CheckOptions): string[] {
  const { theme, stamp, intents, naming = false, boards = false } = options;
  const at = (path: string) => resolve(options.cwd ?? process.cwd(), path);
  const canvasDir = at(options.canvasDir);
  const stampFile = stamp === undefined ? undefined : at(stamp);
  const themeBytes = readInput(at(theme), theme);
  const parsed = parseJson(themeBytes.toString("utf8"), theme);
  const standard: Standard =
    options.standard === undefined
      ? DEFAULT_STANDARD
      : loadStandard(at(options.standard), options.standard);
  const primitiveKeys = Object.keys(asRecord(asRecord(parsed).colors)).filter(
    (k) => PRIMITIVE.test(k),
  );
  const rules: FileRules = {
    known: themeVariableNames(parsed),
    intents,
    naming,
    primitiveVars: new Set(
      primitiveKeys.map((k) => `--sg-color-${toKebabCase(k)}`),
    ),
    primitiveBoards: naming ? standard.primitiveBoards : [],
  };
  const out = scanCanvas(canvasDir).flatMap((s) => fileViolations(s, rules));
  if (naming)
    for (const message of namingViolations(parsed, standard))
      out.push(`${theme}:1 ${message}`);
  const boardOptions = {
    boards,
    stamp: stampFile,
    dsVersion: options.dsVersion,
  };
  out.push(...canvasJsonViolations(canvasDir, boardOptions, standard));
  out.push(
    ...boardContentViolations(canvasDir, parsed, boardOptions, standard),
  );
  if (
    stamp !== undefined &&
    stampFile !== undefined &&
    !stampMatches(stampFile, stamp, themeBytes)
  )
    out.push(
      `${stamp}:1 stamp does not match theme (rebuild the design system)`,
    );
  return out;
}

/** The parsed flags of `style-gen canvas check`. */
export interface CanvasArgs {
  canvas: string;
  /** Required unless `inventory`. */
  theme?: string | undefined;
  inventory: boolean;
  naming: boolean;
  boards: boolean;
  stamp?: string | undefined;
  intents?: string[] | undefined;
  standard?: string | undefined;
  dsVersion?: DsVersion | undefined;
}

/**
 * @param {string} value - `<namespace>=<version>`
 * @returns {DsVersion | null} Both sides, or null unless there is exactly one `=` with non-empty sides
 */
function parseDsVersion(value: string): DsVersion | null {
  const parts = value.split("=");
  const [namespace = "", version = ""] = parts;
  return parts.length === 2 && namespace !== "" && version !== ""
    ? { namespace, version }
    : null;
}

/** Flag values as `parseArgs` returns them. */
type FlagValues = Record<
  string,
  string | boolean | (string | boolean)[] | undefined
>;

/**
 * Validates the flags of `style-gen canvas check` (parsed strictly by the registry).
 * @param {FlagValues} values - Parsed flag values
 * @returns {CanvasArgs | string} The arguments, or the usage error
 */
export function parseCanvasArgs(values: FlagValues): CanvasArgs | string {
  const str = (key: string) =>
    typeof values[key] === "string" ? values[key] : undefined;
  const canvas = str("canvas");
  const theme = str("theme");
  const inventory = values.inventory === true;
  if (canvas === undefined) return "--canvas is required";
  if (theme === undefined && !inventory)
    return "--theme is required (unless --inventory)";
  const dsVersionText = str("ds-version");
  const dsVersion =
    dsVersionText === undefined ? undefined : parseDsVersion(dsVersionText);
  if (dsVersion === null)
    return `--ds-version must be <namespace>=<version>, got ${dsVersionText ?? ""}`;
  const intents = str("intents")
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    canvas,
    theme,
    inventory,
    naming: values.naming === true,
    boards: values.boards === true,
    stamp: str("stamp"),
    intents,
    standard: str("standard"),
    dsVersion,
  };
}

/**
 * Runs the check (or the inventory) and prints the result.
 * @param {CanvasArgs} args - Validated arguments
 * @param {string} cwd - Base of relative paths
 * @returns {number} 0 ok, 1 violations
 */
function runCheck(args: CanvasArgs, cwd: string): number {
  const canvasDir = resolve(cwd, args.canvas);
  if (args.inventory || args.theme === undefined) {
    logger.log(JSON.stringify(inventoryCanvas(canvasDir), null, 2));
    return 0;
  }
  const violations = checkCanvas({
    ...args,
    canvasDir,
    theme: args.theme,
    cwd,
  });
  const files = canvasFiles(canvasDir);
  if (args.boards && !files.some((f) => f.endsWith(".dc.html")))
    violations.push(`no .dc.html files under ${args.canvas}`);
  if (violations.length > 0) {
    for (const v of violations) logger.log(v);
    logger.log(`${String(violations.length)} violation(s)`);
    return 1;
  }
  logger.log(`OK: ${String(files.length)} files`);
  return 0;
}

/**
 * `style-gen canvas check`. Never throws: an unreadable or unparsable input,
 * an invalid `--standard` and any unexpected error exit 2, so only real
 * violations exit 1.
 * @param {FlagValues} values - Parsed flag values
 * @param {string} cwd - The project root
 * @returns {number} 0 ok, 1 violations, 2 usage or input error
 */
export function canvasCheckCommand(values: FlagValues, cwd: string): number {
  const args = parseCanvasArgs(values);
  if (typeof args === "string") {
    logger.error(args);
    return 2;
  }
  try {
    return runCheck(args, cwd);
  } catch (error) {
    logger.error(
      error instanceof CanvasInputError
        ? error.message
        : `canvas check failed: ${errorMessage(error)}`,
    );
    return 2;
  }
}
