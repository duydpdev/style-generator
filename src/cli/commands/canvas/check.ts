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
import { dsNameCollisions, dsTokenNames } from "../../../shared/dsTokenNames";

import {
  boardContentViolations,
  canvasJsonViolations,
  loadRecipes,
  type DsVersion,
} from "./boardRules";
import { presetUses } from "./classCandidates";
import {
  fileViolations,
  themeVariableNames,
  unknownTokenReads,
  type FileRules,
} from "./fileRules";
import { contrastRules } from "./contrast";
import { descriptionRules } from "./descriptions";
import { asRecord } from "./parseHtml";
import {
  ALWAYS_RULES,
  BOARD_RULES,
  THEME_RULES,
  createReporter,
  type Reporter,
  type Report,
} from "./ruleReport";
import { scaleRules } from "./scaleRules";
import {
  CanvasInputError,
  canvasFiles,
  inventoryCanvas,
  parseJson,
  readInput,
  readJson,
  readText,
  scanCanvas,
  type ScannedFile,
} from "./scan";
import { loadStandard, type LoadedStandard } from "./standardLayer";
import { packagedStandard } from "./standardSchema";
import { namingIssues, PRIMITIVE } from "./themeRules";

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
  /** With `boards`: the preset source whose class names are read as text, never run. */
  preset?: string | undefined;
  /** With `boards`: `style-gen.config.json`, the product's `generate()` options. */
  config?: string | undefined;
  /** Additions file layered over the packaged standard; the packaged standard alone when absent. */
  standard?: string | undefined;
  /** `ds.usage.json`: colour descriptions and spacing token names; read only with `naming`. */
  usage?: string | undefined;
  /** Rule ids switched off for this run; each needs `disabledRules.<id>.reason` in the additions file. */
  noRule?: readonly string[] | undefined;
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

/** The parts of `ds.usage.json` the check reads. */
interface UsageFile {
  usage: Record<string, string>;
  spacing: { name: string }[];
}

// `ds.usage.json`: `{ usage?: { <colour key>: sentence }, spacing?: [{ name }] }`; anything else is an input error.
function loadUsage(file: string, label: string): UsageFile {
  const raw = asRecord(readJson(file, label));
  const usage = asRecord(raw.usage);
  if (!Object.values(usage).every((text) => typeof text === "string"))
    throw new CanvasInputError(
      `${label}: usage must map a colour key to a sentence`,
    );
  const spacing = Array.isArray(raw.spacing) ? (raw.spacing as unknown[]) : [];
  const names = spacing.map((entry) => asRecord(entry).name);
  if (!names.every((name) => typeof name === "string"))
    throw new CanvasInputError(`${label}: every spacing entry needs a name`);
  return {
    usage: usage as Record<string, string>,
    spacing: names.map((name) => ({ name })),
  };
}

// `--no-rule` ids must be known and carry a recorded reason in the additions file.
function disabledRuleIds(
  ids: readonly string[],
  standard: LoadedStandard["standard"],
  label: string | undefined,
): Set<string> {
  for (const id of ids) {
    if (standard.rules?.[id] === undefined)
      throw new CanvasInputError(`unknown rule ${id}`);
    if (standard.disabledRules?.[id] === undefined)
      throw new CanvasInputError(
        `rule ${id} disabled without a reason in ${label ?? "a --standard file"}`,
      );
  }
  return new Set(ids);
}

/** What a check found: lines that fail the run, and findings that do not. */
export interface CheckResult extends Report {
  /** Rule ids `--no-rule` switched off. */
  disabled: string[];
}

// The per-file rules: raw violation lines, then the variables nothing declares (`ref-var`).
function fileRules(
  scanned: readonly ScannedFile[],
  rules: FileRules,
  known: ReadonlySet<string>,
  reporter: Reporter,
): void {
  for (const s of scanned) {
    for (const line of fileViolations(s, rules)) reporter.raw(line);
    for (const o of unknownTokenReads(s, known))
      reporter.error(
        `${o.file}:${String(o.line)}`,
        `unknown token ${o.value}`,
        "ref-var",
        o.value,
      );
  }
}

