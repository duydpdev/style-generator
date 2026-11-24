/**
 * Reading a canvas: the directory walk, input errors (exit code 2), the
 * per-file scan every rule reads and the `--inventory` summary.
 */
import type { Buffer } from "node:buffer";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { errorMessage } from "../../../node/errorMessage";

import {
  ANY_LITERAL,
  BINDING,
  blockValue,
  boundLiterals,
  declarationContext,
  lineIndex,
  PX_LITERAL,
  styleAttributes,
  type LineOf,
} from "./parseHtml";

/**
 * UTF-16 code-unit order, the order of `Array#sort()` without a comparator:
 * reports and the inventory list files the same way on every locale.
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} Negative, zero or positive
 */
const byCodeUnit = (a: string, b: string): number =>
  Number(a > b) - Number(a < b);

/** An input the command cannot read or parse; `style-gen canvas check` exits 2 with its message. */
export class CanvasInputError extends Error {
  override name = "CanvasInputError";
}

/**
 * The reason of a failed read: the errno code when there is one.
 * @param {unknown} error - What `readFileSync`/`readdirSync` threw
 * @returns {string} `ENOENT`, `EISDIR`, … or the error message
 */
const readReason = (error: unknown): string => {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" ? code : errorMessage(error);
};

/**
 * The bytes of an input file.
 * @param {string} file - Path to read
 * @param {string} label - The path as the user wrote it, for messages
 * @returns {Buffer} Its contents
 * @throws {CanvasInputError} `<label>: cannot read (<reason>)`
 */
export function readInput(file: string, label = file): Buffer {
  try {
    return readFileSync(file);
  } catch (error) {
    throw new CanvasInputError(`${label}: cannot read (${readReason(error)})`);
  }
}

/**
 * @param {string} file - Path to read
 * @param {string} label - The path as the user wrote it, for messages
 * @returns {string} Its contents as UTF-8
 */
export const readText = (file: string, label = file): string =>
  readInput(file, label).toString("utf8");

/**
 * Parses JSON read from an input.
 * @param {string} text - JSON source
 * @param {string} label - The path it came from, for messages
 * @returns {unknown} The parsed value
 * @throws {CanvasInputError} `<label>: cannot parse (<reason>)`
 */
export function parseJson(text: string, label: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new CanvasInputError(
      `${label}: cannot parse (${errorMessage(error)})`,
    );
  }
}

/**
 * @param {string} file - JSON file
 * @param {string} label - The path as the user wrote it, for messages
 * @returns {unknown} The parsed value
 */
export const readJson = (file: string, label = file): unknown =>
  parseJson(readText(file, label), label);

export interface FontSize {
  file: string;
  line: number;
  value: string;
  kind: "px" | "binding" | "other";
  literals: string[];
  weight: string | null;
  lineHeight: string | null;
  family: string | null;
  text: string | null;
}

export interface Located {
  file: string;
  line: number;
  value: string;
}

export interface Inventory {
  files: number;
  vars: Record<string, number>;
  varText: Record<string, number>;
  sgVars: Record<string, number>;
  blClasses: Record<string, number>;
  blobLinks: Record<string, number>;
  blobRefs: Record<string, number>;
  fontSizes: FontSize[];
  dsGlobals: Record<string, number>;
  dsPaths: string[];
  fontShorthands: Located[];
  fontWeights: Located[];
  handValues: HandValue[];
  intents: Located[];
}

export type HandValue = Located & { property: string };

export interface Occurrence {
  file: string;
  line: number;
  kind: "var" | "varText" | "sgVar" | "blobLink" | "blobRef";
  value: string;
}

export interface ScannedFile {
  file: string;
  occurrences: Occurrence[];
  blClasses: string[];
  fontSizes: FontSize[];
  fontShorthands: Located[];
  fontWeights: Located[];
  handValues: HandValue[];
  dsGlobals: string[];
  dsPaths: string[];
  intents: Located[];
}

/** Files a design-system producer writes; they declare the theme's own aliases. */
const PRODUCER_FILES = [
  /(?:^|\/)ds\/[^/]+\/tokens\.css$/,
  /(?:^|\/)ds\/[^/]+\/components\/bundle\.css$/,
];

/**
 * Every scanned file under `dir`, as sorted POSIX paths relative to `dir`.
 * @param {string} dir - Canvas directory
 * @returns {string[]} Sorted paths
 */
