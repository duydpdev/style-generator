/**
 * `style-gen canvas check`: every artboard of a design canvas reads its tokens
 * from the ONE theme `--theme` names. The rules are listed in
 * `documents/standards/design-canvas.md`; scanned are every `*.dc.html` and
 * `*.css` under `--canvas` except `node_modules` and design-system producer files.
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
  loadRecipes,
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
import { loadStandard, type LoadedStandard } from "./standardLayer";
import { packagedStandard } from "./standardSchema";
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
  /** Additions file layered over the packaged standard; the packaged standard alone when absent. */
  standard?: string | undefined;
  /** Receives a line to print before the result (a full-copy standard, for one). */
  onNotice?: ((line: string) => void) | undefined;
  dsVersion?: DsVersion | undefined;
  /** Recipes JSON (`{ "<kebab name>": { "<axis>": [values] } }`); read only with `boards`. */
  recipes?: string | undefined;
  /** Base of relative paths (default: `process.cwd()`). */
  cwd?: string | undefined;
}

// Whether the stamp (`{ themeSha256 }`) records the SHA-256 of these theme bytes.
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
  const loaded: LoadedStandard =
    options.standard === undefined
      ? { standard: packagedStandard(), notices: [] }
      : loadStandard(at(options.standard), options.standard);
  const standard = loaded.standard;
  for (const notice of loaded.notices) options.onNotice?.(notice);
  const recipes =
    options.recipes === undefined || !boards
      ? undefined
      : loadRecipes(at(options.recipes), options.recipes);
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
  const out = scanCanvas(canvasDir, options.canvasDir).flatMap((s) =>
    fileViolations(s, rules),
  );
  if (naming)
    for (const message of namingViolations(parsed, standard))
      out.push(`${theme}:1 ${message}`);
  const boardOptions = {
    boards,
    recipes,
    stamp: stampFile,
    dsVersion: options.dsVersion,
    canvasLabel: options.canvasDir,
    stampLabel: stamp,
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
  recipes?: string | undefined;
}

// `<namespace>=<version>`: null unless exactly one `=` with non-empty sides.
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
  // An empty path would resolve to the working directory itself.
  const path = (key: string) => (str(key) === "" ? undefined : str(key));
  const canvas = path("canvas");
  const theme = path("theme");
  const inventory = values.inventory === true;
  if (canvas === undefined) return "--canvas is required";
  if (theme === undefined && !inventory)
    return "--theme is required (unless --inventory)";
  // Dropping an empty optional path would skip its check silently.
  for (const key of ["stamp", "standard", "recipes"])
    if (str(key) === "") return `--${key} must not be empty`;
  // The variant grid is a board rule: without --boards it would never run.
  if (str("recipes") !== undefined && values.boards !== true)
    return "--recipes needs --boards";
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
    recipes: str("recipes"),
  };
}

/** C0 and C1 controls plus the two Unicode line terminators. */
// eslint-disable-next-line no-control-regex -- control characters are what oneLine escapes
const CONTROL = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g;

// Escapes control characters as `\uXXXX`, so a copied value never forges an output line (`OK:`).
function oneLine(text: string): string {
  return text.replace(
    CONTROL,
    (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}

// Runs the check (or the inventory) and prints the result: 0 ok, 1 violations.
function runCheck(args: CanvasArgs, cwd: string): number {
  const canvasDir = resolve(cwd, args.canvas);
  if (args.inventory || args.theme === undefined) {
    logger.log(
      JSON.stringify(inventoryCanvas(canvasDir, args.canvas), null, 2),
    );
    return 0;
  }
  const violations = checkCanvas({
    ...args,
    canvasDir: args.canvas,
    theme: args.theme,
    cwd,
    onNotice: (line) => {
      logger.log(line);
    },
  });
  const files = canvasFiles(canvasDir, args.canvas);
  if (args.boards && !files.some((f) => f.endsWith(".dc.html")))
    violations.push(`canvas.json:1 no .dc.html files under ${args.canvas}`);
  if (violations.length > 0) {
    for (const v of violations) logger.log(oneLine(v));
    logger.log(`${String(violations.length)} violation(s)`);
    return 1;
  }
  logger.log(`OK: ${String(files.length)} files`);
  return 0;
}

/**
 * `style-gen canvas check`. Never throws: input, `--standard` and unexpected
 * errors exit 2, so only real violations exit 1.
 * @param {FlagValues} values - Parsed flag values
 * @param {string} cwd - The project root
 * @returns {number} 0 ok, 1 violations, 2 usage or input error
 */
export function canvasCheckCommand(values: FlagValues, cwd: string): number {
  const args = parseCanvasArgs(values);
  if (typeof args === "string") {
    logger.error(oneLine(args));
    return 2;
  }
  try {
    return runCheck(args, cwd);
  } catch (error) {
    logger.error(
      oneLine(
        error instanceof CanvasInputError
          ? error.message
          : `canvas check failed: ${errorMessage(error)}`,
      ),
    );
    return 2;
  }
}