/**
 * Violations of the one-theme rule: `errors` fail the run, `findings` are reported and pass.
 * @param {CheckOptions} options - Canvas, theme and the optional checks
 * @returns {CheckResult} Empty when the canvas follows the theme
 * @throws {CanvasInputError} When an input cannot be read or parsed, or `--standard` or `--no-rule` is invalid
 */
export async function checkCanvas(options: CheckOptions): Promise<CheckResult> {
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
  const disabled = disabledRuleIds(
    options.noRule ?? [],
    standard,
    options.standard,
  );
  const reporter = createReporter(standard, disabled);
  const recipes =
    options.recipes === undefined || !boards
      ? undefined
      : loadRecipes(at(options.recipes), options.recipes);
  const usage =
    options.usage === undefined
      ? undefined
      : loadUsage(at(options.usage), options.usage);
  const primitiveKeys = Object.keys(asRecord(asRecord(parsed).colors)).filter(
    (k) => PRIMITIVE.test(k),
  );
  const known = themeVariableNames(parsed);
  const rules: FileRules = {
    intents,
    naming,
    primitiveVars: new Set(
      primitiveKeys.map((k) => `--sg-color-${toKebabCase(k)}`),
    ),
    primitiveBoards: naming ? standard.primitiveBoards : [],
  };
  const scanned = scanCanvas(canvasDir, options.canvasDir);
  fileRules(scanned, rules, known, reporter);
  if (naming) themeRules(parsed, standard, usage, reporter, `${theme}:1`);
  const boardOptions = {
    boards,
    recipes,
    stamp: stampFile,
    dsVersion: options.dsVersion,
    canvasLabel: options.canvasDir,
    stampLabel: stamp,
  };
  for (const line of [
    ...canvasJsonViolations(canvasDir, boardOptions, standard),
    ...boardContentViolations(canvasDir, parsed, boardOptions, standard),
  ])
    reporter.raw(line);
  if (boards)
    await boardClassRules(
      { options, at, scanned, theme: asRecord(parsed), standard },
      reporter,
    );
  if (
    stamp !== undefined &&
    stampFile !== undefined &&
    !stampMatches(stampFile, stamp, themeBytes)
  )
    reporter.raw(
      `${stamp}:1 stamp does not match theme (rebuild the design system)`,
    );
  reporter.staleExemptions(`${theme}:1`, [
    ...ALWAYS_RULES,
    ...(naming ? THEME_RULES : []),
    ...(boards ? BOARD_RULES : []),
  ]);
  return { ...reporter.report(), disabled: [...disabled] };
}

// The class rules compile with Tailwind, so they load through their own chunk.
async function boardClassRules(
  input: {
    options: CheckOptions;
    at: (path: string) => string;
    scanned: readonly ScannedFile[];
    theme: Record<string, unknown>;
    standard: LoadedStandard["standard"];
  },
  reporter: Reporter,
): Promise<void> {
  const { options, at, scanned, theme, standard } = input;
  const uses = scanned.flatMap((s) => s.classUses);
  const presetSource =
    options.preset === undefined
      ? undefined
      : readText(at(options.preset), options.preset);
  if (options.preset !== undefined && presetSource !== undefined)
    uses.push(...presetUses(options.preset, presetSource));
  const { boardTokenRules } = await import("./boardTokenRules");
  await boardTokenRules(
    {
      uses,
      theme,
      configFile:
        options.config === undefined
          ? undefined
          : { path: at(options.config), label: options.config },
      standard,
      cwd: options.cwd ?? process.cwd(),
      vars: new Set(
        scanned.flatMap((s) =>
          s.occurrences.filter((o) => o.kind === "sgVar").map((o) => o.value),
        ),
      ),
      preset: presetSource === undefined ? undefined : { source: presetSource },
      themePath: options.theme,
    },
    reporter,
  );
}