export function canvasFiles(dir: string): string[] {
  const out: string[] = [];
  /** @param {string} at - Directory to read */
  const walk = (at: string) => {
    let entries;
    try {
      entries = readdirSync(at, { withFileTypes: true });
    } catch (error) {
      throw new CanvasInputError(`${at}: cannot read (${readReason(error)})`);
    }
    for (const entry of entries) {
      const full = join(at, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules") walk(full);
        continue;
      }
      if (!/\.(?:dc\.html|css)$/.test(entry.name)) continue;
      const rel = relative(dir, full).split(sep).join("/");
      if (PRODUCER_FILES.some((re) => re.test(rel))) continue;
      out.push(rel);
    }
  };
  walk(dir);
  return out.sort(byCodeUnit);
}

/**
 * Custom properties read (`var(--x)`) or declared (`--x:`), then any other
 * `--bl-` text.
 * @param {string} file - Path relative to the canvas dir (POSIX)
 * @param {string} text - File contents
 * @param {LineOf} lineOf - Index to line
 * @returns {Occurrence[]} In that order
 */
function collectVars(file: string, text: string, lineOf: LineOf): Occurrence[] {
  const out: Occurrence[] = [];
  const varStarts = new Set<number>();
  for (const m of text.matchAll(/var\(\s*(--[A-Za-z_][\w-]*)/g)) {
    const name = m[1] ?? "";
    const at = m.index + m[0].indexOf(name);
    varStarts.add(at);
    const kind = name.startsWith("--sg-") ? "sgVar" : "var";
    out.push({ file, line: lineOf(at), kind, value: name });
  }
  for (const m of text.matchAll(/(?<![\w-])(--[A-Za-z_][\w-]*)\s*:/g)) {
    const name = m[1] ?? "";
    if (name.startsWith("--sg-") || varStarts.has(m.index)) continue;
    varStarts.add(m.index);
    out.push({ file, line: lineOf(m.index), kind: "var", value: name });
  }
  for (const m of text.matchAll(/(?<![\w-])--bl-[^\s"'<>;,)]*/g)) {
    if (varStarts.has(m.index)) continue;
    const value = text.slice(m.index, m.index + 30).split("\n")[0] ?? "";
    out.push({ file, line: lineOf(m.index), kind: "varText", value });
  }
  return out;
}

/**
 * `/_blob/` stylesheets, then every other `/_blob/` link.
 * @param {string} file - Path relative to the canvas dir (POSIX)
 * @param {string} text - File contents
 * @param {LineOf} lineOf - Index to line
 * @returns {Occurrence[]} In that order
 */
function collectBlobs(
  file: string,
  text: string,
  lineOf: LineOf,
): Occurrence[] {
  const out: Occurrence[] = [];
  const stylesheetHrefs = new Set<number>();
  for (const tag of text.matchAll(/<link\b[^>]*>/gi)) {
    const rel = /\brel\s*=\s*["']([^"']*)["']/i.exec(tag[0]);
    const href = /\bhref\s*=\s*["']\/_blob\/([\w-]+)["']/i.exec(tag[0]);
    if (!rel || !href || !/\bstylesheet\b/i.test(rel[1] ?? "")) continue;
    const at = tag.index + href.index;
    stylesheetHrefs.add(at);
    out.push({
      file,
      line: lineOf(at),
      kind: "blobLink",
      value: href[1] ?? "",
    });
  }
  for (const m of text.matchAll(/\bhref\s*=\s*["']\/_blob\/([\w-]+)["']/gi)) {
    if (stylesheetHrefs.has(m.index)) continue;
    out.push({
      file,
      line: lineOf(m.index),
      kind: "blobRef",
      value: m[1] ?? "",
    });
  }
  return out;
}

/**
 * `bl-*` class names, one entry per use: in `class="…"`, and in string
 * literals of `<script>` blocks, which bind a class at runtime
 * (`frost: sc ? 'bl-frost' : ''`).
 * @param {string} text - File contents
 * @returns {string[]} Class names
 */
function collectBlClasses(text: string): string[] {
  const attributes = [...text.matchAll(/\bclass\s*=\s*(["'])([^"']*)\1/g)];
  const scripts = [...text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
  // Only a literal that is nothing but class names counts: a CSS code sample
  // in a string (`'.bl-x { animation: bl-pulse 1s }'`) is content.
  const classLists = scripts
    .flatMap((s) => [...(s[1] ?? "").matchAll(ANY_LITERAL)])
    .map((m) => m[1] ?? "")
    .filter((value) => /^[\w\s-]*$/.test(value));
  return [...attributes.map((m) => m[2] ?? ""), ...classLists].flatMap(
    (value) => value.split(/\s+/).filter((name) => /^bl-[\w-]+$/.test(name)),
  );
}

/**
 * @param {string} value - Declared `font-size` value
 * @param {boolean} isBinding - Whether the value is a `{{name}}` binding
 * @returns {FontSize["kind"]} The value's kind
 */
function fontSizeKind(value: string, isBinding: boolean): FontSize["kind"] {
  if (isBinding) return "binding";
  return /^(?:\d+(?:\.\d+)?|\.\d+)px$/.test(value) ? "px" : "other";
}

/**
 * Every `font-size:` declaration.
 * @param {string} file - Path relative to the canvas dir (POSIX)
 * @param {string} text - File contents
 * @param {LineOf} lineOf - Index to line
 * @returns {FontSize[]} In document order
 */
function collectFontSizes(
  file: string,
  text: string,
  lineOf: LineOf,
): FontSize[] {
  const styleAttrs = styleAttributes(text);
  const declarations = text.matchAll(
    /(?<![\w-])font-size\s*:\s*(\{\{[^}]*\}\}|[^;"'}<>\n]+)/g,
  );
  return [...declarations].map((m) => {
    const value = (m[1] ?? "").trim();
    const name = BINDING.exec(value)?.[1];
    const context = declarationContext(text, styleAttrs, m.index);
    return {
      file,
      line: lineOf(m.index),
      value,
      kind: fontSizeKind(value, name !== undefined),
      literals: name === undefined ? [] : boundLiterals(text, name, PX_LITERAL),
      weight: blockValue(context.block, "font-weight"),
      lineHeight: blockValue(context.block, "line-height"),
      family: blockValue(context.block, "font-family"),
      text: context.text,
    };
  });
}

/**
 * Every `font-weight:` declaration.
 * @param {string} file - Path relative to the canvas dir (POSIX)
 * @param {string} text - File contents
 * @param {LineOf} lineOf - Index to line
 * @returns {Located[]} In document order
 */
function collectFontWeights(
  file: string,
  text: string,
  lineOf: LineOf,
): Located[] {
  const declarations = text.matchAll(
    /(?<![\w-])font-weight\s*:\s*(\{\{[^}]*\}\}|[^;"'}<>\n]+)/g,
  );
  return [...declarations].map((m) => ({
    file,
    line: lineOf(m.index),
    value: (m[1] ?? "").trim(),
  }));
}

/**
 * Every `border-radius` (and `border-*-radius`), `line-height` and
 * `font-family` declaration. A value runs to `;` or the end of its `style`
 * attribute, so a quoted family (`'Geist', sans-serif`) is read whole;
 * outside an attribute it runs to `;`, `}`, `<` or the end of the line.
 * @param {string} file - Path relative to the canvas dir (POSIX)
 * @param {string} text - File contents
 * @param {LineOf} lineOf - Index to line
 * @returns {HandValue[]} In document order
 */
function collectHandValues(
  file: string,
  text: string,
  lineOf: LineOf,
): HandValue[] {
  const styleAttrs = styleAttributes(text);
  const out: HandValue[] = [];
  for (const m of text.matchAll(
    /(?<![\w-])(border(?:-[a-z]+){0,2}-radius|line-height|font-family)\s*:\s*/g,
  )) {
    const start = m.index + m[0].length;
    const binding = /^\{\{[^}]*\}\}/.exec(text.slice(start));
    const attr = styleAttrs.find((a) => start >= a.start && start < a.end);
    const rest = text.slice(start, attr ? attr.end : text.length);
    const until = attr ? /^[^;]*/ : /^[^;}<\n]*/;
    const value = binding ? binding[0] : (until.exec(rest)?.[0] ?? "");
    out.push({
      file,
      line: lineOf(m.index),
      value: value.trim(),
      property: m[1] ?? "",
    });
  }
  return out;
}

/**
 * Every `*.Button` `color`, a binding expanded to the literals assigned to it.
 * @param {string} file - Path relative to the canvas dir (POSIX)
 * @param {string} text - File contents
 * @param {LineOf} lineOf - Index to line
 * @returns {Located[]} In document order
 */
function collectIntents(file: string, text: string, lineOf: LineOf): Located[] {
  const out: Located[] = [];
  for (const tag of text.matchAll(/<[\w-]+\b[^>]*>/g)) {
    if (!/component-from-global-scope\s*=\s*"[^"]*\.Button"/.test(tag[0]))
      continue;
    const color = /\bcolor\s*=\s*"([^"]*)"/.exec(tag[0]);
    if (!color) continue;
    const line = lineOf(tag.index + color.index);
    const value = color[1] ?? "";
    const name = BINDING.exec(value.trim())?.[1];
    const values =
      name === undefined ? [value] : boundLiterals(text, name, ANY_LITERAL);
    for (const v of values) out.push({ file, line, value: v });
  }
  return out;
}

/**
 * Scans one file's text.
 * @param {string} file - Path relative to the canvas dir (POSIX)
 * @param {string} text - File contents
 * @returns {ScannedFile} Everything the checks and the inventory read
 */
export function scanText(file: string, text: string): ScannedFile {
  const lineOf = lineIndex(text);
  return {
    file,
    occurrences: [
      ...collectVars(file, text, lineOf),
      ...collectBlobs(file, text, lineOf),
    ],
    blClasses: collectBlClasses(text),
    fontSizes: collectFontSizes(file, text, lineOf),
    fontShorthands: [
      ...text.matchAll(/(?<![\w-])font\s*:\s*([^;"'}<>\n]+)/g),
    ].map((m) => ({
      file,
      line: lineOf(m.index),
      value: (m[1] ?? "").trim(),
    })),
    fontWeights: collectFontWeights(file, text, lineOf),
    handValues: collectHandValues(file, text, lineOf),
    dsGlobals: [
      ...text.matchAll(/component-from-global-scope\s*=\s*"([^"]*)"/g),
    ].map((m) => m[1] ?? ""),
    dsPaths: [...text.matchAll(/(?<![\w-])ds\/[^"' )]+/g)].map((m) => m[0]),
    intents: collectIntents(file, text, lineOf),
  };
}

/**
 * @param {string} canvasDir - Canvas directory
 * @returns {ScannedFile[]} One entry per scanned file
 */
export function scanCanvas(canvasDir: string): ScannedFile[] {
  return canvasFiles(canvasDir).map((file) =>
    scanText(file, readText(join(canvasDir, file))),
  );
}

/**
 * @param {Record<string, number>} counts - Counter to update
 * @param {string} key - Key to count once more
 */
function bump(counts: Record<string, number>, key: string) {
  counts[key] = (counts[key] ?? 0) + 1;
}

/** Occurrence kind → the inventory counter it feeds. */
const OCCURRENCE_COUNTER = {
  var: "vars",
  sgVar: "sgVars",
  varText: "varText",
  blobLink: "blobLinks",
  blobRef: "blobRefs",
} as const;

/**
 * What a canvas uses: variables, classes, blob links, font declarations,
 * design-system mounts and button intents.
 * @param {string} canvasDir - Canvas directory
 * @returns {Inventory} Counts and declarations over every scanned file
 */
export function inventoryCanvas(canvasDir: string): Inventory {
  const scanned = scanCanvas(canvasDir);
  const inv: Inventory = {
    files: scanned.length,
    vars: {},
    varText: {},
    sgVars: {},
    blClasses: {},
    blobLinks: {},
    blobRefs: {},
    fontSizes: [],
    dsGlobals: {},
    dsPaths: [],
    fontShorthands: [],
    fontWeights: [],
    handValues: [],
    intents: [],
  };
  const dsPaths = new Set<string>();
  for (const s of scanned) {
    for (const o of s.occurrences)
      bump(
        inv[OCCURRENCE_COUNTER[o.kind]],
        o.kind === "varText" ? o.file : o.value,
      );
    for (const c of s.blClasses) bump(inv.blClasses, c);
    for (const g of s.dsGlobals) bump(inv.dsGlobals, g);
    for (const p of s.dsPaths) dsPaths.add(p);
    inv.fontSizes.push(...s.fontSizes);
    inv.fontShorthands.push(...s.fontShorthands);
    inv.fontWeights.push(...s.fontWeights);
    inv.handValues.push(...s.handValues);
    inv.intents.push(...s.intents);
  }
  inv.dsPaths = [...dsPaths].sort(byCodeUnit);
  return inv;
}