// The theme-level rules, all under `--naming`; each line names the theme file.
function themeRules(
  parsed: unknown,
  standard: LoadedStandard["standard"],
  usage: UsageFile | undefined,
  reporter: ReturnType<typeof createReporter>,
  path: string,
): void {
  const theme = asRecord(parsed);
  for (const issue of namingIssues(parsed, standard))
    if (issue.finding === true)
      reporter.finding(
        path,
        issue.message,
        issue.rule ?? "name-vocabulary",
        issue.name,
      );
    else reporter.error(path, issue.message, issue.rule, issue.name);
  scaleRules(theme, standard, reporter, path);
  descriptionRules(
    theme,
    standard,
    { additions: standard, usage: usage?.usage },
    reporter,
    path,
  );
  contrastRules(theme, standard, reporter, path);
  for (const { name, tokens } of dsNameCollisions(
    dsTokenNames(usage === undefined ? { theme } : { theme, usage }),
  )) {
    const users = tokens.map((t) => t.family + "." + t.key).join(" and ");
    reporter.error(
      path,
      `design-system token name ${name} is used by ${users}`,
      "ds-name-collision",
      name,
    );
  }
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
  usage?: string | undefined;
  noRule?: string[] | undefined;
  preset?: string | undefined;
  config?: string | undefined;
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

// A repeatable string flag as `parseArgs` returns it.
const strings = (value: FlagValues[string]): string[] | undefined => {
  const list = (Array.isArray(value) ? value : [value]).filter(
    (item): item is string => typeof item === "string",
  );
  return list.length === 0 ? undefined : list;
};

// Boards run the variant grid and the class rules, `--naming` the descriptions.
const FLAG_NEEDS = [
  ["recipes", "boards"],
  ["preset", "boards"],
  ["config", "boards"],
  ["usage", "naming"],
] as const;

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
  for (const key of [
    "stamp",
    "standard",
    "recipes",
    "usage",
    "preset",
    "config",
  ])
    if (str(key) === "") return `--${key} must not be empty`;
  // A flag that feeds a rule needs the switch that runs it, or it would never run.
  for (const [key, needs] of FLAG_NEEDS)
    if (str(key) !== undefined && values[needs] !== true)
      return `--${key} needs --${needs}`;
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
    usage: str("usage"),
    preset: str("preset"),
    config: str("config"),
    noRule: strings(values["no-rule"]),
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

// Runs the check (or the inventory) and prints the result: 0 ok or findings only, 1 errors.
async function runCheck(args: CanvasArgs, cwd: string): Promise<number> {
  const canvasDir = resolve(cwd, args.canvas);
  if (args.inventory || args.theme === undefined) {
    logger.log(
      JSON.stringify(inventoryCanvas(canvasDir, args.canvas), null, 2),
    );
    return 0;
  }
  const result = await checkCanvas({
    ...args,
    canvasDir: args.canvas,
    theme: args.theme,
    cwd,
    onNotice: (line) => {
      logger.log(line);
    },
  });
  const files = canvasFiles(canvasDir, args.canvas);
  const errors = [...result.errors];
  if (args.boards && !files.some((f) => f.endsWith(".dc.html")))
    errors.push(`canvas.json:1 no .dc.html files under ${args.canvas}`);
  for (const line of [...errors, ...result.findings]) logger.log(oneLine(line));
  if (result.disabled.length > 0)
    logger.log(`rules disabled: ${result.disabled.join(", ")}`);
  if (errors.length > 0) {
    logger.log(`${String(errors.length)} violation(s)`);
    return 1;
  }
  if (result.findings.length > 0) {
    logger.log(
      `FINDINGS: ${String(result.findings.length)} in ${String(files.length)} files`,
    );
    return 0;
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
export async function canvasCheckCommand(
  values: FlagValues,
  cwd: string,
): Promise<number> {
  const args = parseCanvasArgs(values);
  if (typeof args === "string") {
    logger.error(oneLine(args));
    return 2;
  }
  try {
    return await runCheck(args, cwd);
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
